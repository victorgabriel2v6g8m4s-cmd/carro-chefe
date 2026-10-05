from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "blender_bridge_v05_entry.py"


class BlenderBridgeV05EntrySourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = ENTRY.read_text(encoding="utf-8")

    def test_entry_loads_extension_before_starting_core(self) -> None:
        self.assertIn("from tools.blender_agent import blender_bridge_v05 as v05", self.source)
        self.assertIn("core.start_bridge()", self.source)

    def test_iteration_history_is_not_double_logged(self) -> None:
        self.assertIn('if action.startswith("iteration."):', self.source)
        self.assertIn("_CORE_RECORD_TASK_HISTORY", self.source)

    def test_iteration_status_bypasses_main_thread_queue(self) -> None:
        self.assertIn('elif action == "iteration.status":', self.source)
        self.assertIn('"result": v05._iteration_status()', self.source)

    def test_iteration_actions_have_extended_server_wait_budget(self) -> None:
        self.assertIn('elif action.startswith("iteration."):', self.source)
        self.assertIn("wait_timeout = 90", self.source)

    def test_entry_has_no_shell_or_dynamic_execution(self) -> None:
        for token in ("eval(", "exec(", "subprocess", "os.system", "shell=True"):
            self.assertNotIn(token, self.source)


if __name__ == "__main__":
    unittest.main()
