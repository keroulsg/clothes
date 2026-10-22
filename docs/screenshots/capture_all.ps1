param()

$base = "http://127.0.0.1:5173"
$outDir = "c:\Users\HP\Downloads\clothes\docs\screenshots"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$browser = if (Test-Path $chrome) { $chrome } elseif (Test-Path $edge) { $edge } else { $null }

if (-not $browser) {
    Write-Error "No browser found"
    exit 1
}

function Take-Shot($route, $filename, $w, $h) {
    $targetUrl = "$base/$route"
    $targetFile = "$outDir\$filename"
    $argList = @(
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--virtual-time-budget=3500",
        "--run-all-compositor-stages-before-draw",
        "--force-device-scale-factor=1",
        "--window-size=$w,$h",
        "--screenshot=$targetFile",
        $targetUrl
    )
    Write-Host "Capturing $filename from $targetUrl at ${w}x${h}..."
    $p = Start-Process -FilePath $browser -ArgumentList $argList -Wait -PassThru -NoNewWindow
    if (Test-Path $targetFile) {
        $len = (Get-Item $targetFile).Length
        Write-Host " -> Saved $filename ($len bytes)"
    } else {
        Write-Error " -> FAILED $filename"
    }
}

# 1. Desktop 1440x900 - Light Theme
Take-Shot "?theme=light#erp/dashboard" "dashboard_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/models" "models_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/cutting" "cutting_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/inventory" "inventory_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/purchasing" "purchasing_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/subcontracting" "subcontracting_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/settings" "settings_desktop_light.png" 1440 900
Take-Shot "?theme=light#erp/storefront" "storefront_desktop_light.png" 1440 900
Take-Shot "?theme=light#admin/overview" "admin_desktop_light.png" 1440 900

# 2. Desktop 1440x900 - Dark Theme
Take-Shot "?theme=dark#erp/dashboard" "dashboard_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/models" "models_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/cutting" "cutting_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/inventory" "inventory_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/purchasing" "purchasing_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/subcontracting" "subcontracting_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/settings" "settings_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#erp/storefront" "storefront_desktop_dark.png" 1440 900
Take-Shot "?theme=dark#admin/overview" "admin_desktop_dark.png" 1440 900

# 3. Laptop 1280x800
Take-Shot "?theme=light#erp/dashboard" "dashboard_laptop_1280.png" 1280 800
Take-Shot "?theme=light#erp/models" "models_laptop_1280.png" 1280 800
Take-Shot "?theme=light#erp/cutting" "cutting_laptop_1280.png" 1280 800

# 4. Tablet 768x1024
Take-Shot "?theme=light#erp/dashboard" "dashboard_tablet_768.png" 768 1024
Take-Shot "?theme=light#erp/models" "models_tablet_768.png" 768 1024
Take-Shot "?theme=light#erp/cutting" "cutting_tablet_768.png" 768 1024

# 5. Mobile 390x844
Take-Shot "?theme=light#erp/dashboard" "dashboard_mobile_390.png" 390 844
Take-Shot "?theme=light#erp/models" "models_mobile_390.png" 390 844
Take-Shot "?theme=light#erp/cutting" "cutting_mobile_390.png" 390 844
Take-Shot "?theme=dark#erp/dashboard" "dashboard_mobile_dark_390.png" 390 844

# 6. Public Marketing Site
Take-Shot "?theme=light#" "public_home_1440.png" 1440 900
Take-Shot "?theme=light#" "public_home_mobile.png" 390 844
Take-Shot "?theme=light#pricing" "public_pricing_1440.png" 1440 900
Take-Shot "?theme=light#privacy" "public_privacy_1440.png" 1440 900

Write-Host "All comprehensive automated screenshots completed successfully."
