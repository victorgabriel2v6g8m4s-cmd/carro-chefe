param(
    [Parameter(Position = 0)]
    [string]$Command = "help",
    [string]$PythonExe = "python",
    [string]$BlenderExe = "",
    [string]$BlendFile = "",
    [ValidateRange(1, 60)][int]$MaxRetry = 9,
    [ValidateRange(1, 300)][int]$RetrySeconds = 10,
    [ValidateSet("checkpoint", "save", "discard")]
    [string]$Mode = "checkpoint",
    [switch]$Force,
    [string]$ImagePath = "",
    [switch]$OpenImages,
    [string]$CaptureName = "smoke-v02.png"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SessionFile = Join-Path $RepoRoot ".runtime\blender-agent\session\bridge.json"
Set-Location $RepoRoot

function Invoke-AgentPowerShell {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptName,
        [string[]]$Arguments = @()
    )

    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "$ScriptName failed with exit code $exitCode."
    }
}

function Get-SessionState {
    if (-not (Test-Path -LiteralPath $SessionFile)) {
        return [pscustomobject]@{
            Exists = $false
            Valid = $false
            Pid = $null
            ProcessAlive = $false
            BlenderProcess = $false
            Error = $null
        }
    }

    try {
        $session = Get-Content -LiteralPath $SessionFile -Raw | ConvertFrom-Json
        $pidValue = [int]$session.pid
    }
    catch {
        return [pscustomobject]@{
            Exists = $true
            Valid = $false
            Pid = $null
            ProcessAlive = $false
            BlenderProcess = $false
            Error = "bridge.json is not valid session JSON"
        }
    }

    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    $isBlender = $false
    if ($process) {
        $isBlender = $process.ProcessName -like "blender*"
    }

    return [pscustomobject]@{
        Exists = $true
        Valid = $true
        Pid = $pidValue
        ProcessAlive = [bool]$process
        BlenderProcess = [bool]$isBlender
        Error = $null
    }
}

function Test-BridgeHealth {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $PythonExe -m tools.blender_agent.client status 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $text = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine).Trim()
    return [pscustomobject]@{
        Healthy = ($exitCode -eq 0)
        ExitCode = $exitCode
        Text = $text
    }
}

function Remove-StaleSession {
    if (Test-Path -LiteralPath $SessionFile) {
        Remove-Item -LiteralPath $SessionFile -Force
        Write-Host "Removed stale Blender Agent session metadata."
    }
}

function Start-Agent {
    $state = Get-SessionState
    if ($state.Exists) {
        $health = Test-BridgeHealth
        if ($health.Healthy) {
            throw "Blender Agent is already running. Use 'blenagent restart' to restart it."
        }

        if ($state.Valid -and $state.ProcessAlive -and $state.BlenderProcess) {
            throw "A Blender process (PID $($state.Pid)) exists but its bridge is unreachable. Use 'blenagent restart -Force' only if that Blender session can be terminated safely."
        }

        if (-not $state.Valid) {
            throw "Blender Agent session metadata is invalid. Inspect $SessionFile before starting another Blender process."
        }

        Remove-StaleSession
    }

    $arguments = @(
        "-MaxRetry", [string]$MaxRetry,
        "-RetrySeconds", [string]$RetrySeconds
    )
    if ($BlenderExe) {
        $arguments += @("-BlenderExe", $BlenderExe)
    }
    if ($BlendFile) {
        $arguments += @("-BlendFile", $BlendFile)
    }
    Invoke-AgentPowerShell -ScriptName "start.ps1" -Arguments $arguments
}

function Stop-Agent {
    $arguments = @("-PythonExe", $PythonExe, "-Mode", $Mode)
    if ($Force) {
        $arguments += "-Force"
    }
    Invoke-AgentPowerShell -ScriptName "stop.ps1" -Arguments $arguments
}

function Restart-Agent {
    $state = Get-SessionState
    if (-not $state.Exists) {
        Write-Host "No Blender Agent session found; starting a new one."
        Start-Agent
        return
    }

    $health = Test-BridgeHealth
    if ($health.Healthy) {
        Write-Host "Stopping Blender Agent..."
        Stop-Agent
        Write-Host "Starting Blender Agent..."
        Start-Agent
        return
    }

    if ($state.Valid -and (-not $state.ProcessAlive -or -not $state.BlenderProcess)) {
        Write-Host "Bridge session is stale; cleaning it before restart."
        Remove-StaleSession
        Write-Host "Starting Blender Agent..."
        Start-Agent
        return
    }

    if ($state.Valid -and $state.ProcessAlive -and $state.BlenderProcess) {
        if (-not $Force) {
            Write-Host "Blender Agent bridge is unreachable, but Blender PID $($state.Pid) is still running."
            Write-Host "For safety, automatic restart will not kill that process."
            Write-Host "If the current Blender session is disposable or already checkpointed, run:"
            Write-Host "  blenagent restart -Force"
            exit 2
        }

        Write-Warning "Forcing restart of unreachable Blender PID $($state.Pid). Unsaved changes can be lost."
        Stop-Agent
        Write-Host "Starting Blender Agent..."
        Start-Agent
        return
    }

    Write-Host "Blender Agent session metadata is invalid: $SessionFile"
    Write-Host "Automatic restart stopped to avoid launching a duplicate Blender process."
    exit 2
}

function Show-AgentStatus {
    $health = Test-BridgeHealth
    if ($health.Healthy) {
        Write-Output $health.Text
        return
    }

    $state = Get-SessionState
    Write-Host "Blender Agent: offline"
    if (-not $state.Exists) {
        Write-Host "Session: none"
        Write-Host "Next:    blenagent start"
    }
    elseif (-not $state.Valid) {
        Write-Host "Session: invalid metadata"
        Write-Host "File:    $SessionFile"
    }
    elseif (-not $state.ProcessAlive -or -not $state.BlenderProcess) {
        Write-Host "Session: stale (recorded PID $($state.Pid) is not a live Blender process)"
        Write-Host "Next:    blenagent restart"
    }
    else {
        Write-Host "Session: Blender PID $($state.Pid) is alive, but bridge is unreachable"
        Write-Host "Next:    blenagent restart -Force  # only if safe to terminate that Blender session"
    }
    if ($health.Text) {
        Write-Host "Detail:  $($health.Text -replace '[\r\n]+', ' ')"
    }
    exit 1
}

function Install-BlenagentCommand {
    if (-not $env:LOCALAPPDATA) {
        throw "LOCALAPPDATA is not available; cannot install user command."
    }

    $binDir = Join-Path $env:LOCALAPPDATA "CarroChefe\bin"
    $shimPath = Join-Path $binDir "blenagent.cmd"
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null

    $shim = @'
@echo off
if "%CARRO_CHEFE_REPO%"=="" (
  echo CARRO_CHEFE_REPO is not configured. Run .\blenagent.cmd install from the repository.
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CARRO_CHEFE_REPO%\tools\blender_agent\blenagent.ps1" %*
exit /b %ERRORLEVEL%
'@
    [System.IO.File]::WriteAllText($shimPath, $shim, [System.Text.Encoding]::ASCII)

    [Environment]::SetEnvironmentVariable("CARRO_CHEFE_REPO", $RepoRoot, "User")

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $entries = @()
    if (-not [string]::IsNullOrWhiteSpace($userPath)) {
        $entries = @($userPath -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    $normalizedBin = $binDir.TrimEnd([char]'\')
    $alreadyPresent = $false
    foreach ($entry in $entries) {
        if ($entry.Trim().TrimEnd([char]'\') -ieq $normalizedBin) {
            $alreadyPresent = $true
            break
        }
    }
    if (-not $alreadyPresent) {
        $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) {
            $binDir
        }
        else {
            $userPath.TrimEnd(";") + ";" + $binDir
        }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    }

    Write-Host "blenagent installed for the current Windows user."
    Write-Host "Command: $shimPath"
    Write-Host "Repository: $RepoRoot"
    Write-Host ""
    Write-Host "Open a new PowerShell window, then use:"
    Write-Host "  blenagent status"
    Write-Host "  blenagent restart"
    Write-Host "  blenagent image-smoke -OpenImages"
    Write-Host "  blenagent install-compare"
    Write-Host "  blenagent compare-smoke -OpenImages"
}

function Show-Help {
    Write-Host @"
Blender Agent short CLI

One-time install:
  .\blenagent.cmd install

After opening a new PowerShell window:
  blenagent start
  blenagent stop
  blenagent restart
  blenagent status
  blenagent image-smoke [-ImagePath PATH] [-OpenImages]
  blenagent compare-smoke [-ImagePath PATH] [-OpenImages]
  blenagent sculpt-smoke [-OpenImages]
  blenagent recipe-smoke [-OpenImages]
  blenagent iteration-smoke [-OpenImages]
  blenagent context-smoke [-OpenImages]
  blenagent smoke [-OpenImages]
  blenagent install-compare
  blenagent install-mcp

Useful options:
  -Mode checkpoint|save|discard
  -Force
  -BlenderExe PATH
  -BlendFile PATH
  -MaxRetry 9
  -RetrySeconds 10
  -PythonExe python

restart defaults to a recovery checkpoint before closing a healthy bridge.
A stale dead session is cleaned automatically. A live Blender with an unreachable bridge is never killed unless -Force is explicit.
image-smoke and compare-smoke default to .runtime\blender-agent\assets\referencia.jpg.
"@
}

switch ($Command.ToLowerInvariant()) {
    "install" {
        Install-BlenagentCommand
    }
    "start" {
        Start-Agent
    }
    "stop" {
        Stop-Agent
    }
    "restart" {
        Restart-Agent
    }
    "status" {
        Show-AgentStatus
    }
    "image-smoke" {
        if (-not $ImagePath) {
            $ImagePath = ".runtime\blender-agent\assets\referencia.jpg"
        }
        $arguments = @("-PythonExe", $PythonExe, "-ImagePath", $ImagePath)
        if ($OpenImages) {
            $arguments += "-OpenImages"
        }
        Invoke-AgentPowerShell -ScriptName "image-smoke-test.ps1" -Arguments $arguments
    }
    "compare-smoke" {
        if (-not $ImagePath) {
            $ImagePath = ".runtime\blender-agent\assets\referencia.jpg"
        }
        $arguments = @("-PythonExe", $PythonExe, "-ImagePath", $ImagePath)
        if ($OpenImages) {
            $arguments += "-OpenImages"
        }
        Invoke-AgentPowerShell -ScriptName "comparison-smoke-test.ps1" -Arguments $arguments
    }
    "sculpt-smoke" {
        $arguments = @("-PythonExe", $PythonExe)
        if ($OpenImages) {
            $arguments += "-OpenImages"
        }
        Invoke-AgentPowerShell -ScriptName "sculpt-smoke-test.ps1" -Arguments $arguments
    }
    "recipe-smoke" {
        $arguments = @("-PythonExe", $PythonExe)
        if ($OpenImages) {
            $arguments += "-OpenImages"
        }
        Invoke-AgentPowerShell -ScriptName "recipe-smoke-test.ps1" -Arguments $arguments
    }
    "iteration-smoke" {
        $arguments = @("-PythonExe", $PythonExe)
        if ($OpenImages) {
            $arguments += "-OpenImages"
        }
        Invoke-AgentPowerShell -ScriptName "iteration-smoke-test.ps1" -Arguments $arguments
    }
    "context-smoke" {
        $arguments = @("-PythonExe", $PythonExe)
        if ($OpenImages) {
            $arguments += "-OpenImages"
        }
        Invoke-AgentPowerShell -ScriptName "context-smoke-test.ps1" -Arguments $arguments
    }
    "smoke" {
        $arguments = @("-PythonExe", $PythonExe, "-CaptureName", $CaptureName)
        if ($OpenImages) {
            $arguments += "-OpenImage"
        }
        Invoke-AgentPowerShell -ScriptName "smoke-test.ps1" -Arguments $arguments
    }
    "install-compare" {
        Invoke-AgentPowerShell -ScriptName "install-compare.ps1" -Arguments @("-PythonExe", $PythonExe)
    }
    "install-mcp" {
        Invoke-AgentPowerShell -ScriptName "install-mcp.ps1"
    }
    "help" {
        Show-Help
    }
    "--help" {
        Show-Help
    }
    "-h" {
        Show-Help
    }
    default {
        throw "Unknown blenagent command '$Command'. Run 'blenagent help'."
    }
}
