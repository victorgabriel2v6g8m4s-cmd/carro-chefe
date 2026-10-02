param(
    [string]$PythonExe = "python",
    [switch]$OpenImages
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.." )).Path
Set-Location $RepoRoot
$RecipePath = Join-Path $RepoRoot "tools\blender_agent\recipes\carro-chefe-baguette-base-v1.json"

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

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$objectName = "CC_Recipe_Smoke_$suffix"
$previousStageId = $null
$createdObject = $false
$runResult = $null

try {
    Write-Host "1/7 bridge status"
    $status = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "status")
    $previousStageId = $status.result.active_stage_id

    Write-Host "2/7 validate recipe locally"
    $validated = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "recipe-validate", $RecipePath)
    if (-not $validated.ok -or -not $validated.result.ok) { throw "Recipe validation failed." }

    Write-Host "3/7 plan compact variant with isolated object override"
    $plan = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "recipe-plan", $RecipePath,
        "--variant", "compact",
        "--set", "object_name=$objectName"
    )
    if (-not $plan.ok -or $plan.result.plan.parameters.object_name -ne $objectName) {
        throw "Recipe plan did not apply object_name override."
    }

    Write-Host "4/7 execute recipe"
    $run = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "recipe-run", $RecipePath,
        "--variant", "compact",
        "--set", "object_name=$objectName",
        "--restore-stage"
    )
    $runResult = $run.result
    if (-not $run.ok -or -not $runResult.passed) {
        throw "Recipe execution failed: $($runResult.fatal_error)"
    }
    $createdObject = $true

    Write-Host "5/7 verify receipt and criteria"
    if (-not (Test-Path -LiteralPath $runResult.receipt)) { throw "Recipe receipt missing: $($runResult.receipt)" }
    if (-not $runResult.criteria_passed) { throw "Recipe criteria did not pass." }
    if (@($runResult.captures).Count -lt 4) { throw "Recipe generated fewer than four captures." }
    if ($previousStageId -and $runResult.restored_stage_id -ne $previousStageId) {
        throw "Recipe did not restore previous history stage."
    }

    Write-Host "6/7 verify recipe status"
    $recipeStatus = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "recipe-status")
    if ($recipeStatus.result.state -ne "finished" -or -not $recipeStatus.result.passed) {
        throw "Recipe status did not report successful finish."
    }

    Write-Host "7/7 verify recipe history"
    $history = Invoke-JsonCommand @(
        "-m", "tools.blender_agent.client", "history-search",
        "--stage", $runResult.stage_id,
        "--action", "recipe.step",
        "--success", "success"
    )
    if (-not $history.ok -or @($history.result.matches).Count -lt 5) {
        throw "Expected recipe.step events were not found in history."
    }
}
finally {
    try {
        $deleted = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "object-delete", $objectName)
        $createdObject = $false
    }
    catch {
        if ($createdObject) {
            Write-Warning "Could not remove recipe smoke object: $($_.Exception.Message)"
        }
    }

    if ($previousStageId) {
        try {
            $restore = Invoke-JsonCommand @("-m", "tools.blender_agent.client", "history-use", $previousStageId)
        }
        catch {
            Write-Warning "Could not restore previous history stage: $($_.Exception.Message)"
        }
    }
}

Write-Host ""
Write-Host "Blender Agent Recipe V0.4 smoke test OK."
Write-Host "Recipe:      $($runResult.recipe_id)@$($runResult.recipe_version)"
Write-Host "Object:      $objectName (temporary; removed)"
Write-Host "Stage:       $($runResult.stage_id)"
Write-Host "Plan SHA:    $($runResult.plan_hash)"
Write-Host "Receipt:     $($runResult.receipt)"
Write-Host "Receipt SHA: $($runResult.receipt_hash)"
Write-Host "Captures:    $(@($runResult.captures).Count)"
Write-Host "Criteria:    $($runResult.criteria_passed)"
Write-Host "Stage restored: $($runResult.restored_stage_id)"

if ($OpenImages) {
    $images = @($runResult.captures | Where-Object { $_.path -and (Test-Path -LiteralPath $_.path) })
    if ($images.Count -gt 0) { Start-Process -FilePath $images[0].path }
    if ($images.Count -gt 1) {
        Start-Sleep -Milliseconds 150
        Start-Process -FilePath $images[$images.Count - 1].path
    }
}
