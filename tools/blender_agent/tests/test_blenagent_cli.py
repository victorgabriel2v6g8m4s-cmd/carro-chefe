from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
LAUNCHER = ROOT / "blenagent.ps1"
ROOT_CMD = REPO / "blenagent.cmd"


class BlenagentCliTests(unittest.TestCase):
    def test_root_cmd_invokes_short_cli(self) -> None:
        source = ROOT_CMD.read_text(encoding="utf-8")
        self.assertIn("tools\\blender_agent\\blenagent.ps1", source)
        self.assertIn("-ExecutionPolicy Bypass", source)
        self.assertIn("%*", source)

    def test_restart_stops_then_starts(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        start = source.index("function Restart-Agent")
        end = source.index("function Install-BlenagentCommand")
        block = source[start:end]
        self.assertIn("Stop-Agent", block)
        self.assertIn("Start-Agent", block)
        self.assertLess(block.index("Stop-Agent"), block.index("Start-Agent"))
        self.assertIn("$SessionFile", block)

    def test_installer_creates_user_command_without_baking_unicode_repo_path(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        self.assertIn('SetEnvironmentVariable("CARRO_CHEFE_REPO", $RepoRoot, "User")', source)
        self.assertIn('Join-Path $env:LOCALAPPDATA "CarroChefe\\bin"', source)
        self.assertIn('%CARRO_CHEFE_REPO%\\tools\\blender_agent\\blenagent.ps1', source)
        self.assertIn('SetEnvironmentVariable("Path", $newPath, "User")', source)

    def test_short_cli_covers_common_lifecycle_and_smoke_commands(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        for command in (
            '"start"',
            '"stop"',
            '"restart"',
            '"status"',
            '"image-smoke"',
            '"sculpt-smoke"',
            '"recipe-smoke"',
            '"iteration-smoke"',
            '"context-smoke"',
            '"smoke"',
            '"install-mcp"',
        ):
            self.assertIn(command, source)
        self.assertIn('.runtime\\blender-agent\\assets\\referencia.jpg', source)


if __name__ == "__main__":
    unittest.main()
