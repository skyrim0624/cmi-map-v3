from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_CATALOG_PATH = Path(__file__).resolve().parents[1] / "catalog" / "chiang-mai-animals.json"

COARSE_TAXON_GROUPS: dict[str, set[str]] = {
    "aves": {"bird"},
    "bird": {"bird"},
    "birds": {"bird"},
    "insecta": {"insect", "butterfly", "dragonfly"},
    "insect": {"insect", "butterfly", "dragonfly"},
    "lepidoptera": {"butterfly"},
    "butterfly": {"butterfly"},
    "odonata": {"dragonfly"},
    "dragonfly": {"dragonfly"},
    "arachnida": {"spider"},
    "spider": {"spider"},
    "reptilia": {"reptile", "snake", "gecko", "lizard"},
    "reptile": {"reptile", "snake", "gecko", "lizard"},
    "serpentes": {"snake", "reptile"},
    "snake": {"snake"},
    "squamata": {"reptile", "snake", "gecko", "lizard"},
    "lizard": {"lizard", "gecko", "reptile"},
    "gecko": {"gecko", "lizard", "reptile"},
    "amphibia": {"amphibian", "frog"},
    "anura": {"amphibian", "frog"},
    "frog": {"amphibian", "frog"},
    "toad": {"amphibian", "frog"},
    "actinopterygii": {"fish"},
    "fish": {"fish"},
    "mammalia": {"mammal", "dog", "cat"},
    "mammal": {"mammal", "dog", "cat"},
    "canis lupus familiaris": {"dog", "mammal"},
    "dog": {"dog", "mammal"},
    "felis catus": {"cat", "mammal"},
    "cat": {"cat", "mammal"},
}


@dataclass(frozen=True)
class SpeciesCandidate:
    scientific_name: str
    common_name_zh: str
    common_name_en: str
    taxon_rank: str
    groups: tuple[str, ...]
    priority: int
    aliases: tuple[str, ...]

    @property
    def prompt(self) -> str:
        names = [self.common_name_en, self.scientific_name, *self.aliases[:3]]
        unique_names = list(dict.fromkeys(name for name in names if name))
        return f"a clear field photo of {', '.join(unique_names)}"

    def to_response(self, confidence: float) -> dict[str, Any]:
        return {
            "animalPresent": True,
            "commonNameZh": self.common_name_zh,
            "commonNameEn": self.common_name_en,
            "scientificName": self.scientific_name,
            "taxonRank": self.taxon_rank,
            "confidence": round(max(0.0, min(1.0, confidence)), 4),
        }


def normalize_token(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value.strip().lower())


def load_species_catalog(path: str | Path | None = None) -> list[SpeciesCandidate]:
    catalog_path = Path(path) if path else DEFAULT_CATALOG_PATH
    payload = json.loads(catalog_path.read_text(encoding="utf-8"))
    candidates: list[SpeciesCandidate] = []
    for item in payload:
        candidates.append(
            SpeciesCandidate(
                scientific_name=str(item["scientificName"]).strip(),
                common_name_zh=str(item["commonNameZh"]).strip(),
                common_name_en=str(item["commonNameEn"]).strip(),
                taxon_rank=str(item.get("taxonRank") or "SPECIES").strip().upper(),
                groups=tuple(str(group).strip().lower() for group in item.get("groups", [])),
                priority=int(item.get("priority") or 0),
                aliases=tuple(str(alias).strip() for alias in item.get("aliases", [])),
            )
        )
    return sorted(candidates, key=lambda candidate: candidate.priority, reverse=True)


def coarse_candidate_groups(coarse_candidates: list[dict[str, Any]]) -> set[str]:
    groups: set[str] = set()
    for candidate in coarse_candidates:
        values = [
            candidate.get("scientificName"),
            candidate.get("nameEn"),
            candidate.get("nameZh"),
            candidate.get("id"),
        ]
        for value in values:
            normalized = normalize_token(value)
            if not normalized:
                continue
            groups.update(COARSE_TAXON_GROUPS.get(normalized, set()))
            for token, token_groups in COARSE_TAXON_GROUPS.items():
                if re.search(rf"(^|[^a-z]){re.escape(token)}([^a-z]|$)", normalized):
                    groups.update(token_groups)
    return groups


def select_species_pool(
    catalog: list[SpeciesCandidate],
    coarse_candidates: list[dict[str, Any]] | None,
    *,
    max_candidates: int = 180,
    min_group_candidates: int = 8,
) -> list[SpeciesCandidate]:
    if not coarse_candidates:
        return catalog[:max_candidates]

    groups = coarse_candidate_groups(coarse_candidates)
    if not groups:
        return catalog[:max_candidates]

    narrowed = [
        candidate
        for candidate in catalog
        if groups.intersection(candidate.groups)
    ]

    # NOTE: 粗识别可能把小动物大类判错；候选过少时回到全库，避免模型被错误大类锁死。
    if len(narrowed) < min_group_candidates:
        return catalog[:max_candidates]

    return narrowed[:max_candidates]
