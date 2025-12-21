# ngrok Autostart Installation (Windows Startup Folder)
# Kein Administrator-Recht erforderlich!

param(
    [string]$NgrokPath = "ngrok",
    [int]$Port = 8003,
    [string]$StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ngrok Autostart Installation" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob ngrok installiert ist
try {
    $ngrokVersion = & $NgrokPath version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "ngrok nicht gefunden"
    }
    Write-Host "[OK] ngrok gefunden" -ForegroundColor Green
} catch {
    Write-Host "[FEHLER] ngrok ist nicht installiert oder nicht im PATH!" -ForegroundColor Red
    Write-Host "  Installiere ngrok von: https://ngrok.com/download" -ForegroundColor Yellow
    exit 1
}

# Prüfe Docker
try {
    $dockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker nicht erreichbar"
    }
    Write-Host "[OK] Docker läuft" -ForegroundColor Green
} catch {
    Write-Host "[WARNUNG] Docker läuft nicht!" -ForegroundColor Yellow
    Write-Host "  Starte Docker Desktop manuell oder aktiviere Autostart" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Erstelle Autostart-Verknüpfung..." -ForegroundColor White

# Bestimme ngrok.exe Pfad
$ngrokExePath = (Get-Command $NgrokPath).Source

# Erstelle PowerShell-Wrapper Script
$wrapperScriptPath = Join-Path $PSScriptRoot "start_ngrok_background.ps1"
$wrapperScript = @"
# ngrok Background Starter
Start-Process -FilePath "ngrok" -ArgumentList "http", "$Port" -WindowStyle Hidden
"@

$wrapperScript | Out-File -FilePath $wrapperScriptPath -Encoding UTF8 -Force

try {
    # Erstelle VBS-Launcher (startet PowerShell unsichtbar)
    $vbsLauncherPath = Join-Path $PSScriptRoot "start_ngrok_silent.vbs"
    $vbsLauncher = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$wrapperScriptPath""", 0, False
"@
    $vbsLauncher | Out-File -FilePath $vbsLauncherPath -Encoding ASCII -Force

    # Erstelle Shortcut im Startup Folder
    $shortcutPath = Join-Path $StartupFolder "ngrok_tunnel.lnk"
    
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = "wscript.exe"
    $Shortcut.Arguments = "`"$vbsLauncherPath`""
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.Description = "ngrok Tunnel auf Port $Port"
    $Shortcut.Save()

    Write-Host ""
    Write-Host "[ERFOLG] Autostart installiert!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Erstellt:" -ForegroundColor White
    Write-Host "  Verknuepfung: $shortcutPath" -ForegroundColor Gray
    Write-Host "  VBS Launcher: $vbsLauncherPath" -ForegroundColor Gray
    Write-Host "  PowerShell Wrapper: $wrapperScriptPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ngrok startet jetzt automatisch beim Login!" -ForegroundColor Green
    Write-Host ""
    
    # Info ueber Docker Autostart
    Write-Host "WICHTIG:" -ForegroundColor Yellow
    Write-Host "  Docker muss auch automatisch starten!" -ForegroundColor White
    Write-Host "  Aktiviere in Docker Desktop Einstellungen" -ForegroundColor Gray
    Write-Host ""
    
    # Frage ob jetzt testen
    Write-Host "Moechtest du den Autostart jetzt testen? (y/n): " -ForegroundColor Cyan -NoNewline
    $test = Read-Host
    if ($test -eq "y" -or $test -eq "j") {
        Write-Host ""
        Write-Host "Starte ngrok im Hintergrund..." -ForegroundColor White
        Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsLauncherPath`"" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        # Pruefe ob ngrok laeuft
        $ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue
        if ($ngrokProcess) {
            Write-Host "[OK] ngrok laeuft im Hintergrund!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Public URL pruefen mit: ngrok api tunnels" -ForegroundColor Gray
        } else {
            Write-Host "[WARNUNG] ngrok Prozess nicht gefunden" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Deinstallation:" -ForegroundColor White
    Write-Host "  Loesche: $shortcutPath" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "[FEHLER] Installation fehlgeschlagen!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
