param(
    [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RuntimeRoot = Join-Path $RepoRoot ".runtime\blender-agent"
$Venv = Join-Path $RuntimeRoot "compare-venv"
$Requirements = Join-Path $PSScriptRoot "requirements-compare.txt"

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

Write-Host "Criando ambiente de comparacao em:"
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
    throw "Falha ao instalar dependencias de comparacao."
}

Write-Host ""
Write-Host "Comparacao mesh-reference instalada."
Write-Host "Python: $VenvPython"
Write-Host ""
Write-Host "Teste rapido:"
Write-Host ('& "' + $VenvPython + '" -m tools.blender_agent.compare_cli --help')
