from __future__ import annotations

from dataclasses import dataclass

from .catalog import SpeciesCandidate


@dataclass(frozen=True)
class ModelPrediction:
    model_id: str
    candidate: SpeciesCandidate
    probability: float
    margin: float


@dataclass(frozen=True)
class SpeciesDecision:
    candidate: SpeciesCandidate | None
    confidence: float
    provider: str
    primary: ModelPrediction | None
    fallback: ModelPrediction | None

    @property
    def accepted(self) -> bool:
        return self.candidate is not None


def calibrated_confidence(prediction: ModelPrediction, *, agrees_with_fallback: bool, has_fallback: bool) -> float:
    probability_score = prediction.probability * 0.72
    margin_score = min(max(prediction.margin, 0.0) * 2.5, 1.0) * 0.22
    agreement_score = 0.06 if agrees_with_fallback else 0.0
    disagreement_penalty = 0.16 if has_fallback and not agrees_with_fallback else 0.0
    return max(0.0, min(0.99, probability_score + margin_score + agreement_score - disagreement_penalty))


def choose_species_decision(
    primary: ModelPrediction | None,
    fallback: ModelPrediction | None,
    *,
    min_confidence: float,
    min_margin: float,
) -> SpeciesDecision:
    if primary is None and fallback is None:
        return SpeciesDecision(None, 0.0, "", primary, fallback)

    selected = primary or fallback
    assert selected is not None

    agrees = bool(
        primary
        and fallback
        and primary.candidate.scientific_name == fallback.candidate.scientific_name
    )
    has_fallback = fallback is not None
    confidence = calibrated_confidence(selected, agrees_with_fallback=agrees, has_fallback=has_fallback)
    provider = selected.model_id
    if fallback:
        provider = f"{provider}+{fallback.model_id}"

    if selected.margin < min_margin or confidence < min_confidence:
        return SpeciesDecision(None, confidence, provider, primary, fallback)

    return SpeciesDecision(selected.candidate, confidence, provider, primary, fallback)
