# ============================================================
# BirdSound Windows Service Installation (via NSSM)
# ============================================================
# 
# Voraussetzungen:
#   1. NSSM installieren: choco install nssm  (oder von nssm.cc)
#   2. Dieses Script als Administrator ausfuehren
#
# ============================================================

$ErrorActionPreference = "Stop"

# Konfiguration
$ServiceName = "BirdSoundBackend"
$BackendPath = "D:\Projekte\Birds\backend"
$PythonExe = "$BackendPath\venv\Scripts\python.exe"
$ServiceArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BirdSound Windows Service Installation" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe Admin-Rechte
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] Bitte als Administrator ausfuehren!" -ForegroundColor Red
    exit 1
}

# Pruefe NSSM
$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssm) {
    Write-Host "[ERROR] NSSM nicht gefunden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation mit Chocolatey:" -ForegroundColor Yellow
    Write-Host "  choco install nssm" -ForegroundColor White
    Write-Host ""
    Write-Host "Oder manuell von: https://nssm.cc/download" -ForegroundColor Yellow
    exit 1
}

# Entferne existierenden Service
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "[INFO] Entferne existierenden Service..." -ForegroundColor Yellow
    nssm stop $ServiceName 2>$null
    nssm remove $ServiceName confirm
}

# Installiere Service
Write-Host "[INSTALL] Installiere BirdSound Service..." -ForegroundColor Green
nssm install $ServiceName $PythonExe $ServiceArgs
nssm set $ServiceName AppDirectory $BackendPath
nssm set $ServiceName DisplayName "BirdSound Backend API"
nssm set $ServiceName Description "BirdSound ML-basierte Vogelstimmen-Erkennung API"
nssm set $ServiceName Start SERVICE_AUTO_START
nssm set $ServiceName AppStdout "$BackendPath\logs\service.log"
nssm set $ServiceName AppStderr "$BackendPath\logs\service_error.log"

# Erstelle Logs-Verzeichnis
New-Item -ItemType Directory -Path "$BackendPath\logs" -Force | Out-Null

# Starte Service
Write-Host "[START] Starte Service..." -ForegroundColor Green
nssm start $ServiceName

Start-Sleep -Seconds 5
$service = Get-Service -Name $ServiceName
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Installation abgeschlossen!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Service Status: $($service.Status)" -ForegroundColor White
Write-Host "  Backend URL:    http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:       http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Befehle:" -ForegroundColor Yellow
Write-Host "    nssm start $ServiceName    - Service starten" -ForegroundColor Gray
Write-Host "    nssm stop $ServiceName     - Service stoppen" -ForegroundColor Gray
Write-Host "    nssm restart $ServiceName  - Service neustarten" -ForegroundColor Gray
Write-Host "    nssm remove $ServiceName   - Service deinstallieren" -ForegroundColor Gray
Write-Host ""
