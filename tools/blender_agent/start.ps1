param(
    [string]$BlenderExe = "",
    [string]$BlendFile = "",
    [ValidateRange(1, 60)][int]$MaxRetry = 9,
    [ValidateRange(1, 300)][int]$RetrySeconds = 10,
    [int]$WaitForBridgeSeconds = 0,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Bridge = (Resolve-Path (Join-Path $PSScriptRoot "blender_bridge_v05_entry.py")).Path
$SessionFile = Join-Path $RepoRoot ".runtime\blender-agent\session\bridge.json"
$StartupLogDir = Join-Path $RepoRoot ".runtime\blender-agent\startup-logs"
$LastSessionIssue = "arquivo de sessao ainda nao existe"

function Quote-NativeArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    # Start-Process rebuilds a native Windows command line from -ArgumentList.
    # Paths containing spaces must therefore keep explicit quotes.
    return '"' + $Value.Replace('"', '\"') + '"'
}

function Show-StartupLogTail {
    param(
        [string]$StdoutPath,
        [string]$StderrPath,
        [int]$Tail = 40
    )

    foreach ($entry in @(
        @{ Label = "stderr"; Path = $StderrPath },
        @{ Label = "stdout"; Path = $StdoutPath }
    )) {
        if ($entry.Path -and (Test-Path -LiteralPath $entry.Path)) {
            $lines = @(Get-Content -LiteralPath $entry.Path -Tail $Tail -ErrorAction SilentlyContinue)
            if ($lines.Count -gt 0) {
                Write-Host ""
                Write-Host "Ultimas linhas de $($entry.Label):"
                $lines | ForEach-Object { Write-Host $_ }
            }
        }
    }
}

function Test-StartupPythonFailure {
    param([string]$StderrPath)

    if (-not $StderrPath -or -not (Test-Path -LiteralPath $StderrPath)) {
        return $false
    }

    $text = Get-Content -LiteralPath $StderrPath -Raw -ErrorAction SilentlyContinue
    if (-not $text) {
        return $false
    }

    return (
        $text.Contains("Traceback (most recent call last):") -or
        $text.Contains("ModuleNotFoundError:") -or
        $text.Contains("ImportError:") -or
        $text.Contains("SyntaxError:")
    )
}

if ($WaitForBridgeSeconds -gt 0) {
    if ($PSBoundParameters.ContainsKey("MaxRetry")) {
        Write-Warning "-WaitForBridgeSeconds esta obsoleto e foi ignorado porque -MaxRetry foi informado."
    }
    else {
        $MaxRetry = [Math]::Max(1, [int][Math]::Ceiling($WaitForBridgeSeconds / [double]$RetrySeconds))
        Write-Warning "-WaitForBridgeSeconds esta obsoleto. Convertendo para $MaxRetry tentativas de ate $RetrySeconds segundos."
    }
}

if (-not $BlenderExe) {
    $cmd = Get-Command blender -ErrorAction SilentlyContinue
    if ($cmd) {
        $BlenderExe = $cmd.Source
    }
}

if (-not $BlenderExe) {
    $candidates = @(
        Get-ChildItem "C:\Program Files\Blender Foundation" -Filter blender.exe -Recurse -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending
    )
    if ($candidates.Count -gt 0) {
        $BlenderExe = $candidates[0].FullName
    }
}

if (-not $BlenderExe -or -not (Test-Path -LiteralPath $BlenderExe)) {
    throw "Blender nao encontrado. Passe -BlenderExe 'C:\...\blender.exe'."
}

$BlenderExe = (Resolve-Path -LiteralPath $BlenderExe).Path

$argumentParts = @("--enable-event-simulate")

if ($BlendFile) {
    $resolvedBlend = (Resolve-Path -LiteralPath $BlendFile).Path
    $argumentParts += (Quote-NativeArgument $resolvedBlend)
}

$argumentParts += "--python"
$argumentParts += (Quote-NativeArgument $Bridge)

# Use one argument string so quoted paths survive Start-Process on Windows PowerShell 5.1.
$argumentString = $argumentParts -join " "

Write-Host "Iniciando Blender Agent..."
Write-Host "Blender: $BlenderExe"
Write-Host "Bridge:  $Bridge"
Write-Host "Args:    $argumentString"
Write-Host "Retry:   $MaxRetry tentativas, ate $RetrySeconds segundos por tentativa"

if ($DryRun) {
    Write-Host "DryRun: Blender nao foi iniciado."
    exit 0
}

if (Test-Path -LiteralPath $SessionFile) {
    Remove-Item -LiteralPath $SessionFile -Force
}

New-Item -ItemType Directory -Force -Path $StartupLogDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$StdoutLog = Join-Path $StartupLogDir "blender-$timestamp.stdout.log"
$StderrLog = Join-Path $StartupLogDir "blender-$timestamp.stderr.log"

$process = Start-Process `
    -FilePath $BlenderExe `
    -WorkingDirectory $RepoRoot `
    -ArgumentList $argumentString `
    -RedirectStandardOutput $StdoutLog `
    -RedirectStandardError $StderrLog `
    -PassThru

function Get-ValidBridgeSession {
    if (-not (Test-Path -LiteralPath $SessionFile)) {
        $script:LastSessionIssue = "arquivo de sessao ainda nao existe"
        return $null
    }

    try {
        $session = Get-Content -LiteralPath $SessionFile -Raw | ConvertFrom-Json
    }
    catch {
        $script:LastSessionIssue = "bridge.json existe, mas ainda nao contem JSON valido"
        return $null
    }

    if ($session.pid -ne $process.Id) {
        $script:LastSessionIssue = "bridge.json pertence a outro PID ($($session.pid)); esperado $($process.Id)"
        return $null
    }
    if (-not $session.port) {
        $script:LastSessionIssue = "bridge.json ainda nao possui port"
        return $null
    }
    if (-not $session.token) {
        $script:LastSessionIssue = "bridge.json ainda nao possui token"
        return $null
    }

    $script:LastSessionIssue = "sessao valida"
    return $session
}

for ($attempt = 1; $attempt -le $MaxRetry; $attempt++) {
    Write-Host "Tentativa ${attempt}/${MaxRetry}: aguardando bridge por ate ${RetrySeconds} segundos..."
    $attemptDeadline = (Get-Date).AddSeconds($RetrySeconds)

    while ((Get-Date) -lt $attemptDeadline) {
        $session = Get-ValidBridgeSession
        if ($session) {
            Write-Host ""
            Write-Host "Blender Agent pronto."
            Write-Host "PID:     $($session.pid)"
            Write-Host "Bridge:  $($session.host):$($session.port)"
            Write-Host "Sessao:  $SessionFile"
            Write-Host "Stdout:  $StdoutLog"
            Write-Host "Stderr:  $StderrLog"
            Write-Host ""
            Write-Host "Proximo teste:"
            Write-Host "python -m tools.blender_agent.client status"
            exit 0
        }

        if ($process.HasExited) {
            Show-StartupLogTail -StdoutPath $StdoutLog -StderrPath $StderrLog
            throw "O Blender encerrou antes de criar a sessao do bridge (exit $($process.ExitCode)). Consulte os logs de startup acima."
        }

        if (Test-StartupPythonFailure -StderrPath $StderrLog) {
            Show-StartupLogTail -StdoutPath $StdoutLog -StderrPath $StderrLog
            throw "O script Python do bridge falhou durante o startup. Corrija o traceback acima antes de aumentar MaxRetry."
        }

        Start-Sleep -Milliseconds 250
    }

    if ($attempt -lt $MaxRetry) {
        Write-Host "Bridge ainda nao ficou pronto. Ultimo estado: $LastSessionIssue"
    }
}

# One final read avoids a race exactly at the end of the last retry window.
$session = Get-ValidBridgeSession
if ($session) {
    Write-Host ""
    Write-Host "Blender Agent pronto."
    Write-Host "PID:     $($session.pid)"
    Write-Host "Bridge:  $($session.host):$($session.port)"
    Write-Host "Sessao:  $SessionFile"
    exit 0
}

Show-StartupLogTail -StdoutPath $StdoutLog -StderrPath $StderrLog

throw @"
O Blender permaneceu aberto, mas o bridge nao criou uma sessao valida apos $MaxRetry tentativas de ate $RetrySeconds segundos.

Ultimo estado observado:
$LastSessionIssue

Arquivo esperado:
$SessionFile

Logs de startup:
$StdoutLog
$StderrLog

Confira as ultimas linhas impressas acima. Para conferir apenas os argumentos, rode:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -DryRun

Exemplo para maquina lenta:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -MaxRetry 9 -RetrySeconds 10
"@
