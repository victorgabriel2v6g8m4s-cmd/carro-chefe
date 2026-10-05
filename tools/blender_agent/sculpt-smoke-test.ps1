param(
    [string]$PythonExe = "python",
    [switch]$OpenImages
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.." )).Path
$SessionFile = Join-Path $RepoRoot ".runtime\blender-agent\session\bridge.json"
$CompatFile = Join-Path $PSScriptRoot "runtime_compat.py"
$EntryFile = Join-Path $PSScriptRoot "blender_bridge_v05_entry.py"
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

function Assert-BridgeRuntimeCurrent {
    if (-not (Test-Path -LiteralPath $SessionFile)) {
        throw "Bridge session not found. Start Blender Agent with tools/blender_agent/start.ps1 before this smoke test."
    }
    if (-not (Test-Path -LiteralPath $CompatFile)) {
        throw "runtime_compat.py is missing. Pull the latest feature/blender-agent-bridge before testing Sculpt."
    }
    if (-not (Test-Path -LiteralPath $EntryFile)) {
        throw "blender_bridge_v05_entry.py is missing. Pull the latest feature/blender-agent-bridge before testing Sculpt."
    }

    $entryText = Get-Content -LiteralPath $EntryFile -Raw
    if (-not $entryText.Contains("runtime_compat.install(core, v05)")) {
        throw "Local V0.5 entrypoint does not install runtime_compat. Pull the latest feature/blender-agent-bridge."
    }

    try {
        $session = Get-Content -LiteralPath $SessionFile -Raw | ConvertFrom-Json
        $bridgeProcess = Get-Process -Id ([int]$session.pid) -ErrorAction Stop
    }
    catch {
        throw "Bridge session is stale or its PID is no longer running. Restart Blender Agent with tools/blender_agent/start.ps1."
    }

    $sourceTimes = @(
        (Get-Item -LiteralPath $CompatFile).LastWriteTimeUtc,
        (Get-Item -LiteralPath $EntryFile).LastWriteTimeUtc
    )
    $latestSourceWrite = ($sourceTimes | Sort-Object -Descending | Select-Object -First 1)
    $processStarted = $bridgeProcess.StartTime.ToUniversalTime()

    if ($processStarted -lt $latestSourceWrite) {
        throw @"
The running Blender bridge predates the current compatibility fix.
PID: $($session.pid)
Bridge started (UTC): $($processStarted.ToString("o"))
Runtime source updated (UTC): $($latestSourceWrite.ToString("o"))

Save/close the current Blender window, then run:
git pull --ff-only origin feature/blender-agent-bridge
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1

Only after the new bridge reports ready, rerun this Sculpt smoke test.
"@
    }
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$objectName = "CC_Sculpt_Smoke_$suffix"
$createdObject = $false
$sculptPrepared = $false
$finish = $null
$beforePath = $null
$afterPath = $null
$checkpointPath = $null
$beforeHash = $null
$afterHash = $null
$previousStageId = $null
$smokeStageId = $null

try {
    Write-Host "1/7 bridge status"
    Assert-BridgeRuntimeCurrent
    $status = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "status")
    if (-not $status.ok) { throw "Bridge unavailable." }
    $previousStageId = $status.result.active_stage_id

    Write-Host "2/7 create history stage"
    $stage = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "history-start",
        "Sculpt smoke test", "--tag", "smoke", "--tag", "sculpt"
    )
    if (-not $stage.ok) { throw "Could not create sculpt smoke stage." }
    $smokeStageId = $stage.result.stage_id

    Write-Host "3/7 create temporary UV sphere"
    $created = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "object-add-primitive",
        "uv_sphere", "--name", $objectName,
        "--location", "0", "0", "0"
    )
    if (-not $created.ok) { throw "Could not create temporary sphere." }
    $createdObject = $true

    Write-Host "4/7 prepare Sculpt session"
    $prepare = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "sculpt-prepare",
        "--name", $objectName,
        "--workspace", "Sculpting",
        "--brush", "DRAW",
        "--radius", "85",
        "--strength", "0.55"
    )
    if (-not $prepare.ok -or $prepare.result.mode -ne "SCULPT") {
        throw "Sculpt prepare failed."
    }
    $sculptPrepared = $true

    Start-Sleep -Milliseconds 300

    Write-Host "5/7 apply checkpointed stroke"
    $stroke = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "sculpt-stroke",
        "--point", "0.48", "0.50",
        "--point", "0.50", "0.50",
        "--point", "0.52", "0.50",
        "--point", "0.54", "0.50",
        "--brush", "DRAW",
        "--radius", "85",
        "--strength", "0.55",
        "--label", "smoke-draw"
    )
    if (-not $stroke.ok) { throw "Sculpt stroke failed." }
    $beforePath = $stroke.result.before_capture.path
    $checkpointPath = $stroke.result.checkpoint
    if (-not (Test-Path -LiteralPath $beforePath)) { throw "Before capture missing: $beforePath" }
    if (-not (Test-Path -LiteralPath $checkpointPath)) { throw "Checkpoint missing: $checkpointPath" }

    Start-Sleep -Milliseconds 400

    Write-Host "6/7 capture and compare post-stroke viewport"
    $after = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "viewport-capture",
        "--name", "sculpt-smoke-after.png"
    )
    $afterPath = $after.result.path
    if (-not (Test-Path -LiteralPath $afterPath)) { throw "After capture missing: $afterPath" }

    $beforeHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $beforePath).Hash
    $afterHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $afterPath).Hash
    if ($beforeHash -eq $afterHash) {
        throw "Before and after Sculpt captures are identical. Stroke did not visibly update the viewport."
    }

    Write-Host "7/7 verify sculpt history"
    $search = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "history-search",
        "--action", "sculpt.stroke", "--attachment", "success"
    )
    if (-not $search.ok -or @($search.result.matches).Count -lt 1) {
        throw "Sculpt stroke was not found in auto-history."
    }
}
finally {
    if ($sculptPrepared) {
        try {
            $finish = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "sculpt-finish")
        }
        catch {
            Write-Warning "Could not finish Sculpt session during cleanup: $($_.Exception.Message)"
        }
    }

    if ($createdObject) {
        try {
            $deleted = Invoke-JsonCommand @(
                "-m", "tools.blender_agent.client", "object-delete", $objectName
            )
        }
        catch {
            Write-Warning "Could not remove temporary sphere during cleanup: $($_.Exception.Message)"
        }
    }

    if ($previousStageId -and $smokeStageId -and $previousStageId -ne $smokeStageId) {
        try {
            $restoredStage = Invoke-JsonCommand @(
                "-m", "tools.blender_agent.client", "history-use", $previousStageId
            )
        }
        catch {
            Write-Warning "Could not restore previous history stage: $($_.Exception.Message)"
        }
    }
}

if (-not $finish -or -not $finish.result.restored_original_workspace) {
    throw "Sculpt finish did not restore original workspace."
}

Write-Host ""
Write-Host "Blender Agent Sculpt V0.3 smoke test OK."
Write-Host "Object:     $objectName (temporary; removed)"
Write-Host "Before:     $beforePath"
Write-Host "After:      $afterPath"
Write-Host "Checkpoint: $checkpointPath"
Write-Host "Before SHA: $beforeHash"
Write-Host "After SHA:  $afterHash"
Write-Host "Workspace restored: $($finish.result.restored_original_workspace)"

if ($OpenImages) {
    Start-Process -FilePath $beforePath
    Start-Sleep -Milliseconds 150
    Start-Process -FilePath $afterPath
}
