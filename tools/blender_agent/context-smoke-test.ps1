param(
    [string]$PythonExe = "python",
    [switch]$OpenImages
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.." )).Path
Set-Location $RepoRoot

function Invoke-JsonCommand {
    param([string[]]$Arguments)
    $output = & $PythonExe @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $PythonExe $($Arguments -join ' ')`n$output"
    }
    $text = ($output | Out-String).Trim()
    try { return $text | ConvertFrom-Json }
    catch { throw "Output is not valid JSON: $text" }
}

Write-Host "1/7 bridge status"
$status = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "status")
if (-not $status.ok) { throw "Bridge unavailable." }

Write-Host "2/7 workspace list"
$workspaceList = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "workspace-list")
$names = @($workspaceList.result.workspaces | Select-Object -First 2 | ForEach-Object { $_.name })
if ($names.Count -lt 1) { throw "No Blender workspaces found." }

Write-Host "3/7 workspace describe"
$describeArgs = @("-m", "tools.blender_agent.client", "workspace-describe")
foreach ($name in $names) { $describeArgs += @("--name", $name) }
$description = Invoke-JsonCommand $describeArgs
if (-not $description.ok) { throw "Workspace description failed." }

Write-Host "4/7 create history stage"
$stage = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "history-start", "Context smoke test", "--tag", "smoke", "--tag", "context")
$stageId = $stage.result.stage_id
if (-not $stageId) { throw "Stage id missing." }

Write-Host "5/7 capture multiple workspaces"
$captureArgs = @("-m", "tools.blender_agent.client", "workspace-capture-set", "--label", "context-smoke", "--target", "WINDOW")
foreach ($name in $names) { $captureArgs += @("--workspace", $name) }
$captures = Invoke-JsonCommand $captureArgs
if (-not $captures.ok -or $captures.result.success_count -lt 1) { throw "Workspace capture failed." }

Write-Host "6/7 search auto-history"
$search = Invoke-JsonCommand @(
    "-m", "tools.blender_agent.client", "history-search",
    "workspace.capture_set",
    "--stage", $stageId,
    "--action", "workspace.capture_set",
    "--attachment", "success"
)
if (-not $search.ok -or $search.result.matches.Count -lt 1) { throw "History search did not find capture event." }

Write-Host "7/7 stage context"
$context = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "history-show", $stageId, "--recent", "10")
if (-not $context.ok) { throw "Stage context failed." }

Write-Host ""
Write-Host "Blender Agent context/history smoke test OK."
Write-Host "Stage: $stageId"
Write-Host "Previous: $($context.result.metadata.previous_stage_id)"
Write-Host "Events: $($context.result.metadata.history.total_events)"
Write-Host "Captures: $($captures.result.success_count)"
Write-Host "Manifest: $($captures.result.manifest)"

if ($OpenImages) {
    foreach ($item in $captures.result.captures) {
        if ($item.ok -and (Test-Path -LiteralPath $item.path)) {
            Start-Process -FilePath $item.path
        }
    }
}
