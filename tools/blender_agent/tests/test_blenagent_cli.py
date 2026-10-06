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

    def test_restart_stops_then_starts_when_bridge_is_healthy(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        start = source.index("function Restart-Agent")
        end = source.index("function Show-AgentStatus")
        block = source[start:end]
        self.assertIn("Test-BridgeHealth", block)
        self.assertIn("Stop-Agent", block)
        self.assertIn("Start-Agent", block)
        self.assertLess(block.index("Stop-Agent"), block.index("Start-Agent"))

    def test_restart_recovers_dead_stale_session_without_force(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        start = source.index("function Restart-Agent")
        end = source.index("function Show-AgentStatus")
        block = source[start:end]
        self.assertIn("Remove-StaleSession", block)
        self.assertIn("-not $state.ProcessAlive", block)
        self.assertIn("Starting Blender Agent", block)

    def test_restart_does_not_kill_live_unreachable_blender_implicitly(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        start = source.index("function Restart-Agent")
        end = source.index("function Show-AgentStatus")
        block = source[start:end]
        self.assertIn("$state.ProcessAlive -and $state.BlenderProcess", block)
        self.assertIn("if (-not $Force)", block)
        self.assertIn("blenagent restart -Force", block)

    def test_status_reports_offline_without_throwing_generic_assertion(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        self.assertIn("function Show-AgentStatus", source)
        self.assertIn('Write-Host "Blender Agent: offline"', source)
        self.assertIn('Write-Host "Next:    blenagent restart"', source)
        status_block = source[source.index('"status" {'):source.index('"image-smoke" {')]
        self.assertIn("Show-AgentStatus", status_block)
        self.assertNotIn("Assert-LastExitCode", status_block)

    def test_lifecycle_scripts_run_in_child_powershell(self) -> None:
        source = LAUNCHER.read_text(encoding="utf-8")
        self.assertIn("function Invoke-AgentPowerShell", source)
        self.assertIn("& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Arguments", source)
        self.assertIn('Invoke-AgentPowerShell -ScriptName "start.ps1"', source)
        self.assertIn('Invoke-AgentPowerShell -ScriptName "stop.ps1"', source)

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
