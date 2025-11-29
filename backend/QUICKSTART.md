# Quick Start Guide

Schnellstart-Anleitung für BirdSound Backend in 5 Minuten.

## Voraussetzungen

- Python 3.9+ 
- PostgreSQL (optional, für Datenbankfunktionen)
- Git

## Option 1: Mit Stub-Modellen (Entwicklung/Testing)

**Schnellster Weg zum Laufen - keine Modell-Downloads nötig!**

```bash
# 1. Repository klonen
cd Birds/backend

# 2. Virtuelle Umgebung erstellen
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate     # Windows

# 3. Dependencies installieren
pip install -r requirements.txt

# 4. Setup ausführen
python scripts/setup.py

# 5. Server starten (mit Stubs)
# Windows
.\make.ps1 run

# Linux/Mac
make run

# Oder manuell:
uvicorn app.main:app --reload
```

**Das war's!** API läuft unter http://localhost:8000

- Swagger Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Option 2: Mit Production-Modellen

**Für echte ML-Inferenz:**

```bash
# 1-4 wie oben, dann:

# 5. Modelle herunterladen (ca. 200 MB)
python scripts/download_models.py

# 6. .env anpassen
# Öffne .env und setze:
USE_MODEL_STUBS=false

# 7. Server starten
# Windows
.\make.ps1 run-prod

# Linux/Mac  
make run-prod

# Oder manuell:
uvicorn app.main:app
```

## Option 3: Mit Docker

**Einfachste Production-Setup:**

```bash
cd Birds

# Alles starten (API, DB, Redis, Worker)
docker-compose up -d

# Logs anschauen
docker-compose logs -f api

# Stoppen
docker-compose down
```

## Erste Schritte

### 1. API testen

Öffne http://localhost:8000/docs in deinem Browser und probiere die Endpoints aus.

### 2. Prediction testen

```bash
# Mit curl (Beispiel-Audio)
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "timestamp_utc": "2025-11-29T12:00:00Z",
    "latitude": 52.52,
    "longitude": 13.405,
    "sample_rate": 48000,
    "audio_format": "float32",
    "audio_base64": "<base64-encoded-audio>"
  }'
```

### 3. Tests ausführen

```bash
# Windows
.\make.ps1 test

# Linux/Mac
make test

# Oder manuell:
pytest tests/
```

### 4. Test-Script ausführen

```bash
# Mit Stubs
python scripts/test_runtime_models.py

# Mit echten Modellen (nach Download)
USE_MODEL_STUBS=false python scripts/test_runtime_models.py
```

## Verfügbare Kommandos

### Windows (PowerShell)

```powershell
.\make.ps1 help           # Alle Kommandos anzeigen
.\make.ps1 setup          # Initial Setup
.\make.ps1 run            # Dev Server (Stubs)
.\make.ps1 run-prod       # Production Server
.\make.ps1 test           # Tests ausführen
.\make.ps1 download-models # Modelle herunterladen
.\make.ps1 clean          # Cache aufräumen
```

### Linux/Mac (Makefile)

```bash
make help           # Alle Kommandos anzeigen
make setup          # Initial Setup
make run            # Dev Server (Stubs)
make run-prod       # Production Server
make test           # Tests ausführen
make download-models # Modelle herunterladen
make clean          # Cache aufräumen
```

## Konfiguration

Alle Einstellungen in `.env`:

```bash
# Modell-Modus
USE_MODEL_STUBS=true   # Stubs (schnell, keine Downloads)
# USE_MODEL_STUBS=false  # Production (echte ML)

# Datenbank (optional)
DATABASE_URL=postgresql://...

# Audio-Einstellungen
AUDIO_SAMPLE_RATE=48000

# Weitere Optionen siehe .env.example
```

## Troubleshooting

### "ModuleNotFoundError"
```bash
pip install -r requirements.txt
```

### "Connection refused" (PostgreSQL)
```bash
# Starte DB mit Docker
docker-compose up db -d

# Oder nutze Stubs (benötigt keine DB für Predictions)
USE_MODEL_STUBS=true uvicorn app.main:app --reload
```

### "Model file not found"
```bash
# Entweder Modelle herunterladen:
python scripts/download_models.py

# Oder Stubs nutzen:
USE_MODEL_STUBS=true uvicorn app.main:app --reload
```

## Nächste Schritte

1. **API erkunden**: http://localhost:8000/docs
2. **Tests schreiben**: Siehe `tests/` für Beispiele
3. **Mobile App verbinden**: Siehe `mobile/` für Flutter/React Native Beispiele
4. **Production Deploy**: Docker-Setup anpassen für Cloud-Deployment

## Hilfe & Dokumentation

- **README.md** - Vollständige Projekt-Dokumentation
- **app/models/README.md** - Modell-Dokumentation
- **IMPLEMENTATION.md** - Technische Details
- **API Docs** - http://localhost:8000/docs (wenn Server läuft)

## Support

Bei Fragen oder Problemen:
1. Siehe Troubleshooting oben
2. Prüfe GitHub Issues
3. Erstelle ein neues Issue mit Details
