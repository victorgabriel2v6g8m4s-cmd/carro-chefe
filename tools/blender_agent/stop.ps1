param(
    [string]$PythonExe = "python",
    [ValidateSet("checkpoint", "save", "discard")]
    [string]$Mode = "checkpoint",
    [string]$Label = "shutdown-recovery",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SessionFile = Join-Path $RepoRoot ".runtime\blender-agent\session\bridge.json"
Set-Location $RepoRoot

if (-not (Test-Path -LiteralPath $SessionFile)) {
    throw "Bridge session not found: $SessionFile"
}

try {
    $session = Get-Content -LiteralPath $SessionFile -Raw | ConvertFrom-Json
    $pidValue = [int]$session.pid
}
catch {
    throw "Bridge session is invalid: $SessionFile"
}

if ($Force) {
    Write-Warning "Force mode terminates Blender immediately and can lose changes not already saved/checkpointed."
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $pidValue -Force
        Write-Host "Blender process $pidValue terminated."
    }
    else {
        Write-Host "Blender process $pidValue is already stopped."
    }
    Remove-Item -LiteralPath $SessionFile -Force -ErrorAction SilentlyContinue
    exit 0
}

# Windows PowerShell 5.1 can strip the quotes inside a JSON argument when it
# invokes a native executable. Do not send JSON through argv here. Pass only
# scalar values and build the params dict inside Python instead.
$pythonCode = "import json,sys; from tools.blender_agent.client import call; print(json.dumps(call('app.quit', {'mode': sys.argv[1], 'label': sys.argv[2]}), ensure_ascii=True))"
$previousPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    $output = & $PythonExe -c $pythonCode $Mode $Label 2>&1
    $exitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousPreference
}

$text = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine).Trim()
if ($exitCode -ne 0) {
    throw @"
Modal-safe shutdown failed:
$text

If this is an older bridge that predates app.quit, first try:
python -m tools.blender_agent.client ui-dismiss

If the current session is disposable, or you already created a recovery checkpoint, force-stop it with:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/stop.ps1 -Force
"@
}

try {
    $response = $text | ConvertFrom-Json
}
catch {
    throw "Shutdown response is not valid JSON: $text"
}

if (-not $response.ok) {
    throw "Blender Agent rejected shutdown: $text"
}

Write-Host "Blender shutdown scheduled."
Write-Host "Mode:       $($response.result.mode)"
if ($response.result.checkpoint) {
    Write-Host "Checkpoint: $($response.result.checkpoint)"
}
if ($response.result.saved_file) {
    Write-Host "Saved:      $($response.result.saved_file)"
}
Write-Host "PID:        $pidValue"

$deadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $deadline) {
    if (-not (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
        Remove-Item -LiteralPath $SessionFile -Force -ErrorAction SilentlyContinue
        Write-Host "Blender closed cleanly."
        exit 0
    }
    Start-Sleep -Milliseconds 250
}

Write-Warning "Blender accepted app.quit but process $pidValue is still running after 10 seconds."
Write-Host "If necessary, run:"
Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/stop.ps1 -Force"
exit 1
