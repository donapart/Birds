# ============================================================
# BirdSound Backend Runner mit Auto-Restart (Hintergrund)
# ============================================================
# Startet das Backend als Hintergrund-Prozess mit Auto-Restart
# Verwendung: powershell -WindowStyle Hidden -File start_backend_bg.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$BackendPath = "D:\Projekte\Birds\backend"
$PythonExe = "$BackendPath\venv\Scripts\python.exe"
$LogFile = "$BackendPath\logs\backend.log"
$MaxRestarts = 100
$RestartDelay = 5

# Erstelle Log-Verzeichnis
New-Item -ItemType Directory -Path "$BackendPath\logs" -Force | Out-Null

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LogFile -Append | Write-Host
}

function Test-BackendRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction Stop
        return $response.status -eq "healthy"
    } catch {
        return $false
    }
}

function Start-Ngrok {
    $ngrok = Get-Process -Name ngrok -ErrorAction SilentlyContinue
    if (-not $ngrok) {
        Write-Log "Starting ngrok..."
        Start-Process ngrok -ArgumentList "http", "8000" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
}

Write-Log "============================================"
Write-Log "BirdSound Backend Runner started"
Write-Log "============================================"

$restartCount = 0

while ($restartCount -lt $MaxRestarts) {
    # Prüfe ob bereits läuft
    if (Test-BackendRunning) {
        Write-Log "Backend already running, monitoring..."
        Start-Ngrok
        Start-Sleep -Seconds 30
        continue
    }
    
    # Stoppe alte Prozesse
    $oldProcesses = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    foreach ($conn in $oldProcesses) {
        try {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        } catch {}
    }
    Start-Sleep -Seconds 2
    
    Write-Log "Starting backend (attempt $($restartCount + 1))..."
    
    # Starte Backend
    $process = Start-Process -FilePath $PythonExe `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
        -WorkingDirectory $BackendPath `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput "$BackendPath\logs\stdout.log" `
        -RedirectStandardError "$BackendPath\logs\stderr.log"
    
    # Warte auf Start
    $startTime = Get-Date
    $timeout = 120  # 2 Minuten Timeout für Model-Loading
    
    while (-not (Test-BackendRunning)) {
        if ($process.HasExited) {
            Write-Log "Backend process exited with code $($process.ExitCode)"
            break
        }
        
        $elapsed = (Get-Date) - $startTime
        if ($elapsed.TotalSeconds -gt $timeout) {
            Write-Log "Backend startup timeout after $timeout seconds"
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            break
        }
        
        Start-Sleep -Seconds 5
    }
    
    if (Test-BackendRunning) {
        Write-Log "Backend started successfully!"
        Start-Ngrok
        
        # Überwache Backend
        while (-not $process.HasExited) {
            Start-Sleep -Seconds 10
            
            if (-not (Test-BackendRunning)) {
                Write-Log "Backend health check failed, restarting..."
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                break
            }
        }
        
        Write-Log "Backend process exited with code $($process.ExitCode)"
    }
    
    $restartCount++
    Write-Log "Restarting in $RestartDelay seconds... (restart $restartCount/$MaxRestarts)"
    Start-Sleep -Seconds $RestartDelay
}

Write-Log "Max restarts reached. Exiting."
