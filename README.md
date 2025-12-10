# 🐦 BirdSound - Real-time Bird Sound Recognition / Echtzeit-Vogelstimmen-Erkennung

**Multi-model ML system for bird sound recognition | Multi-Modell ML-System zur Vogelstimmen-Erkennung**

[English](#english) | [Deutsch](#deutsch)

---

## 🗺️ Quick Overview / Schnellübersicht

### Deployment Options / Betriebsarten

| Mode | Device | Internet | Use Case |
|------|--------|----------|----------|
| **🖥️ Local/Offline** | Windows PC, Raspberry Pi | ❌ Not required | Field work, private use |
| **🐳 Docker** | Any with Docker | ❌ Not required | Easy deployment, servers |
| **☁️ Online Server** | VPS, Cloud | ✅ Required | Team access, mobile apps |
| **📱 Mobile App** | Android/iOS | ⚡ Optional (Offline-Demo mode) | Field recordings |

### Available Models / Verfügbare Modelle

| Model | Species | Size | Best For | Status |
|-------|---------|------|----------|--------|
| **DimaBird** | ~50 EU | Auto | 🎵 Songbirds, Forest | ✅ Active |
| **BirdNET V2.4** | 6,522 | ~77MB | 🌍 Global, All species | ✅ Active |
| **Google Perch** | 15,000+ | ~96MB | 🔬 Scientific | ✅ Active |

### Downloads / Installation

| Platform | Download | Size | Notes |
|----------|----------|------|-------|
| **📱 Android APK** | [BirdSound-v5.6.0.apk](https://github.com/donapart/Birds/raw/main/BirdSound-v5.6.0.apk) | ~90MB | Android 6+ |
| **🖥️ Windows Installer** | [BirdSound_5.6.0_Setup.exe](https://github.com/donapart/Birds/raw/main/installer/output/BirdSound_5.6.0_Setup.exe) | ~200KB | Python 3.11+ (auto-install) |
| **🖥️ Windows Scripts** | [scripts/start_backend.bat](scripts/start_backend.bat) | - | Manual start |
| **🍓 Raspberry Pi** | [scripts/raspberry_setup.sh](scripts/raspberry_setup.sh) | - | Debian/Ubuntu |
| **🐳 Docker** | [docker-compose.yml](docker-compose.yml) | - | Docker Desktop |
| **🍎 iOS** | Expo Go App | - | `npx expo start` |

### 📱 Android APK Download (QR-Code)

Scan the QR code or use the direct link to download the APK:

[![QR Code APK Download](docs/qr-code-apk.png)](https://github.com/donapart/Birds/raw/main/BirdSound-v5.6.0.apk)

**Direct Link:** [BirdSound-v5.6.0.apk](https://github.com/donapart/Birds/raw/main/BirdSound-v5.6.0.apk) (~90MB)

---

## English

### Overview

BirdSound is a production-ready bird sound recognition system that uses multiple ML models to identify bird species from audio recordings. It features automatic database fallback, cross-platform support, and a comprehensive REST API.

### ✅ Current Status (v5.6.0)

- ✅ **DimaBird Model** (HuggingFace dima806/bird_sounds_classification)
- ✅ **BirdNET V2.4** integrated (6,522 species worldwide)
- ✅ **Google Perch** integrated (15,000+ species, TensorFlow Hub)
- ✅ **Audio Enhancement** - Bandpass filter, noise reduction, auto-gain
- ✅ **Background Recording** - continues when app minimized or screen locked
- ✅ **3D Spectrogram** - Real-time waterfall diagram with Android/iOS support
- ✅ **Session Management** - Delete sessions, detailed reports
- ✅ **Interactive Map** with OpenStreetMap (filter by time, species)
- ✅ **45+ Bird Species Library** with detailed info, habitat, voice data
- ✅ **Full Web Dashboard** with tabs (Live, Map, History, Settings)
- ✅ **KML Export** for Google Earth
- ✅ **Automatic Database Fallback** (PostgreSQL → SQLite)
- ✅ **Mobile App** Android v5.6.0 with Offline-Demo mode
- ✅ **Windows Installer** (Inno Setup)
- ✅ **Raspberry Pi Scripts** for field deployment

### Features

- **Multi-Model Analysis**: Run 3 ML models (BirdNET, DimaBird, Perch) in parallel
- **Consensus Voting**: Combine predictions from all models for reliable identification
- **Interactive Map**: OpenStreetMap with time/species filters
- **Real-time Processing**: Process 3-second audio windows with 1-second overlap
- **GPS Tagging**: Associate detections with location and time
- **KML/KMZ Export**: Export detections for Google Earth visualization
- **Offline Demo Mode**: Mobile app works without server connection (demo mode)
- **Automatic Database Fallback**: Seamlessly switches to SQLite if PostgreSQL unavailable
- **REST API**: FastAPI backend with comprehensive endpoints and Swagger UI
- **Internationalization**: Support for English and German
- **Mobile Ready**: Expo app for Android and iOS

### 📋 Device Setup Guide

#### Which device for what?

| Your Goal | Recommended Setup | Internet Needed |
|-----------|-------------------|-----------------|
| **🏠 Home bird watching** | Windows/Mac + USB Mic | ❌ Offline OK |
| **🌲 Field work** | Raspberry Pi + External Mic | ❌ Offline OK |
| **📱 Mobile recording** | Android App + Server at home | ⚡ For sync only |
| **👥 Team/Science project** | Docker on VPS/Cloud | ✅ Always online |
| **🧪 Development/Testing** | Any PC with Python | ❌ Offline OK |

#### BirdNET Download (Optional, +6522 species)

```bash
# Download BirdNET model (~150MB)
cd backend
python scripts/download_models.py --models birdnet

# Or manually download from:
# https://huggingface.co/kahst/BirdNET-onnx
# Place in: models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx
```

### 📱 Mobile App (Expo)

The mobile app works on both Android and iOS with an **Offline Demo Mode**:

```bash
# Navigate to expo app
cd mobile/expo-app

# Install dependencies
npm install

# Start development server
npx expo start

# For iOS: Scan QR code with Expo Go app
# For Android: Build APK (see below)
```

#### Build Android APK

```bash
cd mobile/expo-app

# Generate native Android project
npx expo prebuild --platform android

# Build release APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

#### App Features

- 🎙️ Audio recording with real-time analysis
- 📍 GPS location tagging
- 📴 **Offline Demo Mode** (works without server)
- 📤 KML export for Google Earth
- 🇩🇪 German bird names
- 🔧 Configurable server URL

### Architecture

```text
┌─────────────────┐     ┌─────────────────────────────────────────┐
│  Mobile App     │     │           Backend (FastAPI)             │
│  (Expo/RN)      │     │                                         │
│  v5.6.0         │────▶│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│                 │     │  │ BirdNET │ │DimaBird │ │  Perch  │   │
│  - Audio Capture│     │  │ (ONNX)  │ │(Hugging)│ │(TFHub)  │   │
│  - GPS Location │     │  └────┬────┘ └────┬────┘ └────┬────┘   │
│  - 3D Spektrogr.│     │       │           │           │        │
└─────────────────┘     │       └───────────┼───────────┘        │
                        │                   ▼                    │
┌─────────────────┐     │           ┌───────────────┐            │
│  Web Dashboard  │     │           │   Consensus   │            │
│  (Browser)      │────▶│           │    Engine     │            │
│                 │     │           └───────┬───────┘            │
│  - Live Tab     │     │                   │                    │
│  - Karte Tab    │     │                   ▼                    │
│  - Historie     │     │           ┌───────────────┐            │
│  - Settings     │     │           │  PostgreSQL   │            │
└─────────────────┘     │           │   or SQLite   │            │
                        │           └───────────────┘            │
                        └────────────────────────────────────────┘
```

## Quick Start

### Option 1: Windows Installation

#### Prerequisites

- Python 3.11+
- Git

#### Installation Steps

```powershell
# Clone repository
git clone https://github.com/donapart/Birds.git
cd Birds\backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install optional dependencies for real ML models
pip install torchaudio transformers

# For SQLite support (recommended for local development)
pip install aiosqlite

# Copy and configure environment
copy .env.example .env
# Edit .env: Set USE_SQLITE=true for local development
```

#### Run Server

```powershell
# Start server (uses SQLite by default)
$env:PYTHONPATH="D:\Birds\Birds\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002

# Server starts at: http://localhost:8002
# API Docs at: http://localhost:8002/docs
```

### Option 2: Raspberry Pi Installation

#### Prerequisites

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git
```

#### Installation Steps

```bash
# Clone repository
git clone https://github.com/donapart/Birds.git
cd Birds/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install audio dependencies
pip install torchaudio transformers aiosqlite

# Configure environment
cp .env.example .env
nano .env  # Set USE_SQLITE=true
```

#### Run as Service (systemd)

Create `/etc/systemd/system/birdsound.service`:

```ini
[Unit]
Description=BirdSound API Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Birds/backend
Environment="PYTHONPATH=/home/pi/Birds/backend"
ExecStart=/home/pi/Birds/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8002
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable birdsound
sudo systemctl start birdsound
sudo systemctl status birdsound
```

### Option 3: Docker (All Platforms)

```bash
# Clone repository
git clone https://github.com/donapart/Birds.git
cd Birds

# Start with Docker Compose
docker-compose up -d

# Access API
# API: http://localhost:8000/docs
# Database UI: http://localhost:8080
```

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Database Configuration
USE_SQLITE=true                    # Use SQLite (true) or PostgreSQL (false)
SQLITE_PATH=birdsound.db           # SQLite database file path
DATABASE_URL=postgresql://user:pass@host:5432/dbname  # PostgreSQL connection

# Model Configuration
USE_MODEL_STUBS=false              # Use stub models (true) or real models (false)
BIRDNET_MODEL_PATH=models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx
HF_MODEL_NAME=dima806/bird_sounds_classification

# API Configuration
DEBUG=false
MIN_CONFIDENCE_THRESHOLD=0.1
TOP_N_PREDICTIONS=5
```

### Database Setup

#### SQLite (Recommended for Development/Testing)

No additional setup required! The application automatically creates the database file.

```bash
# In .env:
USE_SQLITE=true
SQLITE_PATH=birdsound.db
```

**Advantages:**

- No separate database server needed
- Perfect for Raspberry Pi and Windows
- Automatic setup
- All features work (except PostGIS geometry features)

#### PostgreSQL (Production)

```bash
# Install PostgreSQL
# Windows: Download from postgresql.org
# Raspberry Pi: sudo apt install postgresql postgis

# Create database
sudo -u postgres psql
CREATE DATABASE birdsound;
CREATE USER birdsound WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE birdsound TO birdsound;

# In .env:
USE_SQLITE=false
DATABASE_URL=postgresql://birdsound:your_password@localhost:5432/birdsound
```

**Automatic Fallback:** If PostgreSQL connection fails, the system automatically switches to SQLite!

## API Documentation

### Interactive Documentation

Once the server is running, visit:

- **Swagger UI**: `http://localhost:8002/docs`
- **ReDoc**: `http://localhost:8002/redoc`

### Main Endpoints

#### Prediction

```bash
# Quick Prediction (no database storage)
POST /api/v1/predict/quick
{
  "device_id": "my-device",
  "timestamp_utc": "2025-11-29T12:00:00Z",
  "latitude": 52.52,
  "longitude": 13.405,
  "sample_rate": 48000,
  "audio_format": "pcm16_le",
  "audio_base64": "<base64-encoded-audio>"
}

# Full Prediction (with database storage)
POST /api/v1/predict
```

**Response:**

```json
{
  "consensus": {
    "species_common": "European Robin",
    "species_scientific": "Erithacus rubecula",
    "confidence": 0.85,
    "method": "weighted_average"
  },
  "model_results": [
    {
      "model_name": "DimaBird",
      "model_version": "dima806/bird_sounds_classification",
      "predictions": [
        {
          "species_common": "European Robin",
          "confidence": 0.85
        }
      ],
      "inference_time_ms": 234
    }
  ]
}
```

#### Species Search

```bash
# Search species
GET /api/v1/species?search=robin&limit=10

# Response:
[
  {
    "species_code": "erithacus_rubecula",
    "scientific_name": "Erithacus rubecula",
    "common_name_en": "European Robin",
    "common_name_de": "Rotkehlchen"
  }
]
```

#### Recordings

```bash
# List recordings
GET /api/v1/recordings?limit=50&offset=0

# Get specific recording
GET /api/v1/recordings/{recording_id}

# Export recordings as CSV
GET /api/v1/export/csv?start_date=2025-11-01&end_date=2025-11-30
```

#### Geo Export (KML/KMZ)

```bash
# Export as KML (for Google Earth)
GET /api/v1/export/kml?start_date=2025-11-01&end_date=2025-11-30

# Export as KMZ (compressed KML)
GET /api/v1/export/kmz?start_date=2025-11-01&end_date=2025-11-30

# Filter by species
GET /api/v1/export/kml?species=Turdus+merula

# Response: KML file with bird detection locations
```

#### System

```bash
# Health check
GET /api/v1/health

# List available models
GET /api/v1/models
```

## Testing

### API Test Script

```bash
cd backend
python scripts/test_api.py
```

Expected output:

```text
✅ Health: 200 OK
✅ Models: 200 OK - DimaBird loaded
✅ Species Search: 200 OK - Found European Robin
✅ Quick Prediction: 200 OK - Slaty-Breasted Tinamou (18.20%)
✅ Full Prediction: 200 OK - Recording saved
```

### Unit Tests

```bash
cd backend
pytest tests/
```

## Mobile App Integration

### Flutter Example

See `mobile/flutter/lib/services/audio_service.dart`:

```dart
final service = BirdSoundService(
  apiBaseUrl: 'http://your-server:8002',
  deviceId: 'flutter-device-123',
);

await service.initialize();
await service.startListening();

service.predictions.listen((prediction) {
  print('Detected: ${prediction.consensus.species}');
  print('Confidence: ${prediction.consensus.confidence}');
});
```

### React Native Example

See `mobile/react-native/src/services/BirdSoundService.ts`:

```typescript
const service = new BirdSoundService(
  'http://your-server:8002',
  'rn-device-123'
);

await service.initialize();
service.setOnPrediction((prediction) => {
  console.log('Species:', prediction.consensus.speciesCommon);
  console.log('Confidence:', prediction.consensus.confidence);
});
await service.startListening();
```

## Troubleshooting

### Windows

**Problem:** Server won't start

```powershell
# Check if port is already in use
Get-NetTCPConnection -LocalPort 8002

# Kill process on port
Stop-Process -Id (Get-Process -Id (Get-NetTCPConnection -LocalPort 8002).OwningProcess).Id -Force
```

**Problem:** Import errors

```powershell
# Set PYTHONPATH
$env:PYTHONPATH="D:\Birds\Birds\backend"
```

### Raspberry Pi

**Problem:** Out of memory during model loading

```bash
# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set: CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

**Problem:** Audio device not found

```bash
# List audio devices
arecord -l

# Install ALSA
sudo apt install alsa-utils
```

### Database Issues

**Problem:** PostgreSQL connection fails

The system automatically falls back to SQLite. Check logs:

```text
WARNING - PostgreSQL unavailable, switching to SQLite fallback
INFO - Switched to SQLite: birdsound.db
```

No action needed! The system will work with SQLite.

## Project Structure

```text
Birds/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # API endpoints
│   │   │   ├── predict.py       # Prediction endpoints
│   │   │   ├── recordings.py    # Recording management
│   │   │   ├── species.py       # Species search
│   │   │   └── health.py        # Health checks
│   │   ├── core/
│   │   │   ├── config.py        # Configuration
│   │   │   └── cache.py         # Caching layer
│   │   ├── db/
│   │   │   ├── database.py      # Database connection (auto-fallback)
│   │   │   └── models.py        # SQLAlchemy models
│   │   ├── i18n/
│   │   │   ├── translations.py  # English/German translations
│   │   │   └── middleware.py    # i18n middleware
│   │   ├── models/
│   │   │   ├── birdnet_runtime.py   # BirdNET ONNX wrapper
│   │   │   └── hf_runtime.py        # HuggingFace wrapper
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/
│   │       ├── model_registry.py    # Model management
│   │       ├── prediction_service.py # Prediction logic
│   │       └── audio_processor.py   # Audio processing
│   ├── scripts/
│   │   ├── test_api.py          # API test script
│   │   └── download_models.py   # Model downloader
│   ├── tests/                   # Unit tests
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── mobile/
│   ├── flutter/                 # Flutter example
│   └── react-native/            # React Native example
├── models/                      # ML model files (not in git)
├── docker-compose.yml
└── README.md
```

## Performance

### Windows PC (Typical)

- Model loading: ~8 seconds (HuggingFace)
- Inference time: ~200-300ms per prediction
- Memory usage: ~2GB (with models loaded)

### Raspberry Pi 4 (4GB)

- Model loading: ~15-20 seconds
- Inference time: ~800ms-1.5s per prediction
- Memory usage: ~1.5GB (swap recommended)

## License

MIT License - see LICENSE file

## Acknowledgments

- [BirdNET](https://birdnet.cornell.edu/) by Cornell Lab of Ornithology
- [HuggingFace](https://huggingface.co/) for model hosting and transformers library
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent web framework

## Support

- GitHub Issues: <https://github.com/donapart/Birds/issues>
- Documentation: See `/docs` in this repository

---

## Deutsch

### Übersicht

BirdSound ist ein produktionsreifes Vogelstimmen-Erkennungssystem, das mehrere ML-Modelle verwendet, um Vogelarten aus Audioaufnahmen zu identifizieren. Es verfügt über automatischen Datenbank-Fallback, plattformübergreifende Unterstützung und eine umfassende REST-API.

### ✅ Aktueller Status

- ✅ **HuggingFace-Modell** geladen (dima806/bird_sounds_classification)
- ✅ **Automatischer Datenbank-Fallback** (PostgreSQL → SQLite bei Nichtverfügbarkeit)
- ✅ **Alle API-Endpunkte** voll funktionsfähig
- ✅ **FastAPI** mit interaktiver Dokumentation
- ✅ **Plattformübergreifend** (Windows, Linux, Raspberry Pi)
- ✅ **Mobil-bereit** (Flutter & React Native Beispiele)
- ⚠️ BirdNET ONNX optional (erfordert manuellen Download)

### Funktionen

- **Multi-Modell-Analyse**: Mehrere ML-Modelle (BirdNET, HuggingFace) parallel ausführen
- **Konsens-Abstimmung**: Vorhersagen aller Modelle für zuverlässige Identifikation kombinieren
- **Echtzeit-Verarbeitung**: 3-Sekunden-Audiofenster mit 1-Sekunde-Überlappung verarbeiten
- **GPS-Tagging**: Erkennungen mit Standort und Zeit verknüpfen
- **Automatischer Datenbank-Fallback**: Wechselt nahtlos zu SQLite, wenn PostgreSQL nicht verfügbar
- **REST-API**: FastAPI-Backend mit umfassenden Endpunkten und Swagger-UI
- **Internationalisierung**: Unterstützung für Englisch und Deutsch
- **Mobil-bereit**: Beispielimplementierungen für Flutter und React Native

## Schnellstart

### Option 1: Windows-Installation

#### Voraussetzungen

- Python 3.11+
- Git

#### Installationsschritte

```powershell
# Repository klonen
git clone https://github.com/donapart/Birds.git
cd Birds\backend

# Virtuelle Umgebung erstellen
python -m venv venv
.\venv\Scripts\activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Optionale Abhängigkeiten für echte ML-Modelle
pip install torchaudio transformers

# Für SQLite-Unterstützung (empfohlen für lokale Entwicklung)
pip install aiosqlite

# Umgebung kopieren und konfigurieren
copy .env.example .env
# .env bearbeiten: USE_SQLITE=true für lokale Entwicklung setzen
```

#### Server starten

```powershell
# Server starten (verwendet standardmäßig SQLite)
$env:PYTHONPATH="D:\Birds\Birds\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002

# Server läuft unter: http://localhost:8002
# API-Docs unter: http://localhost:8002/docs
```

### Option 2: Raspberry Pi Installation

#### Voraussetzungen

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git
```

#### Installationsschritte

```bash
# Repository klonen
git clone https://github.com/donapart/Birds.git
cd Birds/backend

# Virtuelle Umgebung erstellen
python3 -m venv venv
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Audio-Abhängigkeiten installieren
pip install torchaudio transformers aiosqlite

# Umgebung konfigurieren
cp .env.example .env
nano .env  # USE_SQLITE=true setzen
```

#### Als Dienst ausführen (systemd)

`/etc/systemd/system/birdsound.service` erstellen:

```ini
[Unit]
Description=BirdSound API Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Birds/backend
Environment="PYTHONPATH=/home/pi/Birds/backend"
ExecStart=/home/pi/Birds/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8002
Restart=always

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:

```bash
sudo systemctl enable birdsound
sudo systemctl start birdsound
sudo systemctl status birdsound
```

### Option 3: Docker (Alle Plattformen)

```bash
# Repository klonen
git clone https://github.com/donapart/Birds.git
cd Birds

# Mit Docker Compose starten
docker-compose up -d

# API aufrufen
# API: http://localhost:8000/docs
# Datenbank-UI: http://localhost:8080
```

## Konfiguration

### Umgebungsvariablen

Erstellen Sie eine `.env`-Datei im `backend/`-Verzeichnis:

```bash
# Datenbank-Konfiguration
USE_SQLITE=true                    # SQLite (true) oder PostgreSQL (false) verwenden
SQLITE_PATH=birdsound.db           # SQLite-Datenbankdateipfad
DATABASE_URL=postgresql://user:pass@host:5432/dbname  # PostgreSQL-Verbindung

# Modell-Konfiguration
USE_MODEL_STUBS=false              # Stub-Modelle (true) oder echte Modelle (false)
BIRDNET_MODEL_PATH=models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx
HF_MODEL_NAME=dima806/bird_sounds_classification

# API-Konfiguration
DEBUG=false
MIN_CONFIDENCE_THRESHOLD=0.1
TOP_N_PREDICTIONS=5
```

### Datenbank-Einrichtung

#### SQLite (Empfohlen für Entwicklung/Tests)

Keine zusätzliche Einrichtung erforderlich! Die Anwendung erstellt die Datenbankdatei automatisch.

```bash
# In .env:
USE_SQLITE=true
SQLITE_PATH=birdsound.db
```

**Vorteile:**

- Kein separater Datenbankserver erforderlich
- Perfekt für Raspberry Pi und Windows
- Automatische Einrichtung
- Alle Funktionen funktionieren (außer PostGIS-Geometrie-Features)

#### PostgreSQL (Produktion)

```bash
# PostgreSQL installieren
# Windows: Von postgresql.org herunterladen
# Raspberry Pi: sudo apt install postgresql postgis

# Datenbank erstellen
sudo -u postgres psql
CREATE DATABASE birdsound;
CREATE USER birdsound WITH PASSWORD 'ihr_passwort';
GRANT ALL PRIVILEGES ON DATABASE birdsound TO birdsound;

# In .env:
USE_SQLITE=false
DATABASE_URL=postgresql://birdsound:ihr_passwort@localhost:5432/birdsound
```

**Automatischer Fallback:** Wenn die PostgreSQL-Verbindung fehlschlägt, wechselt das System automatisch zu SQLite!

## API-Dokumentation

### Interaktive Dokumentation

Sobald der Server läuft, besuchen Sie:

- **Swagger UI**: `http://localhost:8002/docs`
- **ReDoc**: `http://localhost:8002/redoc`

### Hauptendpunkte

#### Vorhersage

```bash
# Schnellvorhersage (keine Datenbankspeicherung)
POST /api/v1/predict/quick
{
  "device_id": "mein-gerät",
  "timestamp_utc": "2025-11-29T12:00:00Z",
  "latitude": 52.52,
  "longitude": 13.405,
  "sample_rate": 48000,
  "audio_format": "pcm16_le",
  "audio_base64": "<base64-codiertes-audio>"
}

# Vollständige Vorhersage (mit Datenbankspeicherung)
POST /api/v1/predict
```

**Antwort:**

```json
{
  "consensus": {
    "species_common": "Rotkehlchen",
    "species_scientific": "Erithacus rubecula",
    "confidence": 0.85,
    "method": "weighted_average"
  },
  "model_results": [
    {
      "model_name": "DimaBird",
      "model_version": "dima806/bird_sounds_classification",
      "predictions": [
        {
          "species_common": "Rotkehlchen",
          "confidence": 0.85
        }
      ],
      "inference_time_ms": 234
    }
  ]
}
```

#### Artensuche

```bash
# Arten suchen
GET /api/v1/species?search=rotkehlchen&limit=10

# Antwort:
[
  {
    "species_code": "erithacus_rubecula",
    "scientific_name": "Erithacus rubecula",
    "common_name_en": "European Robin",
    "common_name_de": "Rotkehlchen"
  }
]
```

#### Aufzeichnungen

```bash
# Aufzeichnungen auflisten
GET /api/v1/recordings?limit=50&offset=0

# Spezifische Aufzeichnung abrufen
GET /api/v1/recordings/{recording_id}

# Aufzeichnungen exportieren
GET /api/v1/export/csv?start_date=2025-11-01&end_date=2025-11-30
```

## Fehlerbehebung

### Windows

**Problem:** Server startet nicht

```powershell
# Prüfen, ob Port bereits verwendet wird
Get-NetTCPConnection -LocalPort 8002

# Prozess auf Port beenden
Stop-Process -Id (Get-Process -Id (Get-NetTCPConnection -LocalPort 8002).OwningProcess).Id -Force
```

**Problem:** Import-Fehler

```powershell
# PYTHONPATH setzen
$env:PYTHONPATH="D:\Birds\Birds\backend"
```

### Raspberry Pi

**Problem:** Speichermangel beim Laden des Modells

```bash
# Swap-Speicher erhöhen
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Setzen: CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

**Problem:** Audiogerät nicht gefunden

```bash
# Audiogeräte auflisten
arecord -l

# ALSA installieren
sudo apt install alsa-utils
```

### Datenbank-Probleme

**Problem:** PostgreSQL-Verbindung schlägt fehl

Das System wechselt automatisch zu SQLite. Prüfen Sie die Logs:

```text
WARNING - PostgreSQL unavailable, switching to SQLite fallback
INFO - Switched to SQLite: birdsound.db
```

Keine Aktion erforderlich! Das System funktioniert mit SQLite.

## Leistung

### Windows-PC (Typisch)

- Modell-Laden: ~8 Sekunden (HuggingFace)
- Inferenzzeit: ~200-300ms pro Vorhersage
- Speichernutzung: ~2GB (mit geladenen Modellen)

### Raspberry Pi 4 (4GB)

- Modell-Laden: ~15-20 Sekunden
- Inferenzzeit: ~800ms-1.5s pro Vorhersage
- Speichernutzung: ~1.5GB (Swap empfohlen)

## Lizenz

MIT-Lizenz - siehe LICENSE-Datei

## Changelog

### v5.6.0 (2024-12-05)
- 🔊 **Audio Enhancement** - Vogelstimmen werden vor Erkennung verstärkt
  - 🎵 **Bandpass-Filter** (1-8kHz) - Fokussiert auf Vogelfrequenzen
  - 🔇 **Rauschunterdrückung** - Entfernt Hintergrundgeräusche (noisereduce)
  - 📈 **Auto-Gain** - Automatische Lautstärke-Normalisierung
  - 🌊 **Spectral Gate** - Entfernt leises Rauschen
- ⚙️ **Presets** - off, light, moderate, aggressive, bird_focus
- 🔄 **Ein/Ausschaltbar** - Jede Enhancement-Option einzeln steuerbar

### v5.5.1 (2024-12-05)
- 🔄 **Auto-Reconnect** - App erkennt automatisch wenn Backend wieder online ist (alle 15 Sekunden)
- 🔁 **Auto-Restart Backend** - Backend-Skripte starten bei Absturz automatisch neu
- 📜 **Deployment-Skripte** - Neue Skripte für Windows-Autostart und Service-Installation
- 📖 **DEPLOYMENT.md** - Umfassende Dokumentation für 4 Deployment-Optionen

### v5.5.0 (2024-12-05)
- 🗺️ **Karten-Crashfix** - MapView ersetzt durch WebView + OpenStreetMap/Leaflet (kein Google API Key nötig)
- 📊 **3D Spektrogramm Android-Fix** - Dual Event Listeners für bessere Kompatibilität
- 🤖 **Modell-Anzeige Fix** - Backend zeigt jetzt korrekt alle 3 Modelle (DimaBird, BirdNET, Perch)
- ⏱️ **AbortSignal.timeout() Fix** - Eigene `fetchWithTimeout()` Implementierung für React Native
- 📱 **Stabilität** - Diverse Fixes für Android-Kompatibilität
- 🚫 **react-native-maps entfernt** - Keine Google Play Services mehr erforderlich

### v5.3.2 (2024-12-01)
- 🐛 **AbortSignal Fix** für ältere Android-Versionen
- 🖥️ **Vollständiges Web-Dashboard** mit 4 Tabs (Live, Karte, Historie, Einstellungen)
- 🤖 **Modell-Anzeige** im Web und App mit Laden-Button
- 📝 **Deployment-Dokumentation** (MultiUserCloudRun.md, DeploymentKonstellationen.md)

### v5.3.0 (2024-12-01)
- ✨ **Interaktive Karte** mit OpenStreetMap/Leaflet (kein API Key nötig)
- 🔍 **Kartenfilter** nach Zeit (Heute/Woche/Monat) und Arten
- 🐦 **45+ Vogelarten** in der Bibliothek mit Details
- 🌍 **KML Export** direkt aus der Karte
- 🔧 Stabilitätsverbesserungen für Android

### v5.2.x (2024-11)
- 🤖 **Google Perch Model** integriert (10.000+ Arten)
- 🗺️ Map-Tab hinzugefügt
- 📊 Session-Reports mit Statistiken
- ⚙️ Erweiterte Einstellungen (Auto-Stop, Modellwahl)

### v5.1.x (2024-11)
- 🎯 **Multi-Model Support** (BirdNET + DimaBird parallel)
- 🏆 Achievement-System mit Punkten
- 📱 Offline-Queue für schlechte Verbindung

### v5.0.x (2024-10)
- 🚀 Initiale Expo/React Native App
- 🎙️ Echtzeit-Audio-Streaming
- 📍 GPS-Tagging für Erkennungen

## Danksagungen

- [BirdNET](https://birdnet.cornell.edu/) vom Cornell Lab of Ornithology
- [Google Perch](https://tfhub.dev/google/bird-vocalization-classifier) für Bird Vocalization Classifier
- [HuggingFace](https://huggingface.co/) für Model-Hosting und Transformers-Bibliothek
- [FastAPI](https://fastapi.tiangolo.com/) für das exzellente Web-Framework
- [OpenStreetMap](https://www.openstreetmap.org/) für die freien Kartendaten
- [Leaflet](https://leafletjs.com/) für die JavaScript-Kartenbibliothek

## Support

- GitHub Issues: <https://github.com/donapart/Birds/issues>
- Dokumentation: Siehe `/docs` in diesem Repository
