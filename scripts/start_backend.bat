@echo off
REM ============================================================
REM BirdSound Backend Startup Script (Windows)
REM ============================================================
REM Startet Backend + ngrok automatisch
REM 
REM Installation: 
REM   1. Rechtsklick -> "Verknuepfung erstellen"
REM   2. Verknuepfung nach shell:startup verschieben
REM   Oder: PowerShell als Admin ausfuehren und install_service.ps1 nutzen
REM ============================================================

title BirdSound Backend
cd /d D:\Projekte\Birds\backend

echo ============================================================
echo   BirdSound Backend Startup
echo ============================================================
echo.

REM Pruefe ob Backend bereits laeuft
netstat -ano | findstr ":8000" >nul
if not errorlevel 1 (
    echo [INFO] Backend laeuft bereits auf Port 8000
    goto :check_ngrok
)

echo [START] Backend wird gestartet...
start "BirdSound Backend" /MIN cmd /c "D:\Projekte\Birds\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Warte bis Backend antwortet
echo [WAIT] Warte auf Backend (Modelle werden geladen, ca. 30 Sekunden)...
:wait_backend
timeout /t 5 /nobreak >nul
curl -s http://localhost:8000/api/v1/models >nul 2>&1
if errorlevel 1 goto :wait_backend
echo [OK] Backend ist bereit!

:check_ngrok
REM Starte ngrok falls nicht bereits laufend
tasklist /FI "IMAGENAME eq ngrok.exe" 2>nul | find /I "ngrok.exe" >nul
if errorlevel 1 (
    echo [START] ngrok wird gestartet...
    start "ngrok" /MIN ngrok http 8000
    timeout /t 3 /nobreak >nul
) else (
    echo [INFO] ngrok laeuft bereits
)

REM Zeige ngrok URL
echo.
echo ============================================================
echo   BirdSound ist bereit!
echo ============================================================
echo.
echo   Lokal:   http://localhost:8000
echo   API:     http://localhost:8000/docs
echo.
curl -s http://127.0.0.1:4040/api/tunnels 2>nul | findstr "public_url"
echo.
echo   Druecke eine Taste zum Schliessen (Backend laeuft weiter)
echo ============================================================
pause >nul
