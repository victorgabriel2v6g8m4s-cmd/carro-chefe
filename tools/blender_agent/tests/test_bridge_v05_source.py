from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / "blender_bridge_v05.py"


class BlenderBridgeV05SourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = BRIDGE.read_text(encoding="utf-8")

    def test_focused_recipe_capture_is_non_destructive_to_scene_objects(self) -> None:
        source = self.source
        self.assertIn("def _begin_focused_capture", source)
        self.assertIn("obj.hide_set(True)", source)
        self.assertIn("bpy.ops.view3d.view_selected", source)
        self.assertIn("def _restore_capture_state", source)
        self.assertIn('result["isolated_target"] = True', source)
        focused_section = source[source.index("def _begin_focused_capture"):source.index("# ---------------------------------------------------------------------------\n# V0.5 metrics")]
        self.assertNotIn("bpy.data.objects.remove", focused_section)

    def test_core_recipe_capture_is_patched_but_core_bridge_remains_source_of_truth(self) -> None:
        source = self.source
        self.assertIn("_CORE_RECIPE_CONFIGURE_CAPTURE = core._recipe_configure_capture", source)
        self.assertIn("_CORE_RECIPE_CAPTURE = core._recipe_capture", source)
        self.assertIn("core._recipe_configure_capture = _recipe_configure_capture_focused", source)
        self.assertIn("core._recipe_capture = _recipe_capture_focused", source)
        self.assertIn("core._dispatch = _dispatch_extended", source)

    def test_iteration_uses_snapshot_checkpoint_diff_and_receipt(self) -> None:
        source = self.source
        self.assertIn("def _create_iteration_snapshot", source)
        self.assertIn("def _restore_iteration_snapshot", source)
        self.assertIn('checkpoint.create', source)
        self.assertIn("metrics_diff(", source)
        self.assertIn("receipt_hash", source)
        self.assertIn("attachment_output_path", source)

    def test_iteration_history_is_structured(self) -> None:
        source = self.source
        for action in (
            "iteration.start",
            "iteration.observe",
            "iteration.propose",
            "iteration.apply",
            "iteration.evaluate",
            "iteration.rollback",
            "iteration.finish",
        ):
            self.assertIn(f'action="{action}"', source)

    def test_iteration_actions_are_explicitly_dispatched(self) -> None:
        source = self.source
        for action in (
            "iteration.validate",
            "iteration.start",
            "iteration.status",
            "iteration.context",
            "iteration.observe",
            "iteration.propose",
            "iteration.apply",
            "iteration.evaluate",
            "iteration.rollback",
            "iteration.finish",
        ):
            self.assertIn(f'action == "{action}"', source)

    def test_no_arbitrary_execution_surface(self) -> None:
        source = self.source
        forbidden = (
            "eval(",
            "exec(",
            "subprocess",
            "os.system",
            "Popen(",
            "shell=True",
        )
        for token in forbidden:
            self.assertNotIn(token, source)


if __name__ == "__main__":
    unittest.main()
