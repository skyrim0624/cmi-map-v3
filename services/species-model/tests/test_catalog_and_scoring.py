from __future__ import annotations

import unittest

from cmi_species_model.catalog import coarse_candidate_groups, load_species_catalog, select_species_pool
from cmi_species_model.app import (
    build_broad_plant_response,
    looks_like_leaf_dominant_photo,
    should_return_broad_plant,
    visual_adjustment,
)
from cmi_species_model.scoring import ModelPrediction, choose_species_decision


class SpeciesCatalogTest(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = load_species_catalog()

    def find_candidate(self, scientific_name: str):
        return next(candidate for candidate in self.catalog if candidate.scientific_name == scientific_name)

    def test_catalog_contains_black_capped_kingfisher_chinese_name(self) -> None:
        candidate = self.find_candidate("Halcyon pileata")

        self.assertEqual(candidate.common_name_zh, "蓝翡翠")
        self.assertIn("bird", candidate.groups)

    def test_bird_coarse_candidate_narrows_pool(self) -> None:
        pool = select_species_pool(
            self.catalog,
            [{"nameZh": "鸟类", "nameEn": "Bird", "scientificName": "Aves", "taxonRank": "CLASS"}],
        )

        scientific_names = {candidate.scientific_name for candidate in pool}
        self.assertIn("Halcyon pileata", scientific_names)
        self.assertNotIn("Canis lupus familiaris", scientific_names)

    def test_plant_coarse_candidate_narrows_pool(self) -> None:
        pool = select_species_pool(
            self.catalog,
            [{"nameZh": "植物", "nameEn": "Plant", "scientificName": "Plantae", "taxonRank": "KINGDOM", "score": 0.8}],
        )

        scientific_names = {candidate.scientific_name for candidate in pool}
        self.assertIn("Bougainvillea spectabilis", scientific_names)
        self.assertIn("Plumeria rubra", scientific_names)
        self.assertNotIn("Canis lupus familiaris", scientific_names)

    def test_weak_coarse_candidate_does_not_lock_out_plants(self) -> None:
        pool = select_species_pool(
            self.catalog,
            [{"nameZh": "昆虫", "nameEn": "Insect", "scientificName": "Insecta", "taxonRank": "CLASS", "score": 0.41}],
        )

        scientific_names = {candidate.scientific_name for candidate in pool}
        self.assertIn("Bougainvillea spectabilis", scientific_names)
        self.assertIn("Canis lupus familiaris", scientific_names)

    def test_coarse_candidate_groups_accept_scientific_taxon(self) -> None:
        groups = coarse_candidate_groups([{"scientificName": "Serpentes", "nameEn": "Snake"}])

        self.assertIn("snake", groups)
        self.assertIn("reptile", groups)

    def test_coarse_candidate_groups_accept_plant_taxon(self) -> None:
        groups = coarse_candidate_groups([{"scientificName": "Orchidaceae", "nameEn": "Orchid"}])

        self.assertIn("plant", groups)
        self.assertIn("orchid", groups)


class SpeciesScoringTest(unittest.TestCase):
    def setUp(self) -> None:
        catalog = load_species_catalog()
        self.kingfisher = next(candidate for candidate in catalog if candidate.scientific_name == "Halcyon pileata")
        self.cat = next(candidate for candidate in catalog if candidate.scientific_name == "Felis catus")

    def test_accepts_high_confidence_agreed_species(self) -> None:
        primary = ModelPrediction("bioclip-2.5", self.kingfisher, probability=0.86, margin=0.22)
        fallback = ModelPrediction("bioclip-2", self.kingfisher, probability=0.81, margin=0.18)

        decision = choose_species_decision(primary, fallback, min_confidence=0.68, min_margin=0.06)

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.candidate, self.kingfisher)
        self.assertGreaterEqual(decision.confidence, 0.68)

    def test_rejects_small_margin_disagreement(self) -> None:
        primary = ModelPrediction("bioclip-2.5", self.kingfisher, probability=0.74, margin=0.04)
        fallback = ModelPrediction("bioclip-2", self.cat, probability=0.70, margin=0.08)

        decision = choose_species_decision(primary, fallback, min_confidence=0.68, min_margin=0.06)

        self.assertFalse(decision.accepted)
        self.assertLess(decision.confidence, 0.68)

    def test_blue_bird_rerank_boosts_kingfisher_not_myna(self) -> None:
        myna = next(candidate for candidate in load_species_catalog() if candidate.scientific_name == "Acridotheres tristis")
        signals = {
            "blueRatio": 0.023,
            "blueSaturatedRatio": 0.028,
            "maxBlueTileRatio": 0.63,
        }

        kingfisher_adjustment = visual_adjustment(
            ModelPrediction("bioclip-2.5", self.kingfisher, probability=0.24, margin=0.01),
            signals,
        )
        myna_adjustment = visual_adjustment(
            ModelPrediction("bioclip-2.5", myna, probability=0.70, margin=0.01),
            signals,
        )

        self.assertGreater(kingfisher_adjustment, 0.5)
        self.assertLess(myna_adjustment, 0)

    def test_green_leaf_dominant_photo_triggers_plant_guard(self) -> None:
        signals = {
            "greenRatio": 0.31,
            "greenSaturatedRatio": 0.58,
            "maxGreenTileRatio": 0.81,
        }

        self.assertTrue(looks_like_leaf_dominant_photo(signals))

    def test_leaf_only_plant_result_stays_broad_when_species_confidence_is_weak(self) -> None:
        banana = next(candidate for candidate in load_species_catalog() if candidate.scientific_name == "Musa acuminata")
        primary = ModelPrediction("bioclip-2.5", banana, probability=0.90, margin=0.08)
        decision = choose_species_decision(primary, None, min_confidence=0.68, min_margin=0.06)

        self.assertTrue(decision.accepted)
        self.assertTrue(should_return_broad_plant(decision, plant_guard_enabled=True))

        response = build_broad_plant_response(decision.confidence, decision.provider, 22)
        self.assertEqual(response["commonNameZh"], "植物")
        self.assertEqual(response["scientificName"], "Plantae")
        self.assertEqual(response["taxonRank"], "KINGDOM")
        self.assertFalse(response["animalPresent"])


if __name__ == "__main__":
    unittest.main()
