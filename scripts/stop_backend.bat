@echo off
REM ============================================================
REM BirdSound Stop Script (Windows)
REM ============================================================

echo Stopping BirdSound services...

REM Stop Backend (Python/Uvicorn)
taskkill /F /IM python.exe /FI "WINDOWTITLE eq BirdSound*" 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do taskkill /F /PID %%a 2>nul

REM Stop ngrok
taskkill /F /IM ngrok.exe 2>nul

echo.
echo BirdSound services stopped.
pause
