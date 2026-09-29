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

    def test_workspace_capture_yields_between_workspace_switch_and_screenshot(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("class WorkspaceCaptureJob", source)
        self.assertIn("def _start_workspace_capture_job", source)
        self.assertIn("def _advance_workspace_capture_job", source)
        self.assertIn('job.phase = "settle_workspace"', source)
        self.assertIn('job.phase = "settle_config"', source)
        self.assertIn("_WORKSPACE_CAPTURE_SETTLE_TICKS", source)
        self.assertIn('if _CAPTURE_JOB is not None:', source)

    def test_workspace_capture_validates_requested_and_captured_workspace(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn('"workspace_requested": requested_workspace_name', source)
        self.assertIn('"workspace_captured": workspace_after', source)
        self.assertIn('"workspace_match": workspace_after == requested_workspace_name', source)
        self.assertIn('"screen_captured": screen_after', source)
        self.assertIn("workspace mismatch antes da captura", source)

    def test_workspace_capture_restores_original_workspace(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("original_workspace_name", source)
        self.assertIn("restored_original_workspace", source)
        self.assertIn('job.phase = "restore_settle"', source)
        self.assertIn("attachment_output_path", source)
        self.assertIn("workspace.capture_set", source)

    def test_sculpt_strokes_are_checkpointed_and_bounded(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("def _sculpt_prepare", source)
        self.assertIn("def _sculpt_stroke", source)
        self.assertIn("def _normalize_sculpt_points", source)
        self.assertIn("sculpt.stroke limita cada stroke a 128 pontos", source)
        self.assertIn("_sculpt_checkpoint", source)
        self.assertIn("checkpoint", source)
        self.assertIn('"NORMALIZED", "REGION"', source)

    def test_sculpt_uses_operator_stroke_and_context_override(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("bpy.ops.sculpt.brush_stroke", source)
        self.assertIn('"override_location" in available', source)
        self.assertIn("bpy.context.temp_override", source)
        self.assertIn("_SCULPT_BRUSH_TYPES", source)

    def test_bridge_binds_through_loopback_constant(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("(DEFAULT_HOST, port)", source)
        self.assertNotIn('"0.0.0.0"', source)


if __name__ == "__main__":
    unittest.main()
