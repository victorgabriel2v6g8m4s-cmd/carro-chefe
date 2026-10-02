from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = (
    ROOT / "start.ps1",
    ROOT / "smoke-test.ps1",
    ROOT / "context-smoke-test.ps1",
    ROOT / "sculpt-smoke-test.ps1",
    ROOT / "recipe-smoke-test.ps1",
    ROOT / "install-mcp.ps1",
)


class WindowsPowerShellSourceTests(unittest.TestCase):
    def test_sculpt_smoke_collects_native_stderr_without_terminating(self) -> None:
        source = (ROOT / "sculpt-smoke-test.ps1").read_text(encoding="ascii")
        self.assertIn('$ErrorActionPreference = "Continue"', source)
        self.assertIn("$exitCode = $LASTEXITCODE", source)
        self.assertIn("Command failed (exit $exitCode)", source)

    def test_sculpt_smoke_avoids_inline_json(self) -> None:
        source = (ROOT / "sculpt-smoke-test.ps1").read_text(encoding="ascii")
        self.assertNotIn("--json", source)
        self.assertNotIn("--points-json", source)
        self.assertIn("object-add-primitive", source)
        self.assertIn("object-delete", source)
        self.assertIn('"--point"', source)

    def test_recipe_smoke_avoids_inline_recipe_json(self) -> None:
        source = (ROOT / "recipe-smoke-test.ps1").read_text(encoding="ascii")
        self.assertNotIn("--json", source)
        self.assertIn("recipe-validate", source)
        self.assertIn("recipe-plan", source)
        self.assertIn("recipe-run", source)
        self.assertIn("recipe-status", source)
        self.assertIn("object-delete", source)

    def test_windows_powershell_scripts_are_ascii_safe(self) -> None:
        for script in SCRIPTS:
            with self.subTest(script=script.name):
                raw = script.read_bytes()
                self.assertTrue(
                    raw.isascii(),
                    f"{script.name} contem bytes nao ASCII; Windows PowerShell 5.1 pode corromper literais sem BOM",
                )


if __name__ == "__main__":
    unittest.main()
