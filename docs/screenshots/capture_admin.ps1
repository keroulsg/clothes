param()

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "c:\Users\HP\Downloads\clothes\docs\screenshots"

function Snap($route, $file) {
    $targetFile = "$outDir\$file"
    $url = "http://127.0.0.1:5173/$route"
    $argList = @(
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--virtual-time-budget=4000",
        "--run-all-compositor-stages-before-draw",
        "--force-device-scale-factor=1",
        "--window-size=1440,900",
        "--screenshot=$targetFile",
        $url
    )
    Start-Process -FilePath $chrome -ArgumentList $argList -Wait -NoNewWindow
    Write-Host "$file written at $((Get-Item $targetFile).LastWriteTime)"
}

Snap "?theme=light#admin/overview" "admin_desktop_light.png"
Snap "?theme=dark#admin/overview" "admin_desktop_dark.png"
