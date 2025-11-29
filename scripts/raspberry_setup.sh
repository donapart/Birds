#!/bin/bash
# ================================================================
# BirdSound - Raspberry Pi Setup Script
# ================================================================
# Run as: sudo bash scripts/raspberry_setup.sh
# 
# Tested on: Raspberry Pi 4/5 with Raspberry Pi OS (Bookworm)
# ================================================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🐦 BirdSound - Raspberry Pi Setup                   ║"
echo "╚════════════════════════════════════════════════════════════╝"

# ================================================================
# Configuration
# ================================================================

INSTALL_DIR="/opt/birdsound"
SERVICE_USER="birdsound"
PYTHON_VERSION="3.11"
REPO_URL="https://github.com/donapart/Birds.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ================================================================
# Check Prerequisites
# ================================================================

if [ "$EUID" -ne 0 ]; then
    log_error "Bitte als root ausführen: sudo bash $0"
    exit 1
fi

log_info "Prüfe System..."
ARCH=$(uname -m)
if [[ "$ARCH" != "aarch64" && "$ARCH" != "armv7l" ]]; then
    log_warn "Unerwartete Architektur: $ARCH"
fi

# ================================================================
# System Update
# ================================================================

log_info "System-Update wird durchgeführt..."
apt update && apt upgrade -y

# ================================================================
# Install Dependencies
# ================================================================

log_info "Installiere System-Abhängigkeiten..."
apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    git \
    curl \
    wget \
    ffmpeg \
    libsndfile1 \
    libasound2-dev \
    portaudio19-dev \
    libffi-dev \
    libssl-dev \
    libatlas-base-dev \
    libopenblas-dev \
    libjpeg-dev \
    zlib1g-dev \
    sqlite3

# Optional: PostgreSQL (statt SQLite)
# apt install -y postgresql postgresql-contrib libpq-dev

# ================================================================
# Create Service User
# ================================================================

log_info "Erstelle Service-Benutzer: $SERVICE_USER"
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -m -d "$INSTALL_DIR" -s /bin/bash "$SERVICE_USER"
    usermod -aG audio "$SERVICE_USER"  # Für Mikrofon-Zugriff
fi

# ================================================================
# Clone Repository
# ================================================================

log_info "Klone Repository nach $INSTALL_DIR..."
if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "Repository existiert, führe git pull aus..."
    cd "$INSTALL_DIR"
    sudo -u "$SERVICE_USER" git pull
else
    rm -rf "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
fi

# ================================================================
# Python Virtual Environment
# ================================================================

log_info "Erstelle Python Virtual Environment..."
cd "$INSTALL_DIR/backend"

sudo -u "$SERVICE_USER" python3 -m venv venv
source venv/bin/activate

log_info "Installiere Python-Pakete (kann mehrere Minuten dauern)..."

# Upgrade pip
pip install --upgrade pip wheel setuptools

# Install requirements with special handling for ARM
pip install numpy==1.26.4
pip install scipy==1.11.4
pip install librosa==0.10.1
pip install soundfile==0.12.1

# TensorFlow Lite für Raspberry Pi (statt volles TensorFlow)
pip install tflite-runtime

# BirdNET (nutzt TensorFlow)
pip install birdnet

# FastAPI und Web-Server
pip install fastapi uvicorn[standard] python-multipart

# Weitere Abhängigkeiten
pip install \
    pydantic \
    pydantic-settings \
    sqlalchemy \
    aiosqlite \
    httpx \
    python-jose \
    passlib

# ================================================================
# Configuration
# ================================================================

log_info "Erstelle Konfiguration..."

cat > "$INSTALL_DIR/backend/.env" << EOF
# BirdSound Raspberry Pi Configuration
# Generated: $(date)

# Database (SQLite für Raspberry Pi)
DATABASE_URL=sqlite+aiosqlite:///$INSTALL_DIR/data/birdsound.db

# Server
HOST=0.0.0.0
PORT=8003
DEBUG=false

# Models
USE_MODEL_STUBS=false
BIRDNET_VERSION=2.4

# Audio
AUDIO_SAMPLE_RATE=48000
AUDIO_STORAGE_PATH=$INSTALL_DIR/audio_storage

# Logging
LOG_LEVEL=INFO
EOF

# Erstelle Datenverzeichnisse
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/audio_storage"
mkdir -p "$INSTALL_DIR/logs"
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

# ================================================================
# Systemd Service
# ================================================================

log_info "Erstelle systemd Service..."

cat > /etc/systemd/system/birdsound.service << EOF
[Unit]
Description=BirdSound - Bird Sound Recognition API
Documentation=https://github.com/donapart/Birds
After=network.target
Wants=network-online.target

[Service]
Type=exec
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
Environment="PYTHONPATH=$INSTALL_DIR/backend"
ExecStart=$INSTALL_DIR/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8003
Restart=always
RestartSec=10

# Logging
StandardOutput=append:$INSTALL_DIR/logs/birdsound.log
StandardError=append:$INSTALL_DIR/logs/birdsound-error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$INSTALL_DIR

[Install]
WantedBy=multi-user.target
EOF

# ================================================================
# Enable and Start Service
# ================================================================

log_info "Aktiviere und starte Service..."
systemctl daemon-reload
systemctl enable birdsound
systemctl start birdsound

# ================================================================
# Firewall (optional)
# ================================================================

if command -v ufw &> /dev/null; then
    log_info "Öffne Port 8003 in der Firewall..."
    ufw allow 8003/tcp
fi

# ================================================================
# Log Rotation
# ================================================================

cat > /etc/logrotate.d/birdsound << EOF
$INSTALL_DIR/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload birdsound > /dev/null 2>&1 || true
    endscript
}
EOF

# ================================================================
# Print Summary
# ================================================================

IP_ADDR=$(hostname -I | awk '{print $1}')

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ✅ Installation abgeschlossen!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Installation: $INSTALL_DIR"
echo "🌐 Web-Interface: http://$IP_ADDR:8003"
echo "📊 API-Docs: http://$IP_ADDR:8003/docs"
echo ""
echo "📋 Nützliche Befehle:"
echo "   sudo systemctl status birdsound   # Status prüfen"
echo "   sudo systemctl restart birdsound  # Neustart"
echo "   sudo journalctl -u birdsound -f   # Live-Logs"
echo "   tail -f $INSTALL_DIR/logs/birdsound.log"
echo ""
echo "🔧 Konfiguration bearbeiten:"
echo "   sudo nano $INSTALL_DIR/backend/.env"
echo ""
log_info "Der Server sollte in wenigen Sekunden erreichbar sein."
