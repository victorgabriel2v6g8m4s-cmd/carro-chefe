$ErrorActionPreference = "Stop"
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Carro Chefe Supervisor.lnk"
$desktopShortcutPath = Join-Path ([Environment]::GetFolderPath("DesktopDirectory")) "Carro Chefe - Central Operacional.lnk"
$running = Get-Process -Name "CarroChefeSupervisor" -ErrorAction SilentlyContinue
foreach ($process in $running) {
    Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", $process.Id, "/T", "/F") -WindowStyle Hidden -Wait | Out-Null
}
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
if (Test-Path -LiteralPath $desktopShortcutPath) { Remove-Item -LiteralPath $desktopShortcutPath -Force }
Write-Output "Supervisor removido do Inicializar do Windows."
