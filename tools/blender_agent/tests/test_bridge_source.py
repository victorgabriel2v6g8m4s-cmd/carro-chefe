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

    def test_sculpt_settings_support_blender_52_location(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("def _sculpt_unified_paint_settings", source)
        self.assertIn('getattr(tool_settings, "sculpt", None)', source)
        self.assertIn('getattr(sculpt, "unified_paint_settings", None)', source)
        self.assertIn('getattr(tool_settings, "unified_paint_settings", None)', source)
        self.assertIn('"settings_source": settings_source', source)
        self.assertNotIn(
            "bpy.context.scene.tool_settings.unified_paint_settings",
            source,
        )

    def test_sculpt_prepare_yields_after_workspace_switch(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("class SculptPrepareJob", source)
        self.assertIn("def _start_sculpt_prepare_job", source)
        self.assertIn("def _advance_sculpt_prepare_job", source)
        self.assertIn('job.phase = "settle"', source)
        self.assertIn("_WORKSPACE_CAPTURE_SETTLE_TICKS", source)
        self.assertIn('if _SCULPT_PREPARE_JOB is not None:', source)
        self.assertIn("return _advance_sculpt_prepare_job()", source)

    def test_sculpt_prepare_restores_workspace_on_failure(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("original_workspace_name=window.workspace.name", source)
        self.assertIn("def _sculpt_prepare_cleanup", source)
        self.assertIn("window.workspace = original", source)
        self.assertIn('job.phase = "restore_error"', source)
        self.assertIn("_SCULPT_SESSION = None", source)

    def test_sculpt_before_capture_uses_fallback_name_when_none(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn(
            'before_name = params.get("before_name") or f"sculpt-before-{time.time_ns()}.png"',
            source,
        )

    def test_sculpt_finish_restores_workspace_asynchronously(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("class SculptFinishJob", source)
        self.assertIn("def _start_sculpt_finish_job", source)
        self.assertIn("def _advance_sculpt_finish_job", source)
        self.assertIn('job.phase = "settle_object"', source)
        self.assertIn('job.phase = "settle_workspace"', source)
        self.assertIn('"restored_original_workspace": restored', source)
        self.assertIn('"strategy": "timer-yield"', source)
        self.assertIn('if _SCULPT_FINISH_JOB is not None:', source)
        self.assertIn("return _advance_sculpt_finish_job()", source)

    def test_sculpt_stroke_filters_element_fields_from_rna(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("def _sculpt_stroke_element_property_names", source)
        self.assertIn('rna.properties.get("stroke")', source)
        self.assertIn('getattr(stroke_property, "fixed_type", None)', source)
        self.assertIn("allowed_properties=stroke_element_properties", source)
        self.assertIn("if key in allowed_properties", source)
        self.assertIn('"stroke_element_properties": sorted(stroke_element_properties)', source)

    def test_sculpt_uses_operator_stroke_and_context_override(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("bpy.ops.sculpt.brush_stroke", source)
        self.assertIn('"override_location" in available', source)
        self.assertIn("bpy.context.temp_override", source)
        self.assertIn("_SCULPT_BRUSH_TYPES", source)

    def test_recipe_runner_is_scheduler_driven_and_receipted(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("class RecipeRunJob", source)
        self.assertIn("def _start_recipe_run_job", source)
        self.assertIn("def _advance_recipe_run_job", source)
        self.assertIn("def _recipe_finalize", source)
        self.assertIn('"receipt_hash"', source)
        self.assertIn('action="recipe.step"', source)
        self.assertIn('action="recipe.capture"', source)
        self.assertIn('action="recipe.run"', source)
        self.assertIn('if _RECIPE_RUN_JOB is not None:', source)
        self.assertIn("return _advance_recipe_run_job()", source)

    def test_recipe_run_is_not_generic_history_logged(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn('or action == "recipe.run"', source)
        self.assertIn("stage_id=job.stage_id", source)

    def test_bridge_binds_through_loopback_constant(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("(DEFAULT_HOST, port)", source)
        self.assertNotIn('"0.0.0.0"', source)


if __name__ == "__main__":
    unittest.main()
