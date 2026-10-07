from __future__ import annotations

import importlib.util
import unittest

from tools.blender_agent.comparison_render import (
    ComparisonRenderError,
    build_silhouette_mask,
    render_comparison,
    require_pillow,
)


PIL_AVAILABLE = importlib.util.find_spec("PIL") is not None


@unittest.skipUnless(PIL_AVAILABLE, "Pillow optional comparison dependency is not installed")
class ComparisonRenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.Image, *_ = require_pillow()

    def _fixture(self):
        reference = self.Image.new("RGBA", (64, 64), (20, 20, 20, 255))
        points = [(16.0, 16.0), (48.0, 16.0), (48.0, 48.0), (16.0, 48.0)]
        faces = [[0, 1, 2, 3]]
        return reference, points, faces

    def test_silhouette_is_union_mask(self) -> None:
        _reference, points, faces = self._fixture()
        mask = build_silhouette_mask((64, 64), points, faces)
        self.assertGreater(mask.getpixel((32, 32)), 0)
        self.assertEqual(mask.getpixel((2, 2)), 0)

    def test_opacity_zero_keeps_reference_when_lines_border_disabled(self) -> None:
        reference, points, faces = self._fixture()
        image, _ = render_comparison(
            reference=reference,
            points=points,
            faces=faces,
            width=64,
            height=64,
            fill=True,
            opacity=0,
            lines=False,
            border=False,
        )
        self.assertEqual(image.getpixel((32, 32)), reference.getpixel((32, 32)))

    def test_opacity_full_changes_center(self) -> None:
        reference, points, faces = self._fixture()
        image, _ = render_comparison(
            reference=reference,
            points=points,
            faces=faces,
            width=64,
            height=64,
            fill=True,
            opacity=100,
            fill_color=(1, 200, 10),
            lines=False,
            border=False,
        )
        self.assertEqual(image.getpixel((32, 32))[:3], (1, 200, 10))

    def test_lines_and_border_can_be_disabled_independently(self) -> None:
        reference, points, faces = self._fixture()
        with_lines, _ = render_comparison(
            reference=reference,
            points=points,
            faces=faces,
            width=64,
            height=64,
            fill=False,
            lines=True,
            border=False,
            line_color=(255, 255, 0),
        )
        with_border, _ = render_comparison(
            reference=reference,
            points=points,
            faces=faces,
            width=64,
            height=64,
            fill=False,
            lines=False,
            border=True,
            border_color=(255, 0, 0),
        )
        self.assertNotEqual(with_lines.getpixel((16, 16)), reference.getpixel((16, 16)))
        self.assertNotEqual(with_border.getpixel((14, 32)), reference.getpixel((14, 32)))

    def test_visible_line_mode_is_rejected_instead_of_mislabeled(self) -> None:
        reference, points, faces = self._fixture()
        with self.assertRaises(ComparisonRenderError):
            render_comparison(
                reference=reference,
                points=points,
                faces=faces,
                width=64,
                height=64,
                line_mode="visible",
            )


if __name__ == "__main__":
    unittest.main()
