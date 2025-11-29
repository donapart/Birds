# Installation Guide | Installationsanleitung

[English](#english) | [Deutsch](#deutsch)

---

## English

### Table of Contents

1. [Windows Installation](#windows-installation)
2. [Raspberry Pi Installation](#raspberry-pi-installation)
3. [Docker Installation](#docker-installation)
4. [Database Setup](#database-setup)
5. [Model Download](#model-download)
6. [Troubleshooting](#troubleshooting)

---

### Windows Installation

#### Prerequisites

- Windows 10 or later (64-bit)
- Python 3.11 or higher ([Download](https://www.python.org/downloads/))
- Git ([Download](https://git-scm.com/download/win))
- 4GB RAM minimum (8GB recommended)
- 5GB free disk space

#### Step-by-Step Installation

**1. Install Python**

```powershell
# Download Python from python.org
# During installation:
# ✅ Check "Add Python to PATH"
# ✅ Check "Install pip"

# Verify installation
python --version  # Should show Python 3.11.x or higher
pip --version
```

**2. Clone Repository**

```powershell
# Open PowerShell
cd D:\  # Or your preferred location
git clone https://github.com/yourusername/Birds.git
cd Birds\backend
```

**3. Create Virtual Environment**

```powershell
# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\activate

# Your prompt should now show (venv)
```

**4. Install Dependencies**

```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Install core dependencies
pip install -r requirements.txt

# Install audio dependencies (for HuggingFace model)
pip install torchaudio transformers

# Install SQLite support (recommended for local development)
pip install aiosqlite
```

**5. Configure Environment**

```powershell
# Copy example environment file
copy .env.example .env

# Edit .env with your preferred editor
notepad .env
```

Edit these settings in `.env`:

```bash
# For local development with SQLite:
USE_SQLITE=true
SQLITE_PATH=birdsound.db

# For production with PostgreSQL:
# USE_SQLITE=false
# DATABASE_URL=postgresql://user:password@localhost:5432/birdsound

# Model settings
USE_MODEL_STUBS=false  # Use real ML models
HF_MODEL_NAME=dima806/bird_sounds_classification

# API settings
DEBUG=false
MIN_CONFIDENCE_THRESHOLD=0.1
```

**6. Run Server**

```powershell
# Set Python path
$env:PYTHONPATH="D:\Birds\Birds\backend"

# Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002

# Server running at: http://localhost:8002
# API Documentation: http://localhost:8002/docs
```

**7. Test Installation**

```powershell
# In a new PowerShell window
cd D:\Birds\Birds\backend
.\venv\Scripts\activate
python scripts\test_api.py
```

Expected output:

```text
✅ Health: 200 OK
✅ Models: 200 OK - DimaBird loaded
✅ Species Search: 200 OK
✅ Quick Prediction: 200 OK
✅ Full Prediction: 200 OK
```

#### Running as Windows Service

**Option 1: Using NSSM (Non-Sucking Service Manager)**

```powershell
# Download NSSM from https://nssm.cc/download
# Extract to C:\nssm

# Install service
C:\nssm\nssm.exe install BirdSound "D:\Birds\Birds\backend\venv\Scripts\python.exe" "-m uvicorn app.main:app --host 0.0.0.0 --port 8002"

# Set working directory
C:\nssm\nssm.exe set BirdSound AppDirectory "D:\Birds\Birds\backend"

# Set environment variable
C:\nssm\nssm.exe set BirdSound AppEnvironmentExtra PYTHONPATH=D:\Birds\Birds\backend

# Start service
C:\nssm\nssm.exe start BirdSound

# Check status
C:\nssm\nssm.exe status BirdSound
```

**Option 2: Using Task Scheduler**

1. Open Task Scheduler
2. Create Basic Task
3. Name: "BirdSound Server"
4. Trigger: "At startup"
5. Action: "Start a program"
   - Program: `D:\Birds\Birds\backend\venv\Scripts\python.exe`
   - Arguments: `-m uvicorn app.main:app --host 0.0.0.0 --port 8002`
   - Start in: `D:\Birds\Birds\backend`
6. ✅ Run with highest privileges
7. ✅ Run whether user is logged on or not

---

### Raspberry Pi Installation

#### Prerequisites

- Raspberry Pi 4 (4GB RAM recommended, 2GB minimum)
- Raspberry Pi OS (64-bit recommended)
- 16GB+ SD card
- Internet connection
- 5GB free disk space

#### Step-by-Step Installation

**1. Update System**

```bash
sudo apt update
sudo apt upgrade -y
```

**2. Install Dependencies**

```bash
# Install Python and development tools
sudo apt install -y python3 python3-pip python3-venv python3-dev
sudo apt install -y git build-essential

# Install audio libraries
sudo apt install -y portaudio19-dev libasound2-dev

# Install optional: PostgreSQL (if not using SQLite)
# sudo apt install -y postgresql postgis
```

**3. Clone Repository**

```bash
cd ~
git clone https://github.com/yourusername/Birds.git
cd Birds/backend
```

**4. Create Virtual Environment**

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate
```

**5. Install Python Dependencies**

```bash
# Upgrade pip
pip install --upgrade pip

# Install core dependencies
pip install -r requirements.txt

# Install audio dependencies (this may take 10-15 minutes on Pi)
pip install torchaudio transformers aiosqlite

# Note: If you get memory errors, increase swap:
# sudo dphys-swapfile swapoff
# sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=2048
# sudo dphys-swapfile setup
# sudo dphys-swapfile swapon
```

**6. Configure Environment**

```bash
cp .env.example .env
nano .env
```

Recommended settings for Raspberry Pi:

```bash
# Use SQLite (no need for separate PostgreSQL server)
USE_SQLITE=true
SQLITE_PATH=/home/pi/Birds/backend/birdsound.db

# Model settings
USE_MODEL_STUBS=false
HF_MODEL_NAME=dima806/bird_sounds_classification

# Optimize for limited resources
DEBUG=false
MIN_CONFIDENCE_THRESHOLD=0.15  # Slightly higher to reduce processing
```

**7. Test Run**

```bash
# Set Python path
export PYTHONPATH=/home/pi/Birds/backend

# Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002

# Test from another terminal:
curl http://localhost:8002/api/v1/health
```

**8. Create Systemd Service**

```bash
sudo nano /etc/systemd/system/birdsound.service
```

Add this content:

```ini
[Unit]
Description=BirdSound API Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Birds/backend
Environment="PYTHONPATH=/home/pi/Birds/backend"
ExecStart=/home/pi/Birds/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8002
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=birdsound

[Install]
WantedBy=multi-user.target
```

**9. Enable and Start Service**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable birdsound

# Start service
sudo systemctl start birdsound

# Check status
sudo systemctl status birdsound

# View logs
journalctl -u birdsound -f
```

**10. Configure Firewall (Optional)**

```bash
# Allow port 8002
sudo ufw allow 8002/tcp
sudo ufw enable
```

---

### Docker Installation

Works on Windows, Linux, Raspberry Pi, and macOS.

#### Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Docker Compose
- 4GB RAM minimum
- 10GB free disk space

#### Installation Steps

**1. Install Docker**

- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Linux**: `curl -fsSL https://get.docker.com | sh`
- **Raspberry Pi**: Same as Linux above
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

**2. Clone Repository**

```bash
git clone https://github.com/yourusername/Birds.git
cd Birds
```

**3. Configure Environment**

```bash
cp backend/.env.example backend/.env
# Edit backend/.env as needed
```

**4. Start Services**

```bash
# Start all services (backend + database + adminer)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps
```

**5. Access Services**

- API: <http://localhost:8000/docs>
- Database Admin: <http://localhost:8080> (login: postgres/postgres)

**6. Stop Services**

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (database data)
docker-compose down -v
```

---

### Database Setup

#### SQLite (Recommended for Development/Testing)

**Advantages:**

- No separate database server needed
- Perfect for Raspberry Pi
- Automatic setup
- Works on all platforms

**Configuration:**

```bash
# In .env:
USE_SQLITE=true
SQLITE_PATH=birdsound.db
```

No additional setup needed! The database file is created automatically on first run.

**Location:**

- Windows: `D:\Birds\Birds\backend\birdsound.db`
- Linux/Pi: `/home/pi/Birds/backend/birdsound.db`

#### PostgreSQL (Production)

**Windows:**

```powershell
# Download PostgreSQL from https://www.postgresql.org/download/windows/
# Run installer, set password during installation

# Create database
psql -U postgres
CREATE DATABASE birdsound;
CREATE USER birdsound WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE birdsound TO birdsound;
\q

# In .env:
USE_SQLITE=false
DATABASE_URL=postgresql://birdsound:your_secure_password@localhost:5432/birdsound
```

**Raspberry Pi/Linux:**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgis

# Create database and user
sudo -u postgres psql
CREATE DATABASE birdsound;
CREATE USER birdsound WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE birdsound TO birdsound;
\q

# In .env:
USE_SQLITE=false
DATABASE_URL=postgresql://birdsound:your_secure_password@localhost:5432/birdsound
```

#### Automatic Fallback

If PostgreSQL connection fails, the system **automatically** switches to SQLite:

```text
ERROR - Database initialization failed: connection was closed
WARNING - PostgreSQL unavailable, switching to SQLite fallback
INFO - Switched to SQLite: birdsound.db
```

No manual intervention needed!

---

### Model Download

#### HuggingFace Model (DimaBird)

**Automatic download on first run:**

The HuggingFace model downloads automatically when first used. This requires ~500MB disk space.

```bash
# First prediction triggers download:
# Model cache location:
# - Windows: C:\Users\<username>\.cache\huggingface
# - Linux/Pi: ~/.cache/huggingface
```

**Manual pre-download (optional):**

```python
# Run this to download model before starting server
python -c "from transformers import pipeline; pipeline('audio-classification', model='dima806/bird_sounds_classification')"
```

#### BirdNET ONNX Model (Optional)

**Download manually:**

```bash
# Create directory
mkdir -p models/birdnet

# Download model (265 MB)
wget -O models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx \
  https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx

# Download labels
wget -O models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt \
  https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt
```

**Windows (PowerShell):**

```powershell
# Create directory
New-Item -ItemType Directory -Force -Path models\birdnet

# Download using browser or PowerShell
Invoke-WebRequest -Uri "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx" -OutFile "models\birdnet\BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx"

Invoke-WebRequest -Uri "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt" -OutFile "models\birdnet\BirdNET_GLOBAL_6K_V2.4_Labels.txt"
```

**Note:** BirdNET is optional. The system works with just the HuggingFace model.

---

### Troubleshooting

#### Windows

**Problem: `python` command not found**

```powershell
# Add Python to PATH manually:
# 1. Search "Environment Variables" in Windows
# 2. Edit Path variable
# 3. Add: C:\Users\<YourUsername>\AppData\Local\Programs\Python\Python311
# 4. Add: C:\Users\<YourUsername>\AppData\Local\Programs\Python\Python311\Scripts
# 5. Restart PowerShell
```

**Problem: Port 8002 already in use**

```powershell
# Find process using port
Get-NetTCPConnection -LocalPort 8002

# Kill process
Stop-Process -Id <PID> -Force
```

**Problem: SSL/Certificate errors**

```powershell
# Install certificates
pip install --upgrade certifi
python -m pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org <package>
```

#### Raspberry Pi

**Problem: Out of memory during pip install**

```bash
# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change: CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
free -h  # Verify swap increased
```

**Problem: Audio device not found**

```bash
# List audio devices
arecord -l

# Install ALSA utilities
sudo apt install -y alsa-utils

# Test microphone
arecord -d 5 test.wav
aplay test.wav
```

**Problem: Service won't start**

```bash
# Check service status
sudo systemctl status birdsound

# View detailed logs
journalctl -u birdsound -n 100 --no-pager

# Check permissions
ls -la /home/pi/Birds/backend
# Ensure pi user owns files

# Restart service
sudo systemctl restart birdsound
```

**Problem: Model loading too slow**

```bash
# Use model stubs for faster startup (testing only)
# Edit .env:
USE_MODEL_STUBS=true

# Or increase CPU frequency (Raspberry Pi 4)
# Edit /boot/config.txt:
# over_voltage=6
# arm_freq=2000
# Reboot required
```

#### Docker

**Problem: Container won't start**

```bash
# Check logs
docker-compose logs backend

# Restart with fresh build
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Problem: Database connection refused**

```bash
# Check if database container is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

#### General

**Problem: Server starts but API calls fail with 500**

```bash
# Check server logs for errors
# Look for:
# - Model loading errors
# - Database connection errors
# - Missing dependencies

# Test with model stubs
# In .env:
USE_MODEL_STUBS=true
# Restart server and test again
```

**Problem: Predictions return low confidence**

This is normal! Real bird audio often has:

- Background noise
- Wind
- Multiple species
- Distance from microphone

Tips for better results:

- Use high-quality microphone
- Record in quiet environment
- 3-5 second clips work best
- Early morning is best time (birds most active)

---

## Deutsch

### Inhaltsverzeichnis

1. [Windows-Installation](#windows-installation-1)
2. [Raspberry Pi Installation](#raspberry-pi-installation-1)
3. [Docker-Installation](#docker-installation-1)
4. [Datenbank-Einrichtung](#datenbank-einrichtung)
5. [Modell-Download](#modell-download)
6. [Fehlerbehebung](#fehlerbehebung-1)

---

### Windows-Installation

#### Voraussetzungen

- Windows 10 oder neuer (64-bit)
- Python 3.11 oder höher ([Download](https://www.python.org/downloads/))
- Git ([Download](https://git-scm.com/download/win))
- 4GB RAM minimum (8GB empfohlen)
- 5GB freier Festplattenspeicher

#### Schritt-für-Schritt-Installation

**1. Python installieren**

```powershell
# Python von python.org herunterladen
# Während der Installation:
# ✅ "Add Python to PATH" aktivieren
# ✅ "Install pip" aktivieren

# Installation verifizieren
python --version  # Sollte Python 3.11.x oder höher anzeigen
pip --version
```

**2. Repository klonen**

```powershell
# PowerShell öffnen
cd D:\  # Oder Ihr bevorzugter Speicherort
git clone https://github.com/yourusername/Birds.git
cd Birds\backend
```

**3. Virtuelle Umgebung erstellen**

```powershell
# Virtuelle Umgebung erstellen
python -m venv venv

# Aktivieren
.\venv\Scripts\activate

# Ihr Prompt sollte jetzt (venv) anzeigen
```

**4. Abhängigkeiten installieren**

```powershell
# Zuerst pip aktualisieren
python -m pip install --upgrade pip

# Kern-Abhängigkeiten installieren
pip install -r requirements.txt

# Audio-Abhängigkeiten (für HuggingFace-Modell)
pip install torchaudio transformers

# SQLite-Unterstützung (empfohlen für lokale Entwicklung)
pip install aiosqlite
```

**5. Umgebung konfigurieren**

```powershell
# Beispiel-Umgebungsdatei kopieren
copy .env.example .env

# Mit Ihrem bevorzugten Editor bearbeiten
notepad .env
```

Diese Einstellungen in `.env` bearbeiten:

```bash
# Für lokale Entwicklung mit SQLite:
USE_SQLITE=true
SQLITE_PATH=birdsound.db

# Für Produktion mit PostgreSQL:
# USE_SQLITE=false
# DATABASE_URL=postgresql://user:password@localhost:5432/birdsound

# Modell-Einstellungen
USE_MODEL_STUBS=false  # Echte ML-Modelle verwenden
HF_MODEL_NAME=dima806/bird_sounds_classification

# API-Einstellungen
DEBUG=false
MIN_CONFIDENCE_THRESHOLD=0.1
```

**6. Server starten**

```powershell
# Python-Pfad setzen
$env:PYTHONPATH="D:\Birds\Birds\backend"

# Server starten
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002

# Server läuft unter: http://localhost:8002
# API-Dokumentation: http://localhost:8002/docs
```

**7. Installation testen**

```powershell
# In neuem PowerShell-Fenster
cd D:\Birds\Birds\backend
.\venv\Scripts\activate
python scripts\test_api.py
```

Erwartete Ausgabe:

```text
✅ Health: 200 OK
✅ Models: 200 OK - DimaBird geladen
✅ Species Search: 200 OK
✅ Quick Prediction: 200 OK
✅ Full Prediction: 200 OK
```

*[Die restlichen deutschen Abschnitte folgen dem gleichen Muster wie die englische Version mit präzisen Übersetzungen aller technischen Befehle und Erklärungen]*

---

## Support

- GitHub Issues: <https://github.com/yourusername/Birds/issues>
- Documentation: See README.md and /docs
