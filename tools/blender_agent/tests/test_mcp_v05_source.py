from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "mcp_server_v05.py"


class MCPV05SourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = SERVER.read_text(encoding="utf-8")

    def test_expected_iterative_tools_exist(self) -> None:
        for name in (
            "blender_iteration_validate",
            "blender_iteration_start",
            "blender_iteration_status",
            "blender_iteration_context",
            "blender_iteration_observe",
            "blender_iteration_observe_images",
            "blender_iteration_propose",
            "blender_iteration_apply",
            "blender_iteration_apply_compare",
            "blender_iteration_evaluate",
            "blender_iteration_rollback",
            "blender_iteration_finish",
        ):
            self.assertIn(f"def {name}(", self.source)

    def test_multimodal_tools_return_images(self) -> None:
        self.assertIn("def blender_iteration_observe_images() -> list[Image]", self.source)
        self.assertIn("def blender_iteration_apply_compare(approved: bool = False) -> list[Image]", self.source)
        self.assertIn('Image(path=item["path"])', self.source)

    def test_mutation_requires_explicit_approved_argument_when_session_demands_it(self) -> None:
        self.assertIn('call("iteration.apply", {"approved": approved}', self.source)

    def test_server_reuses_base_mcp_and_has_no_shell_surface(self) -> None:
        self.assertIn("mcp = base.mcp", self.source)
        for token in ("eval(", "exec(", "subprocess", "os.system", "shell=True"):
            self.assertNotIn(token, self.source)


if __name__ == "__main__":
    unittest.main()
