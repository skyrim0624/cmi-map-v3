from __future__ import annotations

import json
import os
from dataclasses import replace
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .bioclip import BioClipModel, BioClipSettings
from .catalog import load_species_catalog, select_species_pool
from .scoring import ModelPrediction, choose_species_decision


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
DEBUG_TOPK = os.getenv("SPECIES_DEBUG_TOPK", "0") == "1"

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


def image_color_signals(image: Image.Image) -> dict[str, float]:
    sample = image.resize((160, 80))
    pixels = list(sample.getdata())
    blue_pixels = 0
    saturated_pixels = 0
    for red, green, blue in pixels:
        if max(red, green, blue) < 70 or max(red, green, blue) - min(red, green, blue) < 35:
            continue
        saturated_pixels += 1
        if blue > red * 1.25 and green > red * 1.05 and max(blue, green) > 100:
            blue_pixels += 1

    max_blue_tile = 0.0
    for top in range(0, sample.height, 16):
        for left in range(0, sample.width, 16):
            tile_blue_pixels = 0
            tile_saturated_pixels = 0
            for y in range(top, min(top + 16, sample.height)):
                for x in range(left, min(left + 16, sample.width)):
                    red, green, blue = sample.getpixel((x, y))
                    if max(red, green, blue) < 70 or max(red, green, blue) - min(red, green, blue) < 35:
                        continue
                    tile_saturated_pixels += 1
                    if blue > red * 1.25 and green > red * 1.05 and max(blue, green) > 100:
                        tile_blue_pixels += 1
            if tile_saturated_pixels:
                max_blue_tile = max(max_blue_tile, tile_blue_pixels / tile_saturated_pixels)

    return {
        "blueRatio": blue_pixels / max(1, len(pixels)),
        "blueSaturatedRatio": blue_pixels / max(1, saturated_pixels),
        "maxBlueTileRatio": max_blue_tile,
    }


def visual_adjustment(prediction: ModelPrediction, color_signals: dict[str, float]) -> float:
    candidate = prediction.candidate
    if "bird" not in candidate.groups:
        return 0.0

    has_blue_area = color_signals["blueRatio"] >= 0.018 or color_signals["maxBlueTileRatio"] >= 0.35
    if not has_blue_area:
        return 0.0

    descriptor = " ".join((
        candidate.common_name_en,
        candidate.scientific_name,
        " ".join(candidate.aliases),
        " ".join(candidate.visual_hints),
    )).lower()
    if "kingfisher" in descriptor and prediction.probability >= 0.18:
        return 0.54 if color_signals["maxBlueTileRatio"] >= 0.5 else 0.30
    if "blue" in descriptor:
        return 0.22
    if any(token in descriptor for token in ["myna", "koel", "starling"]):
        return -0.18
    return 0.0


def apply_visual_adjustments(
    predictions: list[ModelPrediction],
    color_signals: dict[str, float],
) -> list[ModelPrediction]:
    adjusted: list[ModelPrediction] = []
    for prediction in predictions:
        adjusted_probability = max(0.0, min(0.99, prediction.probability + visual_adjustment(prediction, color_signals)))
        adjusted.append(replace(prediction, probability=adjusted_probability))

    ranked = sorted(adjusted, key=lambda prediction: prediction.probability, reverse=True)
    reranked: list[ModelPrediction] = []
    for index, prediction in enumerate(ranked):
        next_probability = ranked[index + 1].probability if index + 1 < len(ranked) else 0.0
        reranked.append(replace(prediction, margin=max(0.0, prediction.probability - next_probability)))
    return reranked


def serialize_prediction(prediction: Any) -> dict[str, Any]:
    return {
        "commonNameZh": prediction.candidate.common_name_zh,
        "commonNameEn": prediction.candidate.common_name_en,
        "scientificName": prediction.candidate.scientific_name,
        "probability": round(prediction.probability, 4),
        "margin": round(prediction.margin, 4),
    }


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

    color_signals = image_color_signals(pil_image)
    primary_predictions = primary_model.predict_top(
        pil_image,
        species_pool,
        top_k=8,
    )
    primary_predictions = apply_visual_adjustments(primary_predictions, color_signals)
    primary = primary_predictions[0] if primary_predictions else None
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
        response = {
            "organismPresent": False,
            "animalPresent": False,
            "commonNameZh": "",
            "commonNameEn": "",
            "scientificName": "",
            "taxonRank": "",
            "confidence": round(decision.confidence, 4),
            "provider": decision.provider,
            "candidatePoolSize": len(species_pool),
        }
        if DEBUG_TOPK:
            response["topPredictions"] = [serialize_prediction(prediction) for prediction in primary_predictions]
        return response

    assert decision.candidate is not None
    response = decision.candidate.to_response(decision.confidence)
    response.update({
        "provider": decision.provider,
        "candidatePoolSize": len(species_pool),
    })
    if DEBUG_TOPK:
        response["topPredictions"] = [serialize_prediction(prediction) for prediction in primary_predictions]
    return response
