# BirdSound Android APK Build Script
# 
# Prerequisites:
#   - Node.js 18+
#   - Android SDK (set ANDROID_HOME)
#   - Java 17+ (set JAVA_HOME)
#
# Usage:
#   .\build_apk.ps1 [-Release] [-Install]

param(
    [switch]$Release,
    [switch]$Install,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BirdSound Android APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AndroidDir = "$ProjectRoot"

# Check environment
Write-Host "[CHECK] Verifying environment..." -ForegroundColor Yellow

# Java
if (-not $env:JAVA_HOME) {
    Write-Host "[ERROR] JAVA_HOME not set!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green

# Android SDK
$AndroidHome = $env:ANDROID_HOME
if (-not $AndroidHome) {
    $AndroidHome = "$env:LOCALAPPDATA\Android\Sdk"
}
if (-not (Test-Path $AndroidHome)) {
    Write-Host "[ERROR] Android SDK not found!" -ForegroundColor Red
    Write-Host "  Set ANDROID_HOME or install Android Studio" -ForegroundColor Yellow
    exit 1
}
$env:ANDROID_HOME = $AndroidHome
Write-Host "[OK] ANDROID_HOME: $AndroidHome" -ForegroundColor Green

# Node.js
$NodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js: $NodeVersion" -ForegroundColor Green

# Navigate to project
Set-Location $AndroidDir

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "[INFO] Installing npm dependencies..." -ForegroundColor Cyan
    npm install
}

# Clean if requested
if ($Clean) {
    Write-Host ""
    Write-Host "[INFO] Cleaning build..." -ForegroundColor Cyan
    Set-Location android
    .\gradlew clean
    Set-Location ..
}

# Build
Write-Host ""
$BuildType = if ($Release) { "Release" } else { "Debug" }
Write-Host "[INFO] Building $BuildType APK..." -ForegroundColor Cyan

Set-Location android

if ($Release) {
    # Check for keystore
    $KeystorePath = "app\release.keystore"
    if (-not (Test-Path $KeystorePath)) {
        Write-Host "[WARN] Release keystore not found, creating debug-signed release..." -ForegroundColor Yellow
        Write-Host "  For production, create a keystore with:" -ForegroundColor Gray
        Write-Host "  keytool -genkey -v -keystore release.keystore -alias birdsound -keyalg RSA -keysize 2048 -validity 10000" -ForegroundColor Gray
    }
    
    .\gradlew assembleRelease
    $ApkPath = "app\build\outputs\apk\release\app-release.apk"
} else {
    .\gradlew assembleDebug
    $ApkPath = "app\build\outputs\apk\debug\app-debug.apk"
}

Set-Location ..

# Check result
if ($LASTEXITCODE -eq 0 -and (Test-Path "android\$ApkPath")) {
    $ApkFile = Get-Item "android\$ApkPath"
    
    # Copy to output folder
    $OutputDir = "output"
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    
    $Version = (Get-Content package.json | ConvertFrom-Json).version
    $OutputName = "BirdSound_${Version}_$BuildType.apk"
    Copy-Item "android\$ApkPath" "$OutputDir\$OutputName"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Build Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK: $OutputDir\$OutputName" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round($ApkFile.Length / 1MB, 2)) MB" -ForegroundColor Gray
    
    # Install if requested
    if ($Install) {
        Write-Host ""
        Write-Host "[INFO] Installing APK on device..." -ForegroundColor Cyan
        
        $AdbPath = "$AndroidHome\platform-tools\adb.exe"
        if (Test-Path $AdbPath) {
            # List devices
            $Devices = & $AdbPath devices 2>&1
            Write-Host $Devices
            
            & $AdbPath install -r "$OutputDir\$OutputName"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "[OK] APK installed successfully!" -ForegroundColor Green
                
                # Start app
                Write-Host "[INFO] Starting app..." -ForegroundColor Cyan
                & $AdbPath shell am start -n com.birdsound.app/.MainActivity
            } else {
                Write-Host "[ERROR] Installation failed!" -ForegroundColor Red
            }
        } else {
            Write-Host "[ERROR] ADB not found at: $AdbPath" -ForegroundColor Red
        }
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}
