from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from PIL import Image

from .catalog import SpeciesCandidate
from .scoring import ModelPrediction


@dataclass(frozen=True)
class BioClipSettings:
    model_id: str
    device: str = "auto"


class BioClipModel:
    def __init__(self, settings: BioClipSettings) -> None:
        self.settings = settings
        self._model: Any | None = None
        self._preprocess: Any | None = None
        self._tokenizer: Any | None = None
        self._torch: Any | None = None
        self._device = "cpu"
        self._text_cache: dict[tuple[str, ...], Any] = {}

    @property
    def loaded(self) -> bool:
        return self._model is not None

    @property
    def model_id(self) -> str:
        return self.settings.model_id

    @property
    def device(self) -> str:
        return self._device

    def load(self) -> None:
        if self.loaded:
            return

        import open_clip
        import torch

        self._torch = torch
        self._device = self._resolve_device(torch)
        model, _, preprocess_val = open_clip.create_model_and_transforms(self.settings.model_id)
        model.to(self._device)
        model.eval()

        self._model = model
        self._preprocess = preprocess_val
        self._tokenizer = open_clip.get_tokenizer(self.settings.model_id)

    def _resolve_device(self, torch: Any) -> str:
        if self.settings.device != "auto":
            return self.settings.device
        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def predict(self, image: Image.Image, candidates: list[SpeciesCandidate]) -> ModelPrediction | None:
        if not candidates:
            return None
        self.load()
        assert self._model is not None
        assert self._preprocess is not None
        assert self._torch is not None

        prompts = tuple(candidate.prompt for candidate in candidates)
        text_features = self._text_features(prompts)

        image_tensor = self._preprocess(image).unsqueeze(0).to(self._device)
        with self._torch.inference_mode():
            image_features = self._model.encode_image(image_tensor)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            logit_scale = getattr(self._model, "logit_scale", None)
            scale = logit_scale.exp() if logit_scale is not None else 100.0
            logits = scale * image_features @ text_features.T
            probabilities = logits.softmax(dim=-1)[0].detach().cpu().tolist()

        ranked = sorted(enumerate(probabilities), key=lambda item: item[1], reverse=True)
        top_index, top_probability = ranked[0]
        second_probability = ranked[1][1] if len(ranked) > 1 else 0.0
        return ModelPrediction(
            model_id=self.settings.model_id,
            candidate=candidates[top_index],
            probability=float(top_probability),
            margin=float(top_probability - second_probability),
        )

    def _text_features(self, prompts: tuple[str, ...]) -> Any:
        cached = self._text_cache.get(prompts)
        if cached is not None:
            return cached

        assert self._model is not None
        assert self._tokenizer is not None
        assert self._torch is not None

        tokens = self._tokenizer(list(prompts)).to(self._device)
        with self._torch.inference_mode():
            text_features = self._model.encode_text(tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        self._text_cache[prompts] = text_features
        return text_features
