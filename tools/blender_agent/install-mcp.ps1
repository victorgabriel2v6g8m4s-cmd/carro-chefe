param(
    [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RuntimeRoot = Join-Path $RepoRoot ".runtime\blender-agent"
$Venv = Join-Path $RuntimeRoot "mcp-venv"
$Requirements = Join-Path $PSScriptRoot "requirements-mcp.txt"

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

Write-Host "Criando ambiente MCP em:"
Write-Host $Venv

& $PythonExe -m venv $Venv
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao criar venv com $PythonExe."
}

$VenvPython = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path -LiteralPath $VenvPython)) {
    throw "Python do venv nao encontrado: $VenvPython"
}

& $VenvPython -m pip install --disable-pip-version-check --upgrade pip
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao atualizar pip."
}

& $VenvPython -m pip install --disable-pip-version-check -r $Requirements
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar dependencias MCP."
}

Write-Host ""
Write-Host "MCP do Blender Agent instalado."
Write-Host "Python: $VenvPython"
Write-Host ""
Write-Host "Configuracao Codex sugerida para %USERPROFILE%\.codex\config.toml:"
Write-Host ""
Write-Host "[mcp_servers.carro_chefe_blender]"
Write-Host ('command = "' + $VenvPython.Replace("\", "\\") + '"')
Write-Host 'args = ["-m", "tools.blender_agent.mcp_server"]'
Write-Host ('cwd = "' + $RepoRoot.Replace("\", "\\") + '"')
Write-Host "required = false"
Write-Host "startup_timeout_sec = 20"
Write-Host "tool_timeout_sec = 60"
Write-Host ""
Write-Host "Depois reinicie o Codex/Work local e confirme a descoberta das ferramentas."
