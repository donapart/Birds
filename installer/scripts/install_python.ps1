# BirdSound Python Environment Setup
# Run as Administrator

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BirdSound - Python Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$InstallDir = Split-Path -Parent $PSScriptRoot
Set-Location $InstallDir

# Check Python
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py -3")) {
    try {
        $version = & $cmd.Split()[0] ($cmd.Split()[1..($cmd.Split().Count-1)]) --version 2>&1
        if ($version -match "Python 3\.(1[1-9]|[2-9][0-9])") {
            $pythonCmd = $cmd
            Write-Host "[OK] Found $version" -ForegroundColor Green
            break
        }
    } catch {}
}

if (-not $pythonCmd) {
    Write-Host "[ERROR] Python 3.11+ not found!" -ForegroundColor Red
    Write-Host "Please install Python from https://python.org" -ForegroundColor Yellow
    Write-Host ""
    
    # Offer to download Python
    $response = Read-Host "Download Python now? (y/n)"
    if ($response -eq 'y') {
        Start-Process "https://www.python.org/downloads/"
    }
    exit 1
}

# Create virtual environment
Write-Host ""
Write-Host "[INFO] Creating virtual environment..." -ForegroundColor Cyan

if (Test-Path "venv") {
    Write-Host "[INFO] venv already exists, skipping creation" -ForegroundColor Yellow
} else {
    & $pythonCmd.Split()[0] ($pythonCmd.Split()[1..($pythonCmd.Split().Count-1)]) -m venv venv
}

# Activate venv
Write-Host "[INFO] Activating environment..." -ForegroundColor Cyan
& "$InstallDir\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "[INFO] Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install requirements
Write-Host "[INFO] Installing dependencies..." -ForegroundColor Cyan
pip install -r backend\requirements.txt

# Install ML packages
Write-Host "[INFO] Installing ML packages..." -ForegroundColor Cyan
pip install birdnet tf-keras aiosqlite

# Create .env if not exists
$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "[INFO] Creating default .env..." -ForegroundColor Cyan
    @"
USE_SQLITE=true
USE_MODEL_STUBS=false
DEBUG=false
AUDIO_SAMPLE_RATE=48000
MIN_CONFIDENCE_THRESHOLD=0.1
TOP_N_PREDICTIONS=5
"@ | Out-File -FilePath $envFile -Encoding utf8
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Run 'start_birdsound.bat' to start the server" -ForegroundColor Cyan
Write-Host "Web UI: http://localhost:8003" -ForegroundColor Cyan
Write-Host ""
