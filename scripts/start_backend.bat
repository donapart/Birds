@echo off
REM ============================================================
REM BirdSound Backend Startup Script (Windows) with Auto-Restart
REM ============================================================
REM Startet Backend + ngrok automatisch
REM Bei Absturz wird das Backend automatisch neu gestartet
REM ============================================================

title BirdSound Backend
cd /d D:\Projekte\Birds\backend

:start
echo ============================================================
echo   BirdSound Backend Startup (mit Auto-Restart)
echo ============================================================
echo.
echo   [%TIME%] Starte Backend...
echo.

REM Pruefe ob Backend bereits laeuft
netstat -ano 2>nul | findstr ":8000" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [INFO] Backend laeuft bereits auf Port 8000
    goto :check_ngrok
)

REM Starte Backend im Vordergrund (fuer Auto-Restart bei Absturz)
echo [START] Backend wird gestartet...
echo.

REM Starte Python-Prozess und ueberwache ihn
D:\Projekte\Birds\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

REM Wenn wir hier ankommen, ist das Backend abgestuerzt
echo.
echo [WARNUNG] Backend ist abgestuerzt! Exit code: %ERRORLEVEL%
echo [AUTO-RESTART] Neustart in 5 Sekunden...
echo.
timeout /t 5 /nobreak >nul

REM Stoppe alte Prozesse falls noch vorhanden
taskkill /F /IM python.exe /FI "WINDOWTITLE eq BirdSound*" 2>nul
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

REM Starte neu
goto :start

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

REM Zeige Status
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
echo   Bei Absturz startet das Backend automatisch neu.
echo   Druecke Ctrl+C zum Beenden.
echo ============================================================
pause >nul
goto :start
