from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = (
    ROOT / "start.ps1",
    ROOT / "smoke-test.ps1",
    ROOT / "install-mcp.ps1",
)


class WindowsPowerShellSourceTests(unittest.TestCase):
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
