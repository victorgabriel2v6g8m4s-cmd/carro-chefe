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
    ROOT / "iteration-smoke-test.ps1",
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

    def test_iteration_smoke_uses_python_module_without_inline_json(self) -> None:
        source = (ROOT / "iteration-smoke-test.ps1").read_text(encoding="ascii")
        self.assertNotIn("--json", source)
        self.assertIn("tools.blender_agent.iteration_smoke", source)
        self.assertIn("V0.5 iterative smoke", source)

    def test_start_script_loads_v05_entrypoint(self) -> None:
        source = (ROOT / "start.ps1").read_text(encoding="ascii")
        self.assertIn("blender_bridge_v05_entry.py", source)

    def test_v05_entrypoint_bootstraps_repo_root_before_package_imports(self) -> None:
        source = (ROOT / "blender_bridge_v05_entry.py").read_text(encoding="utf-8")
        bootstrap = source.index("sys.path.insert(0, _REPO_ROOT_TEXT)")
        core_import = source.index("from tools.blender_agent import blender_bridge as core")
        self.assertLess(bootstrap, core_import)
        self.assertIn("Path(__file__).resolve().parents[2]", source)

    def test_start_script_uses_retry_windows_and_startup_logs(self) -> None:
        source = (ROOT / "start.ps1").read_text(encoding="ascii")
        self.assertIn("[int]$MaxRetry = 9", source)
        self.assertIn("[int]$RetrySeconds = 10", source)
        self.assertIn("for ($attempt = 1; $attempt -le $MaxRetry; $attempt++)", source)
        self.assertIn("Tentativa ${attempt}/${MaxRetry}: aguardando bridge", source)
        self.assertNotIn("Tentativa $attempt/$MaxRetry:", source)
        self.assertIn("startup-logs", source)
        self.assertIn("-RedirectStandardOutput", source)
        self.assertIn("-RedirectStandardError", source)
        self.assertIn("WaitForBridgeSeconds esta obsoleto", source)

    def test_install_mcp_uses_v05_server(self) -> None:
        source = (ROOT / "install-mcp.ps1").read_text(encoding="ascii")
        self.assertIn("tools.blender_agent.mcp_server_v05", source)

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
