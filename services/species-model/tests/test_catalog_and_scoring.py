from __future__ import annotations

import unittest

from cmi_species_model.catalog import coarse_candidate_groups, load_species_catalog, select_species_pool
from cmi_species_model.app import visual_adjustment
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

    def test_coarse_candidate_groups_accept_scientific_taxon(self) -> None:
        groups = coarse_candidate_groups([{"scientificName": "Serpentes", "nameEn": "Snake"}])

        self.assertIn("snake", groups)
        self.assertIn("reptile", groups)


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


if __name__ == "__main__":
    unittest.main()
