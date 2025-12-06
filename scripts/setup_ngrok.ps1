# ============================================================
# ngrok Autostart mit fester URL (erfordert ngrok Account)
# ============================================================
#
# Fuer eine feste URL brauchst du:
#   1. ngrok Account: https://ngrok.com/signup
#   2. Authtoken setzen: ngrok config add-authtoken YOUR_TOKEN
#   3. (Optional) Custom Domain mit ngrok Pro
#
# ============================================================

param(
    [string]$AuthToken = "",
    [string]$Domain = ""  # z.B. "birdsound.ngrok.io" (erfordert Pro)
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ngrok Konfiguration" -ForegroundColor Cyan  
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe ngrok
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
    Write-Host "[ERROR] ngrok nicht gefunden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation:" -ForegroundColor Yellow
    Write-Host "  choco install ngrok" -ForegroundColor White
    Write-Host "  oder von: https://ngrok.com/download" -ForegroundColor White
    exit 1
}

# Setze Authtoken falls angegeben
if ($AuthToken) {
    Write-Host "[CONFIG] Setze ngrok Authtoken..." -ForegroundColor Green
    ngrok config add-authtoken $AuthToken
}

# Erstelle ngrok Konfiguration
$ngrokConfig = @"
version: "2"
authtoken: $AuthToken
tunnels:
  birdsound:
    addr: 8000
    proto: http
"@

if ($Domain) {
    $ngrokConfig += "`n    hostname: $Domain"
}

$configPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"
# Backup existierende Config
if (Test-Path $configPath) {
    Copy-Item $configPath "$configPath.backup" -Force
}

Write-Host ""
Write-Host "[INFO] ngrok Konfiguration:" -ForegroundColor Yellow
Write-Host $ngrokConfig -ForegroundColor Gray
Write-Host ""

# Starte ngrok
Write-Host "[START] Starte ngrok..." -ForegroundColor Green
if ($Domain) {
    Start-Process ngrok -ArgumentList "http", "8000", "--hostname=$Domain" -WindowStyle Minimized
} else {
    Start-Process ngrok -ArgumentList "http", "8000" -WindowStyle Minimized
}

Start-Sleep -Seconds 3

# Zeige URL
try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
    $publicUrl = $tunnels.tunnels[0].public_url
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  ngrok laeuft!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Public URL: $publicUrl" -ForegroundColor White
    Write-Host "  Dashboard:  http://127.0.0.1:4040" -ForegroundColor White
    Write-Host ""
    
    # Kopiere URL in Zwischenablage
    $publicUrl | Set-Clipboard
    Write-Host "  [URL in Zwischenablage kopiert]" -ForegroundColor Gray
} catch {
    Write-Host "[WARN] Konnte ngrok URL nicht abrufen" -ForegroundColor Yellow
    Write-Host "       Oeffne http://127.0.0.1:4040 im Browser" -ForegroundColor Gray
}

Write-Host ""
