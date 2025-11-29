@echo off
title BirdSound Server
color 0A

echo.
echo ============================================
echo   BirdSound - Vogelstimmen-Erkennung
echo   Version 1.0.0
echo ============================================
echo.

cd /d "%~dp0backend"

:: Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Python nicht gefunden!
    echo Bitte installiere Python 3.11+ von python.org
    pause
    exit /b 1
)

:: Check for virtual environment
if not exist "venv" (
    echo [INFO] Erstelle virtuelle Umgebung...
    python -m venv venv
)

:: Activate venv
call venv\Scripts\activate.bat

:: Check if dependencies installed
if not exist "venv\Lib\site-packages\fastapi" (
    echo [INFO] Installiere Abhaengigkeiten...
    pip install -r requirements.txt
    pip install aiosqlite torchaudio transformers
)

:: Set environment variables
set PYTHONPATH=%~dp0backend
set USE_SQLITE=true
set DEBUG=false

echo.
echo [INFO] Starte BirdSound Server...
echo [INFO] API: http://localhost:8003
echo [INFO] Docs: http://localhost:8003/docs
echo.
echo Druecke CTRL+C zum Beenden
echo.

:: Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003

pause
