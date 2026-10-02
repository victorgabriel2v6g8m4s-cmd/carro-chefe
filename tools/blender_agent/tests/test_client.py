from __future__ import annotations

import unittest

from tools.blender_agent.client import _json_text, build_parser


class ClientParserTests(unittest.TestCase):
    def test_json_output_is_ascii_safe_for_windows_powershell(self) -> None:
        text = _json_text({"path": r"C:\\Users\\valdi\\Área de Trabalho\\cezar"})
        self.assertTrue(text.isascii())
        self.assertIn(r"\\u00c1rea de Trabalho", text)

    def test_ui_drag_parses_modifiers(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "ui-drag",
            "10",
            "20",
            "100",
            "120",
            "--button",
            "middle",
            "--shift",
            "--steps",
            "12",
        ])
        self.assertEqual(args.command, "ui-drag")
        self.assertEqual(args.button, "middle")
        self.assertTrue(args.shift)
        self.assertEqual(args.steps, 12)

    def test_ui_orbit_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["ui-orbit", "--dx", "90", "--dy", "-40", "--steps", "10"])
        self.assertEqual(args.command, "ui-orbit")
        self.assertEqual(args.dx, 90)
        self.assertEqual(args.dy, -40)
        self.assertEqual(args.steps, 10)

    def test_viewport_capture_set_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "viewport-capture-set",
            "--label",
            "baguete-v1",
            "--views",
            "FRONT",
            "TOP",
            "THREE_QUARTER",
            "--shading",
            "MATERIAL",
        ])
        self.assertEqual(args.command, "viewport-capture-set")
        self.assertEqual(args.label, "baguete-v1")
        self.assertEqual(args.views, ["FRONT", "TOP", "THREE_QUARTER"])
        self.assertEqual(args.shading, "MATERIAL")

    def test_viewport_view_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["viewport-view", "THREE_QUARTER", "--no-frame-all"])
        self.assertEqual(args.command, "viewport-view")
        self.assertEqual(args.preset, "THREE_QUARTER")
        self.assertTrue(args.no_frame_all)

    def test_workspace_capture_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "workspace-capture-set",
            "--label", "tabs",
            "--workspace", "Layout",
            "--workspace", "Sculpting",
            "--target", "VIEW_3D",
            "--shading", "MATERIAL",
        ])
        self.assertEqual(args.command, "workspace-capture-set")
        self.assertEqual(args.workspaces, ["Layout", "Sculpting"])
        self.assertEqual(args.shading, "MATERIAL")

    def test_history_search_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "history-search", "baguete",
            "--stage", "shape",
            "--action", "object.",
            "--success", "failure",
            "--attachment", "success",
            "--tag", "bread",
        ])
        self.assertEqual(args.command, "history-search")
        self.assertEqual(args.stage_id, "shape")
        self.assertFalse(args.success)
        self.assertTrue(args.has_attachment)
        self.assertEqual(args.tags, ["bread"])

    def test_history_start_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["history-start", "Bread shape", "--id", "bread-shape", "--tag", "bread"])
        self.assertEqual(args.command, "history-start")
        self.assertEqual(args.stage_id, "bread-shape")
        self.assertEqual(args.tags, ["bread"])

    def test_recipe_validate_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["recipe-validate", "recipe.json"])
        self.assertEqual(args.command, "recipe-validate")
        self.assertEqual(args.path, "recipe.json")

    def test_recipe_plan_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "recipe-plan", "recipe.json",
            "--variant", "long",
            "--set", "roughness=0.4",
            "--set", 'object_name="Test"',
        ])
        self.assertEqual(args.command, "recipe-plan")
        self.assertEqual(args.variant, "long")
        self.assertEqual(args.sets, ["roughness=0.4", 'object_name="Test"'])

    def test_recipe_run_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "recipe-run", "recipe.json",
            "--variant", "compact",
            "--set", 'object_name="Smoke"',
            "--dry-run",
            "--restore-stage",
        ])
        self.assertEqual(args.command, "recipe-run")
        self.assertEqual(args.variant, "compact")
        self.assertTrue(args.dry_run)
        self.assertTrue(args.restore_stage)
        self.assertFalse(args.no_stage)

    def test_recipe_status_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["recipe-status"])
        self.assertEqual(args.command, "recipe-status")

    def test_sculpt_prepare_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "sculpt-prepare",
            "--name", "Bread",
            "--brush", "GRAB",
            "--radius", "72",
            "--strength", "0.3",
        ])
        self.assertEqual(args.command, "sculpt-prepare")
        self.assertEqual(args.name, "Bread")
        self.assertEqual(args.brush, "GRAB")
        self.assertEqual(args.radius, 72)

    def test_sculpt_stroke_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "sculpt-stroke",
            "--points-json", "[[0.4,0.5],[0.6,0.5]]",
            "--brush", "DRAW",
            "--radius", "50",
            "--strength", "0.2",
            "--mode", "NORMAL",
        ])
        self.assertEqual(args.command, "sculpt-stroke")
        self.assertEqual(args.points_json, [[0.4, 0.5], [0.6, 0.5]])
        self.assertEqual(args.coordinate_space, "NORMALIZED")
        self.assertFalse(args.no_checkpoint)

    def test_sculpt_stroke_repeated_point_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "sculpt-stroke",
            "--point", "0.4", "0.5",
            "--point", "0.6", "0.5",
            "--brush", "DRAW",
        ])
        self.assertEqual(args.points, [[0.4, 0.5], [0.6, 0.5]])
        self.assertIsNone(args.points_json)

    def test_object_add_primitive_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "object-add-primitive", "uv_sphere",
            "--name", "Smoke Sphere",
            "--location", "1", "2", "3",
        ])
        self.assertEqual(args.kind, "uv_sphere")
        self.assertEqual(args.name, "Smoke Sphere")
        self.assertEqual(args.location, [1.0, 2.0, 3.0])

    def test_object_delete_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["object-delete", "Smoke Sphere"])
        self.assertEqual(args.name, "Smoke Sphere")

    def test_sculpt_finish_parser(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["sculpt-finish"])
        self.assertEqual(args.command, "sculpt-finish")
        self.assertFalse(args.keep_workspace)

    def test_generic_call_accepts_json(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "call",
            "object.transform",
            "--json",
            '{"name":"Pao","scale":[2,1,1]}',
        ])
        self.assertEqual(args.action, "object.transform")
        self.assertEqual(args.params["name"], "Pao")


if __name__ == "__main__":
    unittest.main()
