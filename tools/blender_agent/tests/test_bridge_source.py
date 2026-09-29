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

    def test_bridge_binds_through_loopback_constant(self) -> None:
        source = BRIDGE.read_text(encoding="utf-8")
        self.assertIn("(DEFAULT_HOST, port)", source)
        self.assertNotIn('"0.0.0.0"', source)


if __name__ == "__main__":
    unittest.main()
