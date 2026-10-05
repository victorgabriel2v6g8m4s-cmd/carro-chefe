param(
    [string]$PythonExe = "python",
    [switch]$OpenImages
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

Write-Host "Blender Agent V0.5 iterative smoke test"
Write-Host ""

& $PythonExe -m tools.blender_agent.iteration_smoke
if ($LASTEXITCODE -ne 0) {
    throw "V0.5 iterative smoke failed with exit code $LASTEXITCODE."
}

if ($OpenImages) {
    $HistoryRoot = Join-Path $RepoRoot ".runtime\blender-agent\history"
    if (Test-Path -LiteralPath $HistoryRoot) {
        $images = @(
            Get-ChildItem -LiteralPath $HistoryRoot -Recurse -File -Filter "iter-*.png" -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                Select-Object -First 4
        )
        foreach ($image in ($images | Sort-Object LastWriteTime)) {
            Start-Process -FilePath $image.FullName
            Start-Sleep -Milliseconds 120
        }
    }
}
