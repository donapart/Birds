@echo off
title BirdSound - Stopping...

echo Stopping BirdSound server...

:: Find and kill uvicorn process
taskkill /f /im python.exe /fi "WINDOWTITLE eq BirdSound*" 2>nul
taskkill /f /im uvicorn.exe 2>nul

:: Alternative: Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do (
    taskkill /f /pid %%a 2>nul
)

echo BirdSound server stopped.
timeout /t 2 >nul
