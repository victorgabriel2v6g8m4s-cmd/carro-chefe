from __future__ import annotations

import unittest
from pathlib import Path

from tools.blender_agent import protocol
from tools.blender_agent.runtime_compat import RUNTIME_PROFILE


ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "comparison_snapshot.py"
COMPAT = ROOT / "runtime_compat.py"
MCP = ROOT / "mcp_server_v05.py"


class ComparisonSnapshotContractTests(unittest.TestCase):
    def test_snapshot_action_is_allowlisted(self) -> None:
        self.assertIn("mesh.comparison_snapshot", protocol.ALLOWED_ACTIONS)

    def test_runtime_profile_bumped_for_snapshot_contract(self) -> None:
        self.assertTrue(RUNTIME_PROFILE.endswith(".5"))

    def test_runtime_installs_snapshot_extension(self) -> None:
        source = COMPAT.read_text(encoding="utf-8")
        self.assertIn("comparison_snapshot", source)
        self.assertIn("comparison_snapshot.install(core, v05)", source)

    def test_snapshot_is_read_only_and_clears_evaluated_mesh(self) -> None:
        source = SNAPSHOT.read_text(encoding="utf-8")
        self.assertIn("evaluated_get", source)
        self.assertIn("to_mesh(", source)
        self.assertIn("to_mesh_clear()", source)
        self.assertNotIn("bpy.ops.object.select_all", source)
        self.assertNotIn("mode_set", source)
        self.assertNotIn("save_mainfile", source)
        self.assertNotIn("save_as_mainfile", source)
        self.assertIn("context_unchanged", source)

    def test_snapshot_has_payload_and_geometry_limits(self) -> None:
        source = SNAPSHOT.read_text(encoding="utf-8")
        self.assertIn("CC_BLENDER_COMPARE_MAX_VERTICES", source)
        self.assertIn("CC_BLENDER_COMPARE_MAX_FACES", source)
        self.assertIn("CC_BLENDER_COMPARE_MAX_PAYLOAD_BYTES", source)
        self.assertIn("payload_bytes", source)

    def test_snapshot_has_typed_mcp_adapter(self) -> None:
        source = MCP.read_text(encoding="utf-8")
        self.assertIn("def blender_mesh_comparison_snapshot", source)
        self.assertIn('call("mesh.comparison_snapshot"', source)


if __name__ == "__main__":
    unittest.main()
