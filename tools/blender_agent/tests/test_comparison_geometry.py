from __future__ import annotations

import unittest

from tools.blender_agent.comparison_geometry import (
    ComparisonGeometryError,
    apply_object_transform,
    canonical_pixel_projection,
    cube_mesh,
    deduplicate_edges,
    normalize_mesh,
    project_vertices,
)


class ComparisonGeometryTests(unittest.TestCase):
    def test_projection_axis_conventions(self) -> None:
        vertices = [[1.0, 2.0, 3.0], [-4.0, 5.0, -6.0]]
        front, front_meta = project_vertices(vertices, "FRONT")
        right, right_meta = project_vertices(vertices, "RIGHT")
        top, top_meta = project_vertices(vertices, "TOP")
        self.assertEqual(front, [(1.0, 3.0), (-4.0, -6.0)])
        self.assertEqual(right, [(2.0, 3.0), (5.0, -6.0)])
        self.assertEqual(top, [(1.0, 2.0), (-4.0, 5.0)])
        self.assertEqual(front_meta["horizontal"], "X")
        self.assertEqual(right_meta["horizontal"], "Y")
        self.assertEqual(top_meta["vertical"], "Y")

    def test_pixel_projection_inverts_vertical_axis(self) -> None:
        points, meta = canonical_pixel_projection([(-1.0, -1.0), (1.0, 1.0)], 200, 100)
        self.assertGreater(points[0][1], points[1][1])
        self.assertEqual(meta["canvas_center"], [100.0, 50.0])

    def test_shared_edges_are_deduplicated(self) -> None:
        faces = [[0, 1, 2], [2, 1, 3]]
        edges = deduplicate_edges(faces)
        self.assertEqual(len(edges), 5)
        self.assertEqual(edges.count((1, 2)), 1)

    def test_object_transform_applied_once(self) -> None:
        transformed = apply_object_transform(
            [[1.0, 0.0, 0.0]],
            location=[10.0, 0.0, 0.0],
            rotation_deg=[0.0, 0.0, 90.0],
            scale=[2.0, 1.0, 1.0],
        )
        self.assertAlmostEqual(transformed[0][0], 10.0, places=6)
        self.assertAlmostEqual(transformed[0][1], 2.0, places=6)

    def test_invalid_face_index_is_rejected(self) -> None:
        with self.assertRaises(ComparisonGeometryError):
            normalize_mesh(
                name="bad",
                vertices=[[0, 0, 0], [1, 0, 0], [0, 1, 0]],
                faces=[[0, 1, 9]],
            )

    def test_cube_has_expected_topology(self) -> None:
        vertices, faces = cube_mesh()
        mesh = normalize_mesh(name="cube", vertices=vertices, faces=faces)
        self.assertEqual(mesh["counts"]["vertices"], 8)
        self.assertEqual(mesh["counts"]["faces"], 6)
        self.assertEqual(mesh["counts"]["edges"], 12)

    def test_degenerate_projection_fails_before_render(self) -> None:
        with self.assertRaises(ComparisonGeometryError):
            canonical_pixel_projection([(1.0, 1.0), (1.0, 2.0)], 100, 100)


if __name__ == "__main__":
    unittest.main()
