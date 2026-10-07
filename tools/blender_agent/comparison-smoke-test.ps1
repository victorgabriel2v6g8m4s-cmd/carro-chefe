param(
    [string]$PythonExe = "python",
    [string]$ImagePath = ".runtime\blender-agent\assets\referencia.jpg",
    [switch]$OpenImages
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ComparePython = Join-Path $RepoRoot ".runtime\blender-agent\compare-venv\Scripts\python.exe"
Set-Location $RepoRoot

if (-not (Test-Path -LiteralPath $ComparePython)) {
    throw "Comparison environment not found: $ComparePython`nRun: blenagent install-compare"
}
if (-not (Test-Path -LiteralPath $ImagePath)) {
    throw "Reference image not found: $ImagePath"
}
$ImagePath = (Resolve-Path -LiteralPath $ImagePath).Path

function Invoke-JsonCommand {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $Executable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $text = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine).Trim()
    if ($exitCode -ne 0) {
        throw "Command failed (exit $exitCode): $Executable $($Arguments -join ' ')`n$text"
    }
    try {
        return $text | ConvertFrom-Json
    }
    catch {
        throw "Command did not return valid JSON: $Executable $($Arguments -join ' ')`n$text"
    }
}

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$objectName = "CC_Compare_Smoke_$timestamp"
$outputRelative = ".runtime\blender-agent\exports\comparison-smoke-$timestamp.png"
$outputPath = Join-Path $RepoRoot $outputRelative
$receiptPath = [System.IO.Path]::ChangeExtension($outputPath, ".receipt.json")
$created = $false

try {
    Write-Host "1/6 bridge status"
    $status = Invoke-JsonCommand -Executable $PythonExe -Arguments @(
        "-m", "tools.blender_agent.client", "status"
    )
    $runtimeProfile = [string]$status.result.runtime_profile
    if (-not $runtimeProfile.EndsWith(".5")) {
        throw "Expected comparison runtime .5, got: $runtimeProfile. Run: blenagent restart"
    }

    Write-Host "2/6 create comparison smoke stage"
    $stage = Invoke-JsonCommand -Executable $PythonExe -Arguments @(
        "-m", "tools.blender_agent.client", "history-start", "Mesh reference comparison smoke", "--tag", "comparison-smoke"
    )

    Write-Host "3/6 create scene mesh"
    $createdResult = Invoke-JsonCommand -Executable $PythonExe -Arguments @(
        "-m", "tools.blender_agent.client", "object-add-primitive", "cube", "--name", $objectName, "--scale", "1.0", "1.0", "1.4"
    )
    $created = $true

    Write-Host "4/6 compare scene mesh against reference"
    $compare = Invoke-JsonCommand -Executable $ComparePython -Arguments @(
        "-m", "tools.blender_agent.compare_cli", "compose",
        "--reference", $ImagePath,
        "--source", "scene",
        "--object", $objectName,
        "--view", "FRONT",
        "--align", "manual",
        "--opacity", "50",
        "--lines", "true",
        "--border", "true",
        "--output", $outputRelative,
        "--force",
        "--json"
    )

    if (-not $compare.ok) {
        throw "Comparison returned ok=false."
    }
    if (-not $compare.source.context_unchanged) {
        throw "mesh.comparison_snapshot changed Blender context unexpectedly."
    }

    Write-Host "5/6 verify output and receipt"
    if (-not (Test-Path -LiteralPath $outputPath)) {
        throw "Comparison PNG not found: $outputPath"
    }
    if (-not (Test-Path -LiteralPath $receiptPath)) {
        throw "Comparison receipt not found: $receiptPath"
    }
    $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if ($receipt.kind -ne "visual-comparison-not-metrology") {
        throw "Unexpected receipt kind: $($receipt.kind)"
    }
    if ($receipt.source.type -ne "scene") {
        throw "Receipt source is not scene: $($receipt.source.type)"
    }
    if (-not $receipt.output.sha256 -or $receipt.output.sha256.Length -ne 64) {
        throw "Receipt output SHA-256 is missing or invalid."
    }

    Write-Host "6/6 verify history attachment references"
    $history = Invoke-JsonCommand -Executable $PythonExe -Arguments @(
        "-m", "tools.blender_agent.client", "history-show", "--recent", "20"
    )
    $comparisonEvents = @($history.result.recent_events | Where-Object { $_.action -eq "mesh.reference.compare" -and $_.ok })
    if ($comparisonEvents.Count -lt 1) {
        throw "No successful mesh.reference.compare event found in active history stage."
    }

    Write-Host ""
    Write-Host "Blender Agent mesh-reference comparison smoke test OK."
    Write-Host "Runtime: $runtimeProfile"
    Write-Host "Output:  $outputPath"
    Write-Host "Receipt: $receiptPath"

    if ($OpenImages) {
        Start-Process -FilePath $outputPath | Out-Null
    }
}
finally {
    if ($created) {
        try {
            & $PythonExe -m tools.blender_agent.client object-delete $objectName 2>$null | Out-Null
        }
        catch {
            Write-Warning "Could not clean comparison smoke object: $objectName"
        }
    }
}
