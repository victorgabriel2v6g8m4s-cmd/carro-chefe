param(
    [Parameter(Mandatory = $true)][string]$ImagePath,
    [string]$PythonExe = "python",
    [switch]$OpenImages
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

function Invoke-JsonCommand {
    param([string[]]$Arguments)

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $PythonExe @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    $text = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine).Trim()
    if ($exitCode -ne 0) {
        throw "Command failed (exit $exitCode): $PythonExe $($Arguments -join ' ')`n$text"
    }
    try { return $text | ConvertFrom-Json }
    catch { throw "Output is not valid JSON: $text" }
}

if (-not (Test-Path -LiteralPath $ImagePath)) {
    throw "Image not found: $ImagePath"
}
$ImagePath = (Resolve-Path -LiteralPath $ImagePath).Path
$ExpectedRuntimeProfile = (& $PythonExe -c "from tools.blender_agent.runtime_compat import RUNTIME_PROFILE; print(RUNTIME_PROFILE)").Trim()
if ($LASTEXITCODE -ne 0 -or -not $ExpectedRuntimeProfile) {
    throw "Could not read runtime profile from runtime_compat.py"
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$referenceName = "CC_REF_Smoke_$suffix"
$meshName = "CC_Texture_Smoke_$suffix"
$previousStageId = $null
$smokeStageId = $null
$referenceCreated = $false
$meshCreated = $false
$referenceCapture = $null
$textureCapture = $null

try {
    Write-Host "1/7 bridge status"
    $status = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "status")
    if ($status.result.runtime_profile -ne $ExpectedRuntimeProfile) {
        throw "Runtime mismatch. Expected=$ExpectedRuntimeProfile Observed=$($status.result.runtime_profile). Restart Blender Agent."
    }
    $previousStageId = $status.result.active_stage_id

    Write-Host "2/7 create image smoke stage"
    $stage = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "history-start",
        "Image actions smoke", "--tag", "smoke", "--tag", "image"
    )
    $smokeStageId = $stage.result.stage_id

    Write-Host "3/7 add reference image"
    $reference = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.image_cli", "reference-add", $ImagePath,
        "--name", $referenceName,
        "--display-size", "5",
        "--opacity", "0.6",
        "--depth", "BACK"
    )
    if (-not $reference.ok -or $reference.result.object -ne $referenceName) {
        throw "Reference image action failed."
    }
    $referenceCreated = $true

    Write-Host "4/7 capture reference and remove it"
    $capture = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "viewport-capture",
        "--name", "image-smoke-reference.png"
    )
    $referenceCapture = $capture.result.path
    if (-not (Test-Path -LiteralPath $referenceCapture)) {
        throw "Reference capture missing: $referenceCapture"
    }
    $deletedReference = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "object-delete", $referenceName
    )
    $referenceCreated = $false

    Write-Host "5/7 create UV sphere and assign image texture"
    $created = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "object-add-primitive",
        "uv_sphere", "--name", $meshName,
        "--location", "0", "0", "0"
    )
    $meshCreated = $true
    $texture = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.image_cli", "material-texture",
        $meshName, $ImagePath,
        "--material-name", "CC_Image_Smoke_Material"
    )
    if (-not $texture.ok -or -not $texture.result.has_uv) {
        throw "Image texture action failed or UV sphere unexpectedly has no UV map."
    }

    Write-Host "6/7 capture textured mesh"
    $shading = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "viewport-shading", "MATERIAL"
    )
    $view = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "viewport-view", "THREE_QUARTER"
    )
    Start-Sleep -Milliseconds 400
    $after = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "viewport-capture",
        "--name", "image-smoke-texture.png"
    )
    $textureCapture = $after.result.path
    if (-not (Test-Path -LiteralPath $textureCapture)) {
        throw "Texture capture missing: $textureCapture"
    }

    Write-Host "7/7 verify auto-history"
    $historyRef = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "history-search",
        "--action", "reference.image.add", "--success", "success"
    )
    $historyTex = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "history-search",
        "--action", "material.image_texture", "--success", "success"
    )
    if (@($historyRef.result.matches).Count -lt 1 -or @($historyTex.result.matches).Count -lt 1) {
        throw "Image actions were not found in auto-history."
    }
}
finally {
    if ($referenceCreated) {
        try { $null = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "object-delete", $referenceName) }
        catch { Write-Warning "Could not remove reference object: $($_.Exception.Message)" }
    }
    if ($meshCreated) {
        try { $null = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "object-delete", $meshName) }
        catch { Write-Warning "Could not remove texture smoke mesh: $($_.Exception.Message)" }
    }
    if ($previousStageId -and $smokeStageId -and $previousStageId -ne $smokeStageId) {
        try { $null = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "history-use", $previousStageId) }
        catch { Write-Warning "Could not restore previous history stage: $($_.Exception.Message)" }
    }
}

Write-Host ""
Write-Host "Blender Agent image smoke test OK."
Write-Host "Runtime:   $ExpectedRuntimeProfile"
Write-Host "Reference: $referenceCapture"
Write-Host "Texture:   $textureCapture"

if ($OpenImages) {
    Start-Process -FilePath $referenceCapture
    Start-Sleep -Milliseconds 150
    Start-Process -FilePath $textureCapture
}
