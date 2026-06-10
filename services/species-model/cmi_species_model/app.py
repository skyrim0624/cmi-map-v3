from __future__ import annotations

import json
import os
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .bioclip import BioClipModel, BioClipSettings
from .catalog import load_species_catalog, select_species_pool
from .scoring import choose_species_decision


PRIMARY_MODEL_ID = "hf-hub:imageomics/bioclip-2.5-vith14"
FALLBACK_MODEL_ID = "hf-hub:imageomics/bioclip-2"
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


SERVICE_TOKEN = os.getenv("SPECIES_MODEL_TOKEN") or os.getenv("CMI_MAP_SPECIES_MODEL_TOKEN")
CATALOG_PATH = os.getenv("SPECIES_CATALOG_PATH")
DEVICE = os.getenv("BIOCLIP_DEVICE", "auto")
PRIMARY_MODEL = os.getenv("BIOCLIP_PRIMARY_MODEL", PRIMARY_MODEL_ID)
FALLBACK_MODEL = os.getenv("BIOCLIP_FALLBACK_MODEL", FALLBACK_MODEL_ID)
FALLBACK_MODE = os.getenv("BIOCLIP_FALLBACK_MODE", "auto").lower()
MIN_CONFIDENCE = env_float("SPECIES_MIN_CONFIDENCE", 0.68)
MIN_MARGIN = env_float("SPECIES_MIN_MARGIN", 0.06)
MAX_CANDIDATES = env_int("SPECIES_MAX_CANDIDATES", 180)
PRELOAD_MODELS = os.getenv("BIOCLIP_PRELOAD", "0") == "1"

catalog = load_species_catalog(Path(CATALOG_PATH) if CATALOG_PATH else None)
primary_model = BioClipModel(BioClipSettings(PRIMARY_MODEL, DEVICE))
fallback_model = BioClipModel(BioClipSettings(FALLBACK_MODEL, DEVICE)) if FALLBACK_MODEL else None

app = FastAPI(title="CMI Map Species Model", version="1.0.0")


@app.on_event("startup")
def preload_models() -> None:
    if not PRELOAD_MODELS:
        return
    primary_model.load()
    if fallback_model and FALLBACK_MODE == "always":
        fallback_model.load()


def require_authorization(authorization: str | None) -> None:
    if not SERVICE_TOKEN:
        return
    expected = f"Bearer {SERVICE_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


def parse_coarse_candidates(value: str | None) -> list[dict[str, Any]]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, dict)]


def decode_image(payload: bytes) -> Image.Image:
    if len(payload) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="image too large")
    try:
        image = Image.open(BytesIO(payload))
        image.load()
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="invalid image") from error
    return image.convert("RGB")


def should_run_fallback(primary_probability: float, primary_margin: float) -> bool:
    if fallback_model is None or FALLBACK_MODE == "never":
        return False
    if FALLBACK_MODE == "always":
        return True
    return primary_probability < 0.78 or primary_margin < 0.12


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "catalogSize": len(catalog),
        "primaryModel": PRIMARY_MODEL,
        "fallbackModel": FALLBACK_MODEL,
        "primaryLoaded": primary_model.loaded,
        "fallbackLoaded": fallback_model.loaded if fallback_model else False,
    }


@app.post("/identify")
async def identify_species(
    image: UploadFile = File(...),
    coarseCandidates: str | None = Form(None),
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    require_authorization(authorization)

    image_bytes = await image.read()
    pil_image = decode_image(image_bytes)
    coarse_candidates = parse_coarse_candidates(coarseCandidates)
    species_pool = select_species_pool(
        catalog,
        coarse_candidates,
        max_candidates=MAX_CANDIDATES,
    )

    primary = primary_model.predict(pil_image, species_pool)
    fallback = None
    if primary and should_run_fallback(primary.probability, primary.margin) and fallback_model:
        fallback = fallback_model.predict(pil_image, species_pool)

    decision = choose_species_decision(
        primary,
        fallback,
        min_confidence=MIN_CONFIDENCE,
        min_margin=MIN_MARGIN,
    )
    if not decision.accepted:
        return {
            "animalPresent": False,
            "commonNameZh": "",
            "commonNameEn": "",
            "scientificName": "",
            "taxonRank": "",
            "confidence": round(decision.confidence, 4),
            "provider": decision.provider,
            "candidatePoolSize": len(species_pool),
        }

    assert decision.candidate is not None
    response = decision.candidate.to_response(decision.confidence)
    response.update({
        "provider": decision.provider,
        "candidatePoolSize": len(species_pool),
    })
    return response
