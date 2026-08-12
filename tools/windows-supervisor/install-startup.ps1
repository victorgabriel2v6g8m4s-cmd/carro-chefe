param([switch]$StartNow)
$ErrorActionPreference = "Stop"
$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $toolRoot "..\..")
$running = Get-Process -Name "CarroChefeSupervisor" -ErrorAction SilentlyContinue
foreach ($process in $running) {
    Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", $process.Id, "/T", "/F") -WindowStyle Hidden -Wait | Out-Null
}
& (Join-Path $toolRoot "build.ps1") | Out-Null
$executable = Join-Path $toolRoot "bin\CarroChefeSupervisor.exe"
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Carro Chefe Supervisor.lnk"
$desktop = [Environment]::GetFolderPath("DesktopDirectory")
$desktopShortcutPath = Join-Path $desktop "Carro Chefe - Central Operacional.lnk"
$iconPath = Join-Path $toolRoot "bin\CarroChefe.ico"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $executable
$shortcut.WorkingDirectory = $projectRoot.Path
$shortcut.Description = "Inicia a Central Operacional, os agentes e o dispatcher de webhooks do Carro Chefe."
$shortcut.IconLocation = "$iconPath,0"
$shortcut.WindowStyle = 7
$shortcut.Save()
$desktopShortcut = $shell.CreateShortcut($desktopShortcutPath)
$desktopShortcut.TargetPath = $executable
$desktopShortcut.Arguments = "--open"
$desktopShortcut.WorkingDirectory = $projectRoot.Path
$desktopShortcut.Description = "Abre a Central Operacional do Carro Chefe."
$desktopShortcut.IconLocation = "$iconPath,0"
$desktopShortcut.WindowStyle = 7
$desktopShortcut.Save()
if ($StartNow) {
    Start-Process -FilePath $executable -WorkingDirectory $projectRoot.Path -WindowStyle Hidden
}
Write-Output $shortcutPath
Write-Output $desktopShortcutPath
