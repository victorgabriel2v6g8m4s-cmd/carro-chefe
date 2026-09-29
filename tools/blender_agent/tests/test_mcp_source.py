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
        ):
            self.assertIn(f"def {name}(", source)
        self.assertIn('Image(path=result["path"])', source)
        self.assertIn('mcp.run(transport="stdio")', source)

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
        self.assertEqual(requirement, "mcp>=2,<3")


if __name__ == "__main__":
    unittest.main()
