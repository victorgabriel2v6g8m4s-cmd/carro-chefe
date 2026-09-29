param(
    [string]$PythonExe = "python",
    [string]$CaptureName = "smoke-v02.png",
    [switch]$OpenImage
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.." )).Path
Set-Location $RepoRoot

function Invoke-JsonCommand {
    param([string[]]$Arguments)

    $output = & $PythonExe @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Comando falhou: $PythonExe $($Arguments -join ' ')`n$output"
    }
    $text = ($output | Out-String).Trim()
    try {
        return $text | ConvertFrom-Json
    }
    catch {
        throw "Saída não é JSON válido: $text"
    }
}

Write-Host "1/5 status"
$status = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "status")
if (-not $status.ok) { throw "Bridge não respondeu." }

Write-Host "2/5 viewport describe"
$view = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "viewport-describe")
if (-not $view.ok) { throw "Viewport não respondeu." }

Write-Host "3/5 preset THREE_QUARTER"
$preset = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "viewport-view", "THREE_QUARTER")
if (-not $preset.ok) { throw "Falha ao definir preset." }

Start-Sleep -Milliseconds 350

Write-Host "4/5 capture"
$capture = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "viewport-capture", "--name", $CaptureName)
if (-not $capture.ok) { throw "Falha ao capturar viewport." }

$imagePath = $capture.result.path
$receiptPath = $capture.result.receipt

if (-not (Test-Path -LiteralPath $imagePath)) {
    throw "PNG não encontrado: $imagePath"
}
if ((Get-Item -LiteralPath $imagePath).Length -le 0) {
    throw "PNG vazio: $imagePath"
}
if (-not (Test-Path -LiteralPath $receiptPath)) {
    throw "Receipt não encontrado: $receiptPath"
}

Write-Host "5/5 optional MCP adapter"
$mcpPython = Join-Path $RepoRoot ".runtime\blender-agent\mcp-venv\Scripts\python.exe"
if (Test-Path -LiteralPath $mcpPython) {
    & $mcpPython -c "import tools.blender_agent.mcp_server; print('MCP adapter OK')"
    if ($LASTEXITCODE -ne 0) {
        throw "MCP adapter não importou."
    }
}
else {
    Write-Host "MCP venv ainda não instalado; etapa ignorada."
}

Write-Host ""
Write-Host "Blender Agent V0.2 smoke test OK."
Write-Host "Imagem:  $imagePath"
Write-Host "Receipt: $receiptPath"
Write-Host "SHA-256: $($capture.result.sha256)"

if ($OpenImage) {
    Start-Process -FilePath $imagePath
}
