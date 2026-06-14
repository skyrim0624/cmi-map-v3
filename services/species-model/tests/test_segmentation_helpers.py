from __future__ import annotations

import unittest

from PIL import Image

from cmi_species_model.app import expand_subject_crop, parse_subject_box, resize_for_segmentation


class SegmentationHelpersTest(unittest.TestCase):
    def test_parse_subject_box_accepts_normalized_json(self) -> None:
        box = parse_subject_box('{"x":300,"y":400,"width":200,"height":150}')

        self.assertEqual(box, {"x": 300.0, "y": 400.0, "width": 200.0, "height": 150.0})

    def test_parse_subject_box_rejects_invalid_values(self) -> None:
        self.assertIsNone(parse_subject_box('{"x":10,"y":10,"width":4,"height":100}'))
        self.assertIsNone(parse_subject_box("not-json"))

    def test_expand_subject_crop_keeps_focus_inside_image(self) -> None:
        image = Image.new("RGB", (1000, 800), "white")

        crop = expand_subject_crop(image, {"x":620, "y":640, "width":320, "height":300})

        self.assertEqual(crop[2], 1000)
        self.assertEqual(crop[3], 800)
        self.assertLess(crop[0], 620)
        self.assertLess(crop[1], 640)

    def test_resize_for_segmentation_caps_large_images(self) -> None:
        image = Image.new("RGB", (1800, 1200), "white")

        resized = resize_for_segmentation(image)

        self.assertLessEqual(max(resized.size), 896)
        self.assertEqual(round(resized.width / resized.height, 2), 1.5)


if __name__ == "__main__":
    unittest.main()
