# ============================================================
# BirdSound - Installiere ngrok Autostart (Windows Task Scheduler)
# ============================================================
# Startet ngrok automatisch bei Windows-Login
# Neustart bei Absturz
# ============================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BirdSound ngrok Autostart Installation" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Pfade
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$startNgrokScript = Join-Path $scriptPath "start_ngrok.ps1"
$projectRoot = Split-Path -Parent $scriptPath

# Prüfe ob Scripte existieren
if (-not (Test-Path $startNgrokScript)) {
    Write-Host "[ERROR] start_ngrok.ps1 nicht gefunden!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Scripts gefunden" -ForegroundColor Green
Write-Host ""

# Erstelle Task Scheduler Job
$taskName = "BirdSound-ngrok"
$taskDescription = "Startet ngrok Tunnel für BirdSound API (Docker Port 8003)"

# Prüfe ob Task bereits existiert
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "[INFO] Task existiert bereits - wird aktualisiert" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Task Action - PowerShell mit Bypass Policy
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startNgrokScript`""

# Task Trigger - Bei Anmeldung
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Task Settings - Wichtig für Dauerbetrieb
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -RestartCount 999 `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

# Task Principal - Als aktueller User
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

# Registriere Task
Register-ScheduledTask `
    -TaskName $taskName `
    -Description $taskDescription `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "[OK] Task Scheduler Job erstellt: $taskName" -ForegroundColor Green
Write-Host ""

# Starte Task sofort
Write-Host "[START] Starte ngrok Tunnel..." -ForegroundColor Cyan
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 7

# Prüfe Status
try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
    $publicUrl = $tunnels.tunnels[0].public_url
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  ✓ Installation erfolgreich!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  ngrok läuft jetzt dauerhaft und startet automatisch:" -ForegroundColor White
    Write-Host "    ✓ Bei Windows-Login" -ForegroundColor Gray
    Write-Host "    ✓ Nach Neustart" -ForegroundColor Gray
    Write-Host "    ✓ Nach Absturz (automatisch)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Public URL: " -NoNewline
    Write-Host $publicUrl -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    
    # Kopiere URL
    $publicUrl | Set-Clipboard
    Write-Host "  [URL in Zwischenablage kopiert]" -ForegroundColor Gray
    
} catch {
    Write-Host ""
    Write-Host "[WARN] ngrok noch nicht bereit - prüfe Status mit:" -ForegroundColor Yellow
    Write-Host "       Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Verwaltung:" -ForegroundColor Cyan
Write-Host "  Status:   Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "  Stoppen:  Stop-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "  Starten:  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "  Löschen:  Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
