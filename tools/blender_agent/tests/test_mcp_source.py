from __future__ import annotations

import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "mcp_server.py"
REQUIREMENTS = ROOT / "requirements-mcp.txt"


class McpAdapterSourceTests(unittest.TestCase):
    def test_mcp_server_parses_without_importing_optional_dependency(self) -> None:
        ast.parse(SERVER.read_text(encoding="utf-8"))

    def test_mcp_server_exposes_expected_tools(self) -> None:
        source = SERVER.read_text(encoding="utf-8")
        for name in (
            "blender_status",
            "blender_scene_summary",
            "blender_viewport_describe",
            "blender_viewport_set_view",
            "blender_viewport_capture",
            "blender_ui_orbit",
            "blender_checkpoint",
            "blender_action",
            "blender_sculpt_iteration",
            "blender_sculpt_stroke",
            "blender_sculpt_prepare",
            "blender_sculpt_status",
            "blender_history_note",
            "blender_history_search",
            "blender_history_context",
            "blender_history_use",
            "blender_history_list",
            "blender_history_start",
            "blender_workspace_capture",
            "blender_workspace_describe",
            "blender_workspaces",
        ):
            self.assertIn(f"def {name}(", source)
        self.assertIn('Image(path=result["path"])', source)
        self.assertIn('mcp.run(transport="stdio")', source)

    def test_workspace_capture_rejects_partial_or_unrestored_results(self) -> None:
        source = SERVER.read_text(encoding="utf-8")
        self.assertIn('result.get("failure_count", 0)', source)
        self.assertIn('result.get("restored_original_workspace", False)', source)

    def test_sculpt_iteration_returns_before_and_after_images(self) -> None:
        source = SERVER.read_text(encoding="utf-8")
        self.assertIn("def blender_sculpt_iteration(", source)
        self.assertIn('checkpoint": True', source)
        self.assertIn('capture_before": True', source)
        self.assertIn('Image(path=before["path"])', source)
        self.assertIn('Image(path=after["path"])', source)

    def test_mcp_server_has_no_shell_or_dynamic_execution(self) -> None:
        tree = ast.parse(SERVER.read_text(encoding="utf-8"))
        forbidden = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    name = node.func.attr
                else:
                    name = None
                if name in {"eval", "exec", "system", "popen", "run", "Popen"}:
                    # mcp.run is allowed; process/subprocess run is not.
                    if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == "mcp":
                        continue
                    forbidden.append(name)
        self.assertEqual(forbidden, [])

    def test_mcp_dependency_uses_stable_major_line(self) -> None:
        requirement = REQUIREMENTS.read_text(encoding="utf-8").strip()
        self.assertEqual(requirement, "mcp==2.2.0")


if __name__ == "__main__":
    unittest.main()
