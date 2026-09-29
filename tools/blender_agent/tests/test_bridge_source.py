from __future__ import annotations

import ast
import unittest
from pathlib import Path


BRIDGE = Path(__file__).resolve().parents[1] / "blender_bridge.py"


class BridgeSourceTests(unittest.TestCase):
    def test_bridge_has_no_eval_exec_or_shell(self) -> None:
        tree = ast.parse(BRIDGE.read_text(encoding="utf-8"))
        forbidden_calls = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                name = None
                if isinstance(node.func, ast.Name):
                    name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    name = node.func.attr
                if name in {"eval", "exec", "system", "popen"}:
                    forbidden_calls.append(name)
        self.assertEqual(forbidden_calls, [])

    def test_startup_splash_is_dismissed_once(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("_dismiss_startup_modal", source)
        self.assertIn('event_simulate("ESC"', source)
        self.assertIn("first_interval=0.75", source)

    def test_viewport_capture_uses_blender_window_screenshot(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("window.screenshot(region=region_rect)", source)
        self.assertIn("imbuf.write(image", source)
        self.assertIn("attachment_output_path(filename)", source)
        self.assertIn('attachment_output_path(f"{output.stem}.json")', source)

    def test_viewport_presets_use_context_override(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("bpy.context.temp_override", source)
        self.assertIn("bpy.ops.view3d.view_axis", source)
        self.assertIn("THREE_QUARTER", source)

    def test_bridge_records_non_history_actions(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("def _record_task_history", source)
        self.assertIn('if action.startswith("history.")', source)
        self.assertIn("record_event(", source)
        self.assertIn("ensure_stage()", source)

    def test_workspace_capture_restores_original_workspace(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("def _workspace_capture_set", source)
        self.assertIn("window.workspace = original", source)
        self.assertIn("attachment_output_path", source)
        self.assertIn("workspace.capture_set", source)

    def test_bridge_binds_through_loopback_constant(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("(DEFAULT_HOST, port)", source)
        self.assertNotIn('"0.0.0.0"', source)


if __name__ == "__main__":
    unittest.main()
