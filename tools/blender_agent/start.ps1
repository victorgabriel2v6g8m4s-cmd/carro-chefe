param(
    [string]$BlenderExe = "",
    [string]$BlendFile = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Bridge = Join-Path $PSScriptRoot "blender_bridge.py"

if (-not $BlenderExe) {
    $cmd = Get-Command blender -ErrorAction SilentlyContinue
    if ($cmd) {
        $BlenderExe = $cmd.Source
    }
}

if (-not $BlenderExe) {
    $candidates = Get-ChildItem "C:\Program Files\Blender Foundation" -Filter blender.exe -Recurse -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending
    if ($candidates.Count -gt 0) {
        $BlenderExe = $candidates[0].FullName
    }
}

if (-not $BlenderExe -or -not (Test-Path $BlenderExe)) {
    throw "Blender não encontrado. Passe -BlenderExe 'C:\...\blender.exe'."
}

$argsList = @("--enable-event-simulate")
if ($BlendFile) {
    $resolvedBlend = (Resolve-Path $BlendFile).Path
    $argsList += $resolvedBlend
}
$argsList += @("--python", $Bridge)

Write-Host "Iniciando Blender Agent..."
Write-Host "Blender: $BlenderExe"
Write-Host "Bridge:  $Bridge"
Start-Process -FilePath $BlenderExe -WorkingDirectory $RepoRoot -ArgumentList $argsList
