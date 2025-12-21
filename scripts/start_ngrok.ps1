# ============================================================
# BirdSound - Starte ngrok für Docker (Port 8003)
# ============================================================
# Verwendung: .\start_ngrok.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BirdSound ngrok Tunnel (Docker Port 8003)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob ngrok bereits läuft
$existing = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[INFO] ngrok läuft bereits!" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
        $publicUrl = $tunnels.tunnels[0].public_url
        
        Write-Host "  Public URL: " -NoNewline
        Write-Host $publicUrl -ForegroundColor Green
        Write-Host "  Dashboard:  http://127.0.0.1:4040" -ForegroundColor Gray
        Write-Host ""
        
        # Kopiere URL
        $publicUrl | Set-Clipboard
        Write-Host "  [URL in Zwischenablage kopiert]" -ForegroundColor Gray
        
    } catch {
        Write-Host "  [Konnte ngrok Status nicht abrufen]" -ForegroundColor Red
    }
    
    Write-Host ""
    exit 0
}

# Prüfe ob Docker läuft
$dockerApi = Test-NetConnection -ComputerName localhost -Port 8003 -WarningAction SilentlyContinue
if (-not $dockerApi.TcpTestSucceeded) {
    Write-Host "[WARN] Docker-API nicht erreichbar auf Port 8003!" -ForegroundColor Red
    Write-Host "       Starte Docker zuerst: docker-compose up -d" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] Docker-API läuft auf Port 8003" -ForegroundColor Green
Write-Host ""

# Starte ngrok
Write-Host "[START] Starte ngrok Tunnel zu localhost:8003..." -ForegroundColor Cyan
Start-Process ngrok -ArgumentList "http", "8003" -WindowStyle Hidden

Write-Host "[WAIT] Warte auf ngrok..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Hole Public URL
try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 10
    $publicUrl = $tunnels.tunnels[0].public_url
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  ✓ ngrok läuft!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Public URL: " -NoNewline
    Write-Host $publicUrl -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "  Dashboard:  http://127.0.0.1:4040" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [Trage diese URL in der Android-App ein]" -ForegroundColor Yellow
    Write-Host ""
    
    # Kopiere URL
    $publicUrl | Set-Clipboard
    Write-Host "  [URL in Zwischenablage kopiert]" -ForegroundColor Gray
    Write-Host ""
    
    # Teste Verbindung
    Write-Host "[TEST] Teste API-Verbindung..." -ForegroundColor Cyan
    try {
        $health = Invoke-RestMethod -Uri "$publicUrl/health" -TimeoutSec 10 -Headers @{"ngrok-skip-browser-warning"="true"}
        Write-Host "  ✓ API erreichbar: $($health.models_loaded) Modelle geladen" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ API nicht sofort erreichbar (ngrok Warning-Seite?)" -ForegroundColor Yellow
        Write-Host "     In der App einmal 'Visit Site' klicken" -ForegroundColor Gray
    }
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Konnte ngrok URL nicht abrufen!" -ForegroundColor Red
    Write-Host "        Öffne http://127.0.0.1:4040 im Browser" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Drücke Strg+C zum Beenden (oder schließe das ngrok-Fenster)" -ForegroundColor Gray
Write-Host ""
