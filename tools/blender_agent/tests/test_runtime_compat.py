from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from tools.blender_agent import history
from tools.blender_agent.runtime_compat import (
    DEFAULT_COMPAT_PATH_LIMIT,
    RUNTIME_PROFILE,
    attachment_output_path,
    filename_for_parent,
    safe_runtime_path,
    windows_path_units,
)


ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "blender_bridge_v05_entry.py"
COMPAT = ROOT / "runtime_compat.py"
STOP = ROOT / "stop.ps1"
SCULPT_SMOKE = ROOT / "sculpt-smoke-test.ps1"


class RuntimeCompatTests(unittest.TestCase):
    def _restore_env(self, name: str, previous: str | None) -> None:
        if previous is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = previous

    def test_filename_budget_uses_complete_windows_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp) / ("parent-" + "x" * 60)
            parent.mkdir(parents=True)
            result = filename_for_parent(
                parent,
                "capture-" + ("y" * 180) + ".png",
                max_path_length=180,
            )
            self.assertTrue(result.endswith(".png"))
            self.assertLessEqual(windows_path_units(parent / result), 180)
            self.assertIn("-", Path(result).stem)

    def test_long_names_keep_uniqueness_after_shortening(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp)
            first = filename_for_parent(
                parent,
                ("same-prefix-" + "x" * 180 + "-a.png"),
                max_path_length=150,
            )
            second = filename_for_parent(
                parent,
                ("same-prefix-" + "x" * 180 + "-b.png"),
                max_path_length=150,
            )
            self.assertNotEqual(first, second)
            self.assertTrue(first.endswith(".png"))
            self.assertTrue(second.endswith(".png"))

    def test_safe_runtime_path_stays_below_configured_budget(self) -> None:
        previous_root = os.environ.get("CC_BLENDER_RUNTIME")
        previous_limit = os.environ.get("CC_BLENDER_MAX_PATH")
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["CC_BLENDER_RUNTIME"] = str(Path(tmp) / ("runtime-" + "r" * 40))
            os.environ["CC_BLENDER_MAX_PATH"] = "180"
            try:
                result = safe_runtime_path("captures", ("capture-" + "z" * 180) + ".png")
                self.assertTrue(result.name.endswith(".png"))
                self.assertLessEqual(windows_path_units(result), 180)
            finally:
                self._restore_env("CC_BLENDER_RUNTIME", previous_root)
                self._restore_env("CC_BLENDER_MAX_PATH", previous_limit)

    def test_history_attachment_respects_full_path_budget(self) -> None:
        previous_root = os.environ.get("CC_BLENDER_RUNTIME")
        previous_limit = os.environ.get("CC_BLENDER_MAX_PATH")
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["CC_BLENDER_RUNTIME"] = str(Path(tmp) / "rt")
            os.environ["CC_BLENDER_MAX_PATH"] = "220"
            try:
                history.create_stage(
                    "Long recipe",
                    stage_id="stage-" + ("s" * 50),
                )
                result = attachment_output_path(
                    "recipe-49-step-capture-" + ("q" * 180) + ".png"
                )
                self.assertTrue(result.name.endswith(".png"))
                self.assertLessEqual(windows_path_units(result), 220)
            finally:
                self._restore_env("CC_BLENDER_RUNTIME", previous_root)
                self._restore_env("CC_BLENDER_MAX_PATH", previous_limit)

    def test_default_budget_leaves_legacy_windows_headroom(self) -> None:
        self.assertLess(DEFAULT_COMPAT_PATH_LIMIT, 260)
        self.assertEqual(DEFAULT_COMPAT_PATH_LIMIT, 240)

    def test_sculpt_prepare_runner_has_no_recipe_job_metadata(self) -> None:
        source = COMPAT.read_text(encoding="utf-8")
        start = source.index("def _make_sculpt_prepare_runner")
        end = source.index("def _make_sculpt_checkpoint")
        block = source[start:end]
        self.assertNotIn("job.run_id", block)
        self.assertNotIn("job.plan", block)
        self.assertNotIn('action="recipe.run"', block)
        self.assertIn("core._record_task_history(job.task, ok=True, result=result)", block)

    def test_entrypoint_installs_runtime_compat_before_server_start(self) -> None:
        source = ENTRY.read_text(encoding="utf-8")
        install_at = source.index("runtime_compat.install(core, v05)")
        start_at = source.index("core.start_bridge()")
        self.assertLess(install_at, start_at)
        self.assertIn("runtime_compat.RUNTIME_PROFILE", source)
        self.assertTrue(RUNTIME_PROFILE.endswith(".4"))

    def test_sculpt_smoke_reads_runtime_profile_from_runtime_compat(self) -> None:
        source = SCULPT_SMOKE.read_text(encoding="utf-8")
        self.assertIn("from tools.blender_agent.runtime_compat import RUNTIME_PROFILE", source)
        self.assertIn("$ExpectedRuntimeProfile", source)
        self.assertNotIn('ExpectedRuntimeProfile = "v05-runtime-compat-', source)

    def test_runtime_compat_installs_asset_actions(self) -> None:
        source = COMPAT.read_text(encoding="utf-8")
        self.assertIn("from . import assets, history, protocol", source)
        self.assertIn("assets.install(core, v05)", source)

    def test_modal_safe_shutdown_is_allowlisted_at_runtime(self) -> None:
        source = COMPAT.read_text(encoding="utf-8")
        self.assertIn('protocol.ALLOWED_ACTIONS.add("app.quit")', source)
        self.assertIn('if action == "app.quit"', source)
        self.assertIn("use_save_prompt = False", source)
        self.assertIn("core.bpy.ops.wm.quit_blender()", source)
        self.assertIn('mode not in {"checkpoint", "save", "discard"}', source)

    def test_stop_script_defaults_to_recovery_checkpoint(self) -> None:
        source = STOP.read_text(encoding="utf-8")
        self.assertIn('[string]$Mode = "checkpoint"', source)
        self.assertIn("tools.blender_agent.client call app.quit", source)
        self.assertIn("Stop-Process -Id $pidValue -Force", source)
        self.assertIn("can lose changes not already saved/checkpointed", source)


if __name__ == "__main__":
    unittest.main()
