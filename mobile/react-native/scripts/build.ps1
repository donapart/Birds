# BirdSound - Android Build Script (Windows)
# Usage: .\build.ps1 [-Mode debug|release]

param(
    [ValidateSet("debug", "release")]
    [string]$Mode = "debug"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🐦 BirdSound Android Build                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectDir

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js nicht gefunden" -ForegroundColor Red
    exit 1
}

# Install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installiere npm dependencies..." -ForegroundColor Yellow
    npm install
}

# Build
Set-Location android

if ($Mode -eq "release") {
    Write-Host "🔨 Erstelle Release APK..." -ForegroundColor Green
    .\gradlew.bat assembleRelease
    
    $ApkPath = "app\build\outputs\apk\release\app-release.apk"
} else {
    Write-Host "🔨 Erstelle Debug APK..." -ForegroundColor Green
    .\gradlew.bat assembleDebug
    
    $ApkPath = "app\build\outputs\apk\debug\app-debug.apk"
}

if (Test-Path $ApkPath) {
    Write-Host ""
    Write-Host "✅ APK erstellt: $ApkPath" -ForegroundColor Green
    Get-Item $ApkPath | Select-Object Name, Length, LastWriteTime
    
    Write-Host ""
    Write-Host "📱 Zum Installieren auf Gerät:" -ForegroundColor Cyan
    Write-Host "   adb install -r $ApkPath"
}

Set-Location $ProjectDir
