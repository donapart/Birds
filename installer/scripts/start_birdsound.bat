@echo off
title BirdSound - Starting...
cd /d "%~dp0"

echo ========================================
echo   BirdSound - Vogelstimmen-Erkennung
echo ========================================
echo.

:: Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Python environment not found, creating...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
    pip install birdnet tf-keras
) else (
    call venv\Scripts\activate.bat
)

:: Set environment
set PYTHONPATH=%~dp0backend
cd backend

:: Start server
echo [INFO] Starting BirdSound server on http://localhost:8003
echo [INFO] Press Ctrl+C to stop
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8003

pause
