param(
    [string]$Url = "http://localhost:5173",
    [string]$OutputFile = "c:\Users\HP\Downloads\clothes\docs\screenshots\test.png",
    [int]$Width = 1440,
    [int]$Height = 900
)

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$browser = if (Test-Path $chrome) { $chrome } elseif (Test-Path $edge) { $edge } else { $null }

if (-not $browser) {
    Write-Error "No browser found"
    exit 1
}

$fullOutputPath = [System.IO.Path]::GetFullPath($OutputFile)
$outputDir = [System.IO.Path]::GetDirectoryName($fullOutputPath)
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$argList = @(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--virtual-time-budget=3500",
    "--run-all-compositor-stages-before-draw",
    "--force-device-scale-factor=1",
    "--window-size=$Width,$Height",
    "--screenshot=$fullOutputPath",
    $Url
)

$p = Start-Process -FilePath $browser -ArgumentList $argList -Wait -PassThru -NoNewWindow
if (Test-Path $OutputFile) {
    Write-Output "Screenshot saved to $OutputFile ($( (Get-Item $OutputFile).Length ) bytes)"
} else {
    Write-Error "Failed to generate screenshot at $OutputFile"
}
