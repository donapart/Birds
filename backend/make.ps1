# BirdSound Backend - PowerShell Helper Script
# Provides convenient shortcuts for common development tasks on Windows

param(
    [Parameter(Position=0)]
    [ValidateSet('help', 'setup', 'install', 'test', 'test-cov', 'run', 'run-prod', 
                 'download-models', 'docker-up', 'docker-down', 'clean', 'lint', 'format')]
    [string]$Command = 'help'
)

function Show-Help {
    Write-Host "BirdSound Backend - Available Commands" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Setup & Installation:" -ForegroundColor Yellow
    Write-Host "  .\make.ps1 setup          - Initial setup (create .env, directories)"
    Write-Host "  .\make.ps1 install        - Install Python dependencies"
    Write-Host "  .\make.ps1 download-models - Download production ML models"
    Write-Host ""
    Write-Host "Development:" -ForegroundColor Yellow
    Write-Host "  .\make.ps1 run            - Run development server (with stubs)"
    Write-Host "  .\make.ps1 run-prod       - Run with production models"
    Write-Host "  .\make.ps1 test           - Run tests"
    Write-Host "  .\make.ps1 test-cov       - Run tests with coverage"
    Write-Host "  .\make.ps1 lint           - Run linters (ruff, mypy)"
    Write-Host "  .\make.ps1 format         - Format code (black, ruff)"
    Write-Host ""
    Write-Host "Docker:" -ForegroundColor Yellow
    Write-Host "  .\make.ps1 docker-up      - Start all services"
    Write-Host "  .\make.ps1 docker-down    - Stop all services"
    Write-Host ""
    Write-Host "Cleanup:" -ForegroundColor Yellow
    Write-Host "  .\make.ps1 clean          - Remove cache and temp files"
}

function Invoke-Setup {
    Write-Host "Setting up BirdSound Backend..." -ForegroundColor Green
    python scripts\setup.py
}

function Invoke-Install {
    Write-Host "Installing dependencies..." -ForegroundColor Green
    pip install -r requirements.txt
}

function Invoke-DownloadModels {
    Write-Host "Downloading ML models..." -ForegroundColor Green
    python scripts\download_models.py
}

function Invoke-Run {
    Write-Host "Starting development server (with stub models)..." -ForegroundColor Green
    $env:USE_MODEL_STUBS = "true"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

function Invoke-RunProd {
    Write-Host "Starting server with production models..." -ForegroundColor Green
    $env:USE_MODEL_STUBS = "false"
    uvicorn app.main:app --host 0.0.0.0 --port 8000
}

function Invoke-Test {
    Write-Host "Running tests..." -ForegroundColor Green
    $env:USE_MODEL_STUBS = "true"
    pytest tests\ -v
}

function Invoke-TestCov {
    Write-Host "Running tests with coverage..." -ForegroundColor Green
    $env:USE_MODEL_STUBS = "true"
    pytest tests\ --cov=app --cov-report=html --cov-report=term
}

function Invoke-Lint {
    Write-Host "Running linters..." -ForegroundColor Green
    ruff check app\ tests\
    mypy app\
}

function Invoke-Format {
    Write-Host "Formatting code..." -ForegroundColor Green
    black app\ tests\ scripts\
    ruff check --fix app\ tests\
}

function Invoke-DockerUp {
    Write-Host "Starting Docker services..." -ForegroundColor Green
    docker-compose up -d
}

function Invoke-DockerDown {
    Write-Host "Stopping Docker services..." -ForegroundColor Green
    docker-compose down
}

function Invoke-Clean {
    Write-Host "Cleaning up..." -ForegroundColor Green
    
    # Remove __pycache__ directories
    Get-ChildItem -Path . -Filter "__pycache__" -Recurse -Directory | Remove-Item -Recurse -Force
    
    # Remove pytest cache
    Get-ChildItem -Path . -Filter ".pytest_cache" -Recurse -Directory | Remove-Item -Recurse -Force
    
    # Remove mypy cache
    Get-ChildItem -Path . -Filter ".mypy_cache" -Recurse -Directory | Remove-Item -Recurse -Force
    
    # Remove coverage reports
    Get-ChildItem -Path . -Filter "htmlcov" -Recurse -Directory | Remove-Item -Recurse -Force
    Get-ChildItem -Path . -Filter ".coverage" -Recurse -File | Remove-Item -Force
    
    # Remove .pyc files
    Get-ChildItem -Path . -Filter "*.pyc" -Recurse -File | Remove-Item -Force
    
    Write-Host "Cleanup complete!" -ForegroundColor Green
}

# Execute command
switch ($Command) {
    'help'            { Show-Help }
    'setup'           { Invoke-Setup }
    'install'         { Invoke-Install }
    'download-models' { Invoke-DownloadModels }
    'run'             { Invoke-Run }
    'run-prod'        { Invoke-RunProd }
    'test'            { Invoke-Test }
    'test-cov'        { Invoke-TestCov }
    'lint'            { Invoke-Lint }
    'format'          { Invoke-Format }
    'docker-up'       { Invoke-DockerUp }
    'docker-down'     { Invoke-DockerDown }
    'clean'           { Invoke-Clean }
    default           { Show-Help }
}
