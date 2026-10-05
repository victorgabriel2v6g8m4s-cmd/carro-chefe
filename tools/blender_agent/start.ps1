param(
    [string]$BlenderExe = "",
    [string]$BlendFile = "",
    [int]$WaitForBridgeSeconds = 20,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Bridge = (Resolve-Path (Join-Path $PSScriptRoot "blender_bridge_v05_entry.py")).Path
$SessionFile = Join-Path $RepoRoot ".runtime\blender-agent\session\bridge.json"

function Quote-NativeArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    # Start-Process rebuilds a native Windows command line from -ArgumentList.
    # Paths containing spaces must therefore keep explicit quotes.
    return '"' + $Value.Replace('"', '\"') + '"'
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

if ($DryRun) {
    Write-Host "DryRun: Blender nao foi iniciado."
    exit 0
}

if (Test-Path -LiteralPath $SessionFile) {
    Remove-Item -LiteralPath $SessionFile -Force
}

$process = Start-Process -FilePath $BlenderExe -WorkingDirectory $RepoRoot -ArgumentList $argumentString -PassThru

$deadline = (Get-Date).AddSeconds([Math]::Max(1, $WaitForBridgeSeconds))

while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $SessionFile) {
        try {
            $session = Get-Content -LiteralPath $SessionFile -Raw | ConvertFrom-Json
            if ($session.pid -eq $process.Id -and $session.port -and $session.token) {
                Write-Host ""
                Write-Host "Blender Agent pronto."
                Write-Host "PID:     $($session.pid)"
                Write-Host "Bridge:  $($session.host):$($session.port)"
                Write-Host "Sessao:  $SessionFile"
                Write-Host ""
                Write-Host "Proximo teste:"
                Write-Host "python -m tools.blender_agent.client status"
                exit 0
            }
        }
        catch {
            # O Blender pode estar no meio da gravacao do JSON. Tenta de novo.
        }
    }

    if ($process.HasExited) {
        throw "O Blender encerrou antes de criar a sessao do bridge (exit $($process.ExitCode)). Rode novamente com -DryRun para conferir os argumentos."
    }

    Start-Sleep -Milliseconds 250
}

throw @"
O Blender abriu, mas o bridge nao criou a sessao em $WaitForBridgeSeconds segundos.

Arquivo esperado:
$SessionFile

Confira se a janela do Blender mostrou algum erro e rode:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -DryRun

Os argumentos impressos devem preservar entre aspas o caminho completo de blender_bridge_v05_entry.py.
"@
