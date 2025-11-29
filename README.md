# BirdSound - Echtzeit-Vogelstimmen-Erkennung

[English](#english) | [Deutsch](#deutsch)

Ein umfassendes System zur automatischen Erkennung von Vogelstimmen mittels Machine Learning. Das System analysiert kontinuierlich Audio-Eingaben, identifiziert Vogelarten und speichert Erkennungen mit GPS-Koordinaten.

---

## Inhaltsverzeichnis

- [Features](#features)
- [Architektur](#architektur)
- [Systemanforderungen](#systemanforderungen)
- [Installation](#installation)
  - [Docker (Empfohlen)](#docker-installation-empfohlen)
  - [Linux/macOS](#linuxmacos-installation)
  - [Windows](#windows-installation)
  - [Raspberry Pi](#raspberry-pi-installation)
- [Konfiguration](#konfiguration)
- [API-Dokumentation](#api-dokumentation)
- [Frontend](#frontend)
- [Mobile Apps](#mobile-apps)
- [ML-Modelle](#ml-modelle)
- [Entwicklung](#entwicklung)
- [Troubleshooting](#troubleshooting)

---

## Features

### Kern-Funktionalität
- **Echtzeit-Audioanalyse**: Kontinuierliche Überwachung mit 3-Sekunden-Fenstern
- **Multi-Modell-Inferenz**: Parallele Analyse mit BirdNET und HuggingFace-Modellen
- **Konsens-Voting**: Intelligente Zusammenführung der Modell-Vorhersagen
- **GPS-Tagging**: Automatische Standort-Zuordnung aller Erkennungen
- **Offline-Fähigkeit**: Lokale Verarbeitung ohne Internet-Verbindung
- **Mehrsprachigkeit**: Deutsch und Englisch (DE/EN)

### Backend
- **FastAPI**: Hochperformanter async REST-API Server
- **WebSocket**: Echtzeit-Streaming von Erkennungen
- **PostgreSQL/PostGIS**: Geo-fähige Datenbank für Aufnahmen
- **Redis**: Caching und Message-Broker
- **Celery**: Hintergrund-Aufgaben und Batch-Verarbeitung

### Frontend
- **Web-Dashboard**: Interaktive Karte, Timeline, Statistiken
- **Mehrsprachigkeit**: Deutsch und Englisch umschaltbar
- **Responsive Design**: Optimiert für Desktop und Mobile
- **Live-Updates**: WebSocket-basierte Echtzeit-Anzeige

### Daten & Export
- **60+ Vogelarten**: Europäische Arten mit deutschem Fokus
- **Export-Formate**: CSV, JSON, GeoJSON
- **Spektrogramme**: Visuelle Audio-Analyse
- **S3-Speicher**: Optionale Cloud-Speicherung

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Apps                               │
│                  (Flutter / React Native)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                      FastAPI Backend                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ REST API │  │WebSocket │  │  i18n    │  │  Export  │        │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘        │
│       │             │                                            │
│  ┌────▼─────────────▼────────────────────────────────┐          │
│  │              Prediction Service                    │          │
│  │  ┌─────────────────────────────────────────────┐  │          │
│  │  │            Model Registry                    │  │          │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │  │          │
│  │  │  │ BirdNET │  │HuggingFace│ │ Custom  │     │  │          │
│  │  │  │  ONNX   │  │Transformer│ │ Model   │     │  │          │
│  │  │  └─────────┘  └─────────┘  └─────────┘     │  │          │
│  │  └─────────────────────────────────────────────┘  │          │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
│  PostgreSQL   │ │     Redis     │ │    Celery     │
│   PostGIS     │ │    Cache      │ │    Worker     │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## Systemanforderungen

### Minimum
| Komponente | Anforderung |
|------------|-------------|
| CPU | 2 Kerne, 2.0 GHz |
| RAM | 4 GB |
| Speicher | 10 GB frei |
| Python | 3.10+ |

### Empfohlen
| Komponente | Anforderung |
|------------|-------------|
| CPU | 4+ Kerne, 3.0 GHz |
| RAM | 8+ GB |
| Speicher | 50+ GB SSD |
| GPU | CUDA-fähig (optional) |

### Raspberry Pi
| Modell | Eignung |
|--------|---------|
| Pi 5 (8GB) | Sehr gut |
| Pi 4 (4GB+) | Gut |
| Pi 4 (2GB) | Eingeschränkt |
| Pi 3 | Nicht empfohlen |

---

## Installation

### Docker-Installation (Empfohlen)

Die einfachste Methode für alle Plattformen:

```bash
# Repository klonen
git clone https://github.com/your-repo/Birds.git
cd Birds

# Umgebungsvariablen konfigurieren
cp backend/.env.example backend/.env
nano backend/.env  # Anpassen nach Bedarf

# ML-Modelle herunterladen
mkdir -p models/birdnet
python scripts/download_models.py

# Container starten
docker-compose up -d

# Logs prüfen
docker-compose logs -f api
```

Die Anwendung ist dann verfügbar unter:
- **Web-Dashboard**: http://localhost:8000
- **API-Docs**: http://localhost:8000/docs
- **Flower (Celery)**: http://localhost:5555

---

### Linux/macOS Installation

#### 1. Systemabhängigkeiten

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y \
    python3.11 python3.11-venv python3.11-dev \
    postgresql postgresql-contrib postgis \
    redis-server \
    ffmpeg libsndfile1 portaudio19-dev \
    build-essential libffi-dev
```

**macOS (Homebrew):**
```bash
brew install python@3.11 postgresql postgis redis ffmpeg portaudio libsndfile
brew services start postgresql
brew services start redis
```

#### 2. Datenbank einrichten

```bash
# PostgreSQL-Benutzer und Datenbank erstellen
sudo -u postgres psql << EOF
CREATE USER birdsound WITH PASSWORD 'birdsound_password';
CREATE DATABASE birdsound OWNER birdsound;
\c birdsound
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOF
```

#### 3. Python-Umgebung

```bash
cd Birds/backend

# Virtuelle Umgebung erstellen
python3.11 -m venv venv
source venv/bin/activate

# Abhängigkeiten installieren
pip install --upgrade pip wheel
pip install -r requirements.txt

# ML-Modelle herunterladen
python ../scripts/download_models.py
```

#### 4. Konfiguration

```bash
# .env-Datei erstellen
cat > .env << EOF
DATABASE_URL=postgresql+asyncpg://birdsound:birdsound_password@localhost:5432/birdsound
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=["http://localhost:8000","http://localhost:3000"]
MODEL_PATH=./models
AUDIO_STORAGE_PATH=./audio_storage
EOF
```

#### 5. Datenbank-Migration

```bash
# Alembic-Migrationen ausführen
alembic upgrade head

# Artendatenbank befüllen
python ../scripts/seed_species.py
```

#### 6. Server starten

```bash
# API-Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# In separatem Terminal: Celery Worker
celery -A app.worker.celery_app worker --loglevel=info

# In separatem Terminal: Celery Beat (Scheduler)
celery -A app.worker.celery_app beat --loglevel=info
```

---

### Windows Installation

#### 1. Voraussetzungen installieren

**Python 3.11:**
1. Download von https://www.python.org/downloads/
2. Bei Installation **"Add Python to PATH"** aktivieren
3. "Customize installation" > "pip" und "py launcher" aktivieren

**PostgreSQL 16:**
1. Download von https://www.postgresql.org/download/windows/
2. Installer ausführen, Passwort für `postgres` merken
3. Stack Builder starten: **PostGIS** installieren

**Redis für Windows:**
```powershell
# Option 1: WSL2 (empfohlen)
wsl --install -d Ubuntu
# In WSL:
sudo apt update && sudo apt install redis-server
sudo service redis-server start

# Option 2: Memurai (Redis-kompatibel für Windows)
# Download von https://www.memurai.com/
winget install Memurai.MemuraiDeveloper
```

**FFmpeg:**
```powershell
# Mit winget
winget install FFmpeg

# ODER manuell von https://ffmpeg.org/download.html
# Entpacken nach C:\ffmpeg
# Zum PATH hinzufügen: C:\ffmpeg\bin
```

**Visual Studio Build Tools:**
```powershell
# Für native Python-Pakete (numpy, scipy, etc.)
winget install Microsoft.VisualStudio.2022.BuildTools

# Bei Installation: "Desktop development with C++" auswählen
```

#### 2. Projekt einrichten

```powershell
# PowerShell als Administrator öffnen

# Repository klonen
git clone https://github.com/your-repo/Birds.git
cd Birds\backend

# Virtuelle Umgebung erstellen
python -m venv venv
.\venv\Scripts\Activate.ps1

# Abhängigkeiten installieren
pip install --upgrade pip wheel
pip install -r requirements.txt
```

#### 3. Datenbank konfigurieren

```powershell
# pgAdmin öffnen oder psql verwenden
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres

# In psql:
CREATE USER birdsound WITH PASSWORD 'birdsound_password';
CREATE DATABASE birdsound OWNER birdsound;
\c birdsound
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

#### 4. Umgebungsvariablen

Erstelle Datei `Birds\backend\.env`:
```ini
DATABASE_URL=postgresql+asyncpg://birdsound:birdsound_password@localhost:5432/birdsound
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dein-geheimer-schluessel-hier-32-zeichen-min
CORS_ORIGINS=["http://localhost:8000"]
MODEL_PATH=.\models
AUDIO_STORAGE_PATH=.\audio_storage
DEFAULT_LANGUAGE=de
```

#### 5. Migrationen und Start

```powershell
# Verzeichnisse erstellen
mkdir models, audio_storage -Force

# Migrationen
alembic upgrade head

# Artendatenbank befüllen
python ..\scripts\seed_species.py

# ML-Modelle herunterladen
python ..\scripts\download_models.py

# Server starten
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 6. Windows-Dienst einrichten (Optional)

Mit NSSM (Non-Sucking Service Manager):
```powershell
# NSSM installieren
winget install NSSM.NSSM

# Dienst erstellen
nssm install BirdSoundAPI "C:\Pfad\zu\Birds\backend\venv\Scripts\uvicorn.exe"
nssm set BirdSoundAPI AppParameters "app.main:app --host 0.0.0.0 --port 8000"
nssm set BirdSoundAPI AppDirectory "C:\Pfad\zu\Birds\backend"
nssm set BirdSoundAPI AppEnvironmentExtra "PATH=C:\Pfad\zu\Birds\backend\venv\Scripts"
nssm start BirdSoundAPI

# Dienst verwalten
nssm status BirdSoundAPI
nssm stop BirdSoundAPI
nssm remove BirdSoundAPI
```

#### 7. Windows Firewall konfigurieren

```powershell
# Port 8000 freigeben
New-NetFirewallRule -DisplayName "BirdSound API" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow
```

---

### Raspberry Pi Installation

#### 1. Betriebssystem vorbereiten

**Empfohlen: Raspberry Pi OS (64-bit)**

```bash
# Nach frischer Installation:
sudo apt update && sudo apt upgrade -y

# Konfiguration
sudo raspi-config
# > System Options > Boot > Console Autologin
# > Performance > GPU Memory > 16 (minimieren für mehr RAM)
# > Localisation > Timezone > Europe/Berlin
# > Localisation > Locale > de_DE.UTF-8
```

#### 2. Swap erhöhen (wichtig!)

```bash
# Swap auf 2GB erhöhen (für Kompilierung)
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Prüfen
free -h
```

#### 3. Systemabhängigkeiten

```bash
sudo apt install -y \
    python3.11 python3.11-venv python3.11-dev \
    postgresql postgresql-contrib postgis \
    redis-server \
    ffmpeg libsndfile1 portaudio19-dev \
    libatlas-base-dev libopenblas-dev \
    libjpeg-dev zlib1g-dev \
    build-essential cmake git \
    alsa-utils pulseaudio
```

#### 4. Audio-Hardware konfigurieren

```bash
# USB-Mikrofon anschließen und testen
arecord -l
# Ausgabe zeigt verfügbare Aufnahmegeräte

# ALSA-Konfiguration für USB-Mikrofon
cat > ~/.asoundrc << 'EOF'
pcm.!default {
    type asym
    playback.pcm "plughw:0,0"
    capture.pcm "plughw:1,0"
}
ctl.!default {
    type hw
    card 1
}
EOF

# Mikrofonpegel anpassen
alsamixer  # F6 für Gerätewahl, F4 für Aufnahme

# Test-Aufnahme (5 Sekunden)
arecord -d 5 -f cd -t wav test.wav
aplay test.wav
```

#### 5. PostgreSQL für Pi optimieren

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Folgende Werte anpassen:
```ini
# Speicher-Einstellungen für Pi
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 512MB

# Verbindungen begrenzen
max_connections = 20

# Logging reduzieren
log_min_duration_statement = 1000
```

```bash
sudo systemctl restart postgresql
```

#### 6. Datenbank einrichten

```bash
sudo -u postgres psql << EOF
CREATE USER birdsound WITH PASSWORD 'birdsound_pi';
CREATE DATABASE birdsound OWNER birdsound;
\c birdsound
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
EOF
```

#### 7. Python-Umgebung (Pi-optimiert)

```bash
cd /home/pi
git clone https://github.com/your-repo/Birds.git
cd Birds/backend

# Virtuelle Umgebung
python3.11 -m venv venv
source venv/bin/activate

# Pi-optimierte Installation (einzeln, um Speicher zu sparen)
pip install --upgrade pip wheel

# NumPy mit OpenBLAS (schneller auf ARM)
pip install --no-cache-dir numpy

# Weitere große Pakete einzeln
pip install --no-cache-dir scipy
pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
pip install --no-cache-dir onnxruntime

# Restliche Abhängigkeiten
pip install --no-cache-dir -r requirements.txt
```

#### 8. Konfiguration für Pi

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://birdsound:birdsound_pi@localhost:5432/birdsound
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=pi-secret-key-generiere-zufaellig

# Pi-spezifische Optimierungen
AUDIO_WINDOW_SIZE=3.0
AUDIO_SAMPLE_RATE=32000
MODEL_BATCH_SIZE=1
WORKER_CONCURRENCY=2
CACHE_TTL=600

# Speicherpfade
MODEL_PATH=/home/pi/Birds/models
AUDIO_STORAGE_PATH=/home/pi/Birds/audio_storage

# Sprache
DEFAULT_LANGUAGE=de
EOF
```

#### 9. Verzeichnisse und Migrationen

```bash
mkdir -p /home/pi/Birds/models /home/pi/Birds/audio_storage

# Migrationen
alembic upgrade head

# Arten-Datenbank
python ../scripts/seed_species.py

# ML-Modelle (kann lange dauern)
python ../scripts/download_models.py
```

#### 10. Systemd-Dienste erstellen

**API-Server:**
```bash
sudo nano /etc/systemd/system/birdsound-api.service
```

```ini
[Unit]
Description=BirdSound API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/Birds/backend
Environment="PATH=/home/pi/Birds/backend/venv/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/pi/Birds/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=append:/var/log/birdsound/api.log
StandardError=append:/var/log/birdsound/api-error.log

[Install]
WantedBy=multi-user.target
```

**Celery Worker:**
```bash
sudo nano /etc/systemd/system/birdsound-worker.service
```

```ini
[Unit]
Description=BirdSound Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/Birds/backend
Environment="PATH=/home/pi/Birds/backend/venv/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/pi/Birds/backend/venv/bin/celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Log-Verzeichnis und Dienste aktivieren:**
```bash
# Log-Verzeichnis erstellen
sudo mkdir -p /var/log/birdsound
sudo chown pi:pi /var/log/birdsound

# Dienste aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable birdsound-api birdsound-worker
sudo systemctl start birdsound-api birdsound-worker

# Status prüfen
sudo systemctl status birdsound-api
sudo systemctl status birdsound-worker

# Logs verfolgen
sudo journalctl -u birdsound-api -f
```

#### 11. Audio-Capture Dienst (Optional)

Für automatische kontinuierliche Aufnahme:

```bash
sudo nano /etc/systemd/system/birdsound-capture.service
```

```ini
[Unit]
Description=BirdSound Audio Capture
After=birdsound-api.service sound.target
Requires=birdsound-api.service

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/Birds
Environment="PATH=/home/pi/Birds/backend/venv/bin"
ExecStart=/home/pi/Birds/backend/venv/bin/python scripts/audio_capture.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 12. Pi-Performance-Tipps

```bash
# CPU-Governor auf Performance setzen
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Dauerhaft (in /etc/rc.local vor 'exit 0'):
echo 'echo "performance" > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor' | sudo tee -a /etc/rc.local

# Unnötige Dienste deaktivieren
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable triggerhappy

# GPU-Speicher minimieren (in /boot/config.txt)
# gpu_mem=16
```

---

## Konfiguration

### Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `DATABASE_URL` | PostgreSQL-Verbindung | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis-Verbindung | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT-Signierung | (zufällig generieren) |
| `CORS_ORIGINS` | Erlaubte Origins | `["*"]` |
| `MODEL_PATH` | Pfad zu ML-Modellen | `./models` |
| `AUDIO_STORAGE_PATH` | Audio-Speicherpfad | `./audio_storage` |
| `AUDIO_WINDOW_SIZE` | Analyse-Fenster (Sek.) | `3.0` |
| `AUDIO_SAMPLE_RATE` | Abtastrate (Hz) | `48000` |
| `CONFIDENCE_THRESHOLD` | Min. Konfidenz | `0.5` |
| `DEFAULT_LANGUAGE` | Standard-Sprache | `de` |

### ML-Modell-Konfiguration

```yaml
# config/models.yaml
models:
  birdnet:
    enabled: true
    path: models/birdnet_v2.4.onnx
    labels: models/birdnet_labels.txt
    weight: 1.0

  huggingface:
    enabled: true
    model_id: facebook/wav2vec2-large-xlsr-53
    weight: 0.8

consensus:
  method: weighted_average  # oder: majority_vote, max_confidence
  min_agreement: 0.6
```

---

## API-Dokumentation

### REST-Endpunkte

#### Vorhersage

```bash
# Audio-Datei analysieren
curl -X POST "http://localhost:8000/api/v1/predict" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@bird_recording.wav" \
  -F "latitude=52.52" \
  -F "longitude=13.405"

# Antwort:
{
  "species": "Turdus merula",
  "common_name": "Amsel",
  "confidence": 0.94,
  "models": [
    {"name": "birdnet", "species": "Turdus merula", "confidence": 0.96},
    {"name": "huggingface", "species": "Turdus merula", "confidence": 0.92}
  ],
  "agreement": "2/2",
  "recording_id": "uuid-here"
}

# Schnelle Vorhersage (ohne DB-Speicherung)
curl -X POST "http://localhost:8000/api/v1/predict/quick" \
  -F "audio=@bird.wav"

# Batch-Verarbeitung
curl -X POST "http://localhost:8000/api/v1/predict/batch" \
  -F "files=@bird1.wav" \
  -F "files=@bird2.wav"
```

#### Aufnahmen

```bash
# Liste aller Aufnahmen
curl "http://localhost:8000/api/v1/recordings?limit=20&offset=0"

# Einzelne Aufnahme
curl "http://localhost:8000/api/v1/recordings/{id}"

# Karten-Daten
curl "http://localhost:8000/api/v1/recordings/map/points?limit=100"

# Timeline (letzte 24 Stunden)
curl "http://localhost:8000/api/v1/recordings/timeline?hours=24"

# Statistiken
curl "http://localhost:8000/api/v1/recordings/stats?days=7"

# Modellvergleich
curl "http://localhost:8000/api/v1/recordings/compare?disagreements_only=true"
```

#### Export

```bash
# CSV-Export
curl "http://localhost:8000/api/v1/export/csv?start_date=2024-01-01" -o export.csv

# JSON-Export
curl "http://localhost:8000/api/v1/export/json" -o export.json

# GeoJSON für Karten-Anwendungen
curl "http://localhost:8000/api/v1/export/geojson" -o birds.geojson
```

#### Arten-Datenbank

```bash
# Alle Arten
curl "http://localhost:8000/api/v1/species"

# Suche
curl "http://localhost:8000/api/v1/species/search?q=meise"

# Art-Details
curl "http://localhost:8000/api/v1/species/Parus%20major"
```

#### Mehrsprachigkeit (i18n)

```bash
# Verfügbare Sprachen
curl "http://localhost:8000/api/v1/i18n/languages"

# Übersetzungen laden
curl "http://localhost:8000/api/v1/i18n/translations?lang=de"

# Sprache wechseln
curl -X POST "http://localhost:8000/api/v1/i18n/set-language/en"

# Artennamen in Sprache
curl "http://localhost:8000/api/v1/i18n/species-names?lang=de"
```

#### Analyse

```bash
# Spektrogramm generieren
curl "http://localhost:8000/api/v1/analysis/spectrogram/{recording_id}" -o spec.png

# Wellenform
curl "http://localhost:8000/api/v1/analysis/waveform/{recording_id}" -o wave.png
```

### WebSocket

```javascript
// Live-Erkennungen empfangen
const ws = new WebSocket('ws://localhost:8000/ws/live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'prediction') {
    console.log('Erkannt:', data.data.species);
    console.log('Konfidenz:', data.data.confidence);
  }
};

// Keep-alive
setInterval(() => ws.send('ping'), 30000);

// Audio-Stream senden
const streamWs = new WebSocket('ws://localhost:8000/ws/stream');
streamWs.send(audioChunk);  // Float32Array oder Base64
```

---

## Frontend

### Web-Dashboard

Das Dashboard bietet:

- **Live-Panel**: Aktuelle Erkennung mit Modell-Vergleich
- **Karte**: Leaflet-basiert mit Erkennungs-Markern
- **Timeline**: Chronologische Auflistung der Erkennungen
- **Statistiken**: Erkennungszähler, Artenvielfalt, Konfidenz
- **Diagramme**: Artenverteilung (Chart.js Donut)
- **Sprachumschalter**: DE/EN im Header

Zugriff: http://localhost:8000

### Sprachumschaltung

Die Sprache kann umgeschaltet werden durch:
1. **UI**: Klick auf DE/EN im Header
2. **URL-Parameter**: `?lang=de` oder `?lang=en`
3. **Cookie**: Wird automatisch gespeichert
4. **Browser-Sprache**: Automatische Erkennung

---

## Mobile Apps

### Flutter

```bash
cd mobile/flutter
flutter pub get
flutter run
```

Konfiguration in `lib/config.dart`:
```dart
const String apiBaseUrl = 'http://192.168.1.100:8000';
const String wsUrl = 'ws://192.168.1.100:8000/ws/live';
```

### React Native

```bash
cd mobile/react-native
npm install
npx react-native run-android  # oder run-ios
```

---

## ML-Modelle

### BirdNET

Vortrainiertes Modell für Vogelstimmen (~6000 Arten weltweit):

```bash
# Automatischer Download
python scripts/download_models.py

# Manueller Download
wget -O models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx \
  https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx

wget -O models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt \
  https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt
```

### HuggingFace-Modelle

Modelle werden beim ersten Start automatisch heruntergeladen:
- `dima806/bird_sounds_classification`
- `MIT/ast-finetuned-audioset-10-10-0.4593`

---

## Entwicklung

### Projekt-Struktur

```
Birds/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API-Endpunkte
│   │   ├── core/            # Konfiguration, Cache
│   │   ├── db/              # Datenbankmodelle
│   │   ├── i18n/            # Übersetzungen (DE/EN)
│   │   ├── models/          # ML-Modell-Wrapper
│   │   ├── services/        # Geschäftslogik
│   │   ├── static/          # Frontend (HTML/JS/CSS)
│   │   └── worker/          # Celery-Tasks
│   ├── alembic/             # DB-Migrationen
│   ├── tests/               # Unit-Tests
│   └── requirements.txt
├── mobile/
│   ├── flutter/             # Flutter-App
│   └── react-native/        # React Native-App
├── scripts/
│   ├── download_models.py   # ML-Modelle laden
│   ├── seed_species.py      # Arten-DB befüllen
│   └── setup.sh             # Quick-Setup
├── docker-compose.yml
└── README.md
```

### Tests

```bash
cd backend
source venv/bin/activate

# Alle Tests
pytest tests/ -v

# Mit Coverage
pytest tests/ -v --cov=app --cov-report=html

# Einzelner Test
pytest tests/test_prediction.py -v
```

---

## Troubleshooting

### Allgemeine Probleme

#### "No module named 'app'"
```bash
cd Birds/backend
export PYTHONPATH=$PWD
# Windows: set PYTHONPATH=%CD%
```

#### "CUDA out of memory"
```bash
# CPU-Modus erzwingen
export CUDA_VISIBLE_DEVICES=""
```

### Windows-spezifisch

#### "Microsoft Visual C++ required"
1. Visual Studio Build Tools installieren
2. Bei Installation "Desktop development with C++" auswählen
3. PC neu starten, dann erneut `pip install`

#### Redis-Verbindung fehlgeschlagen
```powershell
# WSL prüfen
wsl -l -v
wsl -d Ubuntu -e sudo service redis-server status

# Oder Memurai-Status
Get-Service memurai
```

#### Firewall blockiert Zugriff
```powershell
# Port freigeben
New-NetFirewallRule -DisplayName "BirdSound" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow
```

### Raspberry Pi-spezifisch

#### "Killed" während pip install
```bash
# Mehr Swap aktivieren
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Pakete einzeln installieren
pip install --no-cache-dir numpy
pip install --no-cache-dir scipy
```

#### Audio-Probleme
```bash
# Geräte auflisten
arecord -l
aplay -l

# PulseAudio neu starten
pulseaudio --kill
pulseaudio --start

# ALSA-Mixer
alsamixer
```

#### Langsame Performance
```bash
# CPU-Governor prüfen
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Auf Performance setzen
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Temperatur überwachen
vcgencmd measure_temp
```

### Datenbank-Probleme

#### PostgreSQL-Verbindung fehlgeschlagen
```bash
# Status prüfen
sudo systemctl status postgresql

# Logs ansehen
sudo journalctl -u postgresql -n 50

# Verbindung testen
psql -U birdsound -d birdsound -h localhost

# pg_hba.conf prüfen (Authentifizierung)
sudo nano /etc/postgresql/15/main/pg_hba.conf
# local all birdsound md5
sudo systemctl restart postgresql
```

### Logs einsehen

```bash
# Docker
docker-compose logs -f api

# Systemd (Linux/Pi)
sudo journalctl -u birdsound-api -f

# Windows Event Log
Get-EventLog -LogName Application -Source BirdSoundAPI -Newest 20
```

---

## Lizenz

MIT License - siehe [LICENSE](LICENSE)

## Mitwirken

Beiträge sind willkommen! Bitte erstelle einen Fork und einen Pull Request.

## Danksagungen

- [BirdNET](https://github.com/kahst/BirdNET-Analyzer) - Cornell Lab of Ornithology
- [HuggingFace Transformers](https://huggingface.co/transformers/)
- [FastAPI](https://fastapi.tiangolo.com/)

---

<a name="english"></a>
## English Summary

BirdSound is a real-time bird sound recognition system using multiple ML models. Key features:

- **Multi-model inference** with BirdNET and HuggingFace models
- **Consensus voting** for reliable predictions
- **GPS tagging** for all detections
- **Web dashboard** with live map and timeline
- **Multi-language support** (German/English)
- **Mobile apps** (Flutter, React Native)
- **Export** to CSV, JSON, GeoJSON

### Quick Start (Docker)

```bash
git clone https://github.com/your-repo/Birds.git
cd Birds
cp backend/.env.example backend/.env
docker-compose up -d
```

Access: http://localhost:8000

For detailed installation instructions for Windows and Raspberry Pi, see the German sections above.
