from __future__ import annotations

import math
import unittest

from tools.blender_agent.comparison_alignment import (
    ComparisonAlignmentError,
    anchors_alignment,
    apply_alignment,
    auto_alignment_from_bbox,
    manual_alignment,
    parse_anchor,
)


class ComparisonAlignmentTests(unittest.TestCase):
    def test_manual_transform_is_reproducible(self) -> None:
        points = [(10.0, 10.0), (20.0, 10.0), (20.0, 20.0), (10.0, 20.0)]
        alignment = manual_alignment(
            points,
            scale=2.0,
            offset_x=5.0,
            offset_y=-3.0,
            rotate_deg=90.0,
        )
        first = apply_alignment(points, alignment)
        second = apply_alignment(points, alignment)
        self.assertEqual(first, second)
        self.assertAlmostEqual(alignment["pivot"][0], 15.0)
        self.assertAlmostEqual(alignment["pivot"][1], 15.0)

    def test_two_anchors_solve_similarity(self) -> None:
        # Source segment (0,0)->(10,0), destination is scale 2 + 90deg + translation (5,7).
        alignment = anchors_alignment([
            (0.0, 0.0, 5.0, 7.0),
            (10.0, 0.0, 5.0, 27.0),
        ])
        self.assertAlmostEqual(alignment["scale"], 2.0, places=6)
        self.assertAlmostEqual(alignment["rotate_deg"], 90.0, places=6)
        transformed = apply_alignment([(0.0, 0.0), (10.0, 0.0)], alignment)
        self.assertAlmostEqual(transformed[0][0], 5.0, places=6)
        self.assertAlmostEqual(transformed[0][1], 7.0, places=6)
        self.assertAlmostEqual(transformed[1][0], 5.0, places=6)
        self.assertAlmostEqual(transformed[1][1], 27.0, places=6)
        self.assertLess(alignment["uncertainty"]["max_residual_px"], 1e-6)

    def test_duplicate_anchor_origin_is_rejected(self) -> None:
        with self.assertRaises(ComparisonAlignmentError):
            anchors_alignment([
                (1.0, 1.0, 10.0, 10.0),
                (1.0, 1.0, 20.0, 20.0),
            ])

    def test_non_finite_anchor_is_rejected(self) -> None:
        with self.assertRaises(ComparisonAlignmentError):
            parse_anchor("0,0,nan,20")

    def test_auto_bbox_preserves_uniform_scale(self) -> None:
        points = [(10.0, 10.0), (30.0, 10.0), (30.0, 50.0), (10.0, 50.0)]
        alignment = auto_alignment_from_bbox(
            points,
            [50.0, 40.0, 90.0, 120.0],
            confidence=0.9,
            method="test-mask",
        )
        self.assertAlmostEqual(alignment["scale"], 2.0)
        self.assertEqual(alignment["rotate_deg"], 0.0)
        self.assertAlmostEqual(alignment["confidence"], 0.9)

    def test_scale_must_be_positive(self) -> None:
        with self.assertRaises(ComparisonAlignmentError):
            manual_alignment([(0.0, 0.0), (1.0, 1.0)], scale=0.0)


if __name__ == "__main__":
    unittest.main()
