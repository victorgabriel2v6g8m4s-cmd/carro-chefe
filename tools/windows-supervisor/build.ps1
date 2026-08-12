$ErrorActionPreference = "Stop"
$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $toolRoot "..\..")
$outputRoot = Join-Path $toolRoot "bin"
$compiler = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path -LiteralPath $compiler)) {
    throw "Compilador do Windows não encontrado."
}
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$source = Join-Path $toolRoot "CarroChefeSupervisor.cs"
$output = Join-Path $outputRoot "CarroChefeSupervisor.exe"
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll "/out:$output" $source
if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar o supervisor." }
$logoPath = Join-Path $projectRoot.Path "logos\base.png"
$iconPath = Join-Path $outputRoot "CarroChefe.ico"
if (Test-Path -LiteralPath $logoPath) {
    Add-Type -AssemblyName System.Drawing
    $sourceImage = [System.Drawing.Image]::FromFile($logoPath)
    try {
        $bitmap = New-Object System.Drawing.Bitmap 64, 64
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($sourceImage, 0, 0, 64, 64)
            $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
            $stream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
            try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose() }
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
    } finally { $sourceImage.Dispose() }
}
Write-Output $output
