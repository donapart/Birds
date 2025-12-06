# ============================================================
# BirdSound Autostart Installation (ohne NSSM)
# ============================================================
#
# Erstellt eine Verknuepfung im Windows Autostart-Ordner
#
# ============================================================

$ErrorActionPreference = "Stop"

$ScriptPath = "D:\Projekte\Birds\scripts\start_backend.bat"
$StartupPath = [Environment]::GetFolderPath('Startup')
$ShortcutPath = "$StartupPath\BirdSound Backend.lnk"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BirdSound Autostart Installation" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Erstelle Verknuepfung
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ScriptPath
$Shortcut.WorkingDirectory = "D:\Projekte\Birds\backend"
$Shortcut.WindowStyle = 7  # Minimiert
$Shortcut.Description = "BirdSound Backend automatisch starten"
$Shortcut.Save()

Write-Host "[OK] Autostart-Verknuepfung erstellt!" -ForegroundColor Green
Write-Host ""
Write-Host "  Pfad: $ShortcutPath" -ForegroundColor White
Write-Host ""
Write-Host "  Das Backend wird jetzt bei jedem Windows-Start" -ForegroundColor Yellow
Write-Host "  automatisch im Hintergrund gestartet." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Zum Entfernen:" -ForegroundColor Gray
Write-Host "    Remove-Item '$ShortcutPath'" -ForegroundColor Gray
Write-Host ""
