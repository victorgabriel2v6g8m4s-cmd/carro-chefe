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

function Assert-LastExitCode {
    param([string]$Context)
    if ($LASTEXITCODE -ne 0) {
        throw "$Context failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Start {
    & (Join-Path $PSScriptRoot "start.ps1") `
        -PythonExe:$null 2>$null
}

function Start-Agent {
    & (Join-Path $PSScriptRoot "start.ps1") `
        -BlenderExe $BlenderExe `
        -BlendFile $BlendFile `
        -MaxRetry $MaxRetry `
        -RetrySeconds $RetrySeconds
}

function Stop-Agent {
    if ($Force) {
        & (Join-Path $PSScriptRoot "stop.ps1") -PythonExe $PythonExe -Mode $Mode -Force
    }
    else {
        & (Join-Path $PSScriptRoot "stop.ps1") -PythonExe $PythonExe -Mode $Mode
    }
}

function Restart-Agent {
    if (Test-Path -LiteralPath $SessionFile) {
        Write-Host "Stopping Blender Agent..."
        Stop-Agent
    }
    else {
        Write-Host "No active Blender Agent session found; starting a new one."
    }

    Write-Host "Starting Blender Agent..."
    Start-Agent
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
        $entries = $userPath.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries)
    }
    $normalizedBin = $binDir.TrimEnd("\")
    $alreadyPresent = $false
    foreach ($entry in $entries) {
        if ($entry.Trim().TrimEnd("\") -ieq $normalizedBin) {
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
  blenagent sculpt-smoke [-OpenImages]
  blenagent recipe-smoke [-OpenImages]
  blenagent iteration-smoke [-OpenImages]
  blenagent context-smoke [-OpenImages]
  blenagent smoke [-OpenImages]
  blenagent install-mcp

Useful options:
  -Mode checkpoint|save|discard
  -Force
  -BlenderExe PATH
  -BlendFile PATH
  -MaxRetry 9
  -RetrySeconds 10
  -PythonExe python

restart defaults to a recovery checkpoint before closing the current bridge.
image-smoke defaults to .runtime\blender-agent\assets\referencia.jpg.
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
        & $PythonExe -m tools.blender_agent.client status
        Assert-LastExitCode "Blender Agent status"
    }
    "image-smoke" {
        if (-not $ImagePath) {
            $ImagePath = ".runtime\blender-agent\assets\referencia.jpg"
        }
        if ($OpenImages) {
            & (Join-Path $PSScriptRoot "image-smoke-test.ps1") -PythonExe $PythonExe -ImagePath $ImagePath -OpenImages
        }
        else {
            & (Join-Path $PSScriptRoot "image-smoke-test.ps1") -PythonExe $PythonExe -ImagePath $ImagePath
        }
    }
    "sculpt-smoke" {
        if ($OpenImages) {
            & (Join-Path $PSScriptRoot "sculpt-smoke-test.ps1") -PythonExe $PythonExe -OpenImages
        }
        else {
            & (Join-Path $PSScriptRoot "sculpt-smoke-test.ps1") -PythonExe $PythonExe
        }
    }
    "recipe-smoke" {
        if ($OpenImages) {
            & (Join-Path $PSScriptRoot "recipe-smoke-test.ps1") -PythonExe $PythonExe -OpenImages
        }
        else {
            & (Join-Path $PSScriptRoot "recipe-smoke-test.ps1") -PythonExe $PythonExe
        }
    }
    "iteration-smoke" {
        if ($OpenImages) {
            & (Join-Path $PSScriptRoot "iteration-smoke-test.ps1") -PythonExe $PythonExe -OpenImages
        }
        else {
            & (Join-Path $PSScriptRoot "iteration-smoke-test.ps1") -PythonExe $PythonExe
        }
    }
    "context-smoke" {
        if ($OpenImages) {
            & (Join-Path $PSScriptRoot "context-smoke-test.ps1") -PythonExe $PythonExe -OpenImages
        }
        else {
            & (Join-Path $PSScriptRoot "context-smoke-test.ps1") -PythonExe $PythonExe
        }
    }
    "smoke" {
        if ($OpenImages) {
            & (Join-Path $PSScriptRoot "smoke-test.ps1") -PythonExe $PythonExe -CaptureName $CaptureName -OpenImage
        }
        else {
            & (Join-Path $PSScriptRoot "smoke-test.ps1") -PythonExe $PythonExe -CaptureName $CaptureName
        }
    }
    "install-mcp" {
        & (Join-Path $PSScriptRoot "install-mcp.ps1")
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
