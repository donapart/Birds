# BirdSound Windows Installer Build Script
# 
# Prerequisites:
#   1. Inno Setup 6.x: https://jrsoftware.org/isdl.php
#   2. After installing, add to PATH or use full path
#
# Usage:
#   .\build_installer.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BirdSound Windows Installer Builder" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Find Inno Setup
$InnoSetup = $null
$SearchPaths = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

foreach ($path in $SearchPaths) {
    if (Test-Path $path) {
        $InnoSetup = $path
        break
    }
}

if (-not $InnoSetup) {
    Write-Host "[ERROR] Inno Setup not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Inno Setup 6 from:" -ForegroundColor Yellow
    Write-Host "  https://jrsoftware.org/isdl.php" -ForegroundColor Cyan
    Write-Host ""
    
    $response = Read-Host "Open download page? (y/n)"
    if ($response -eq 'y') {
        Start-Process "https://jrsoftware.org/isdl.php"
    }
    exit 1
}

Write-Host "[OK] Found Inno Setup: $InnoSetup" -ForegroundColor Green

# Create assets directory
$AssetsDir = "$ProjectRoot\installer\assets"
if (-not (Test-Path $AssetsDir)) {
    New-Item -ItemType Directory -Path $AssetsDir -Force | Out-Null
}

# Create output directory
$OutputDir = "$ProjectRoot\installer\output"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Check for icon (create placeholder if missing)
$IconPath = "$AssetsDir\birdsound.ico"
if (-not (Test-Path $IconPath)) {
    Write-Host "[WARN] Icon not found, will use default" -ForegroundColor Yellow
    Write-Host "  Place your icon at: $IconPath" -ForegroundColor Gray
}

# Build installer
Write-Host ""
Write-Host "[INFO] Building installer..." -ForegroundColor Cyan

try {
    & $InnoSetup "$ProjectRoot\installer\BirdSound_Setup.iss"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Build Successful!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
        $OutputFile = Get-ChildItem "$OutputDir\*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($OutputFile) {
            Write-Host "Installer: $($OutputFile.FullName)" -ForegroundColor Cyan
            Write-Host "Size: $([math]::Round($OutputFile.Length / 1MB, 2)) MB" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Build failed: $_" -ForegroundColor Red
    exit 1
}
