# Version Check - BirdSound 5.6.0

**Stand: 21. Dezember 2025**

## ✅ Versions-Status

### Backend
| Datei | Version | Status |
|-------|---------|--------|
| `backend/.env` | 5.6.0 | ✅ |
| `backend/app/core/config.py` | 5.6.0 | ✅ |
| `docker-compose.yml` | 5.6.0 | ✅ |

### Mobile Apps
| Plattform | Version | versionCode | Status |
|-----------|---------|-------------|--------|
| `mobile/expo-app/app.json` | 5.6.0 | 57 | ✅ |
| `mobile/expo-app/package.json` | 5.6.0 | - | ✅ |
| APK: `BirdSound-v5.6.0.apk` | 5.6.0 | 57 | ✅ Verfügbar |

### Dokumentation
| Datei | Version | Status |
|-------|---------|--------|
| `README.md` | 5.6.0 | ✅ |
| `docs/SETUP_COMPLETE.md` | 5.6.0 | ✅ NEU |

---

## 🔧 Konfiguration

### Backend Environment (.env)
```ini
APP_VERSION=5.6.0
USE_MODEL_STUBS=false          # ✅ Echte Modelle
ENABLE_PERCH_MODEL=true        # ✅ Perch aktiviert
```

### Docker Compose
```yaml
ports:
  - "8003:8000"                # ✅ Port 8003
volumes:
  - birdnet_cache:/root/.cache/birdnet    # ✅ Cache
  - dimabirdmodel_cache:/root/.cache/torch
  - tfhub_cache:/root/.cache/tfhub
```

---

## 🚀 Dienste Status

### Docker Container
```
✅ birdsound-api        (Port 8003, unhealthy - curl fehlt)
✅ birdsound-db         (healthy)
✅ birdsound-redis      (healthy)
✅ birdsound-worker     (unhealthy - curl fehlt)
```

**Health Check Issue:**
- Container laufen funktional
- Health Check schlägt fehl weil curl im Image fehlt
- Lösung: Image neu bauen mit `docker-compose build --no-cache`

### ngrok Tunnel
```
✅ Status:      Läuft (PID 8108, seit 13:31:35)
✅ Port:        8003
✅ Public URL:  https://available-nonsegmentary-arlene.ngrok-free.dev
✅ Autostart:   Installiert (Windows Startup)
```

### ML Modelle
```
✅ DimaBird    50 Arten       dima806/bird_sounds_classification
✅ BirdNET     6,522 Arten    2.4-official
✅ Perch       15,000+ Arten  1.0.0
```

---

## 📱 Android App Konfiguration

### Aktuelle Einstellungen
- **Backend URL:** https://available-nonsegmentary-arlene.ngrok-free.dev
- **Verfügbare Modelle:** 3 (DimaBird, BirdNET, Perch)
- **Status:** ✅ Verbunden und funktionsfähig

### APK Download
- **Datei:** `BirdSound-v5.6.0.apk`
- **Größe:** ~90 MB
- **Location:** Repository Root
- **Download:** https://github.com/donapart/Birds/raw/main/BirdSound-v5.6.0.apk

---

## 🔄 Änderungen in Version 5.6.0

### Backend
1. **USE_MODEL_STUBS=false**
   - Standardmäßig echte Modelle in Docker
   - Stub-Modus nur noch für Tests

2. **Model Registry Improvements**
   - Kritische Warnung wenn 0 Modelle geladen
   - Bessere Error Messages
   - Troubleshooting Hints in Logs

3. **Docker Optimierungen**
   - Persistente Volume Mounts für Model Caches
   - curl im Image für Health Checks (Dockerfile aktualisiert)
   - Port 8003 fix dokumentiert

4. **Perch Model Support**
   - Vollständig integriert (15,000+ Arten)
   - TensorFlow Hub Cache Fix dokumentiert
   - Automatisches Download von TF Hub

### Infrastructure
1. **ngrok Integration**
   - Dedicated Scripts für Port 8003
   - Autostart via Windows Startup Folder
   - Silent/Background Mode für Production

2. **Dokumentation**
   - `SETUP_COMPLETE.md` - Vollständige System-Doku
   - `VERSION_CHECK.md` - Versions-Übersicht
   - `REQUIREMENTS_ML.md` - ML Dependencies

---

## 🐛 Bekannte Issues

### 1. Docker Health Checks (Niedrige Priorität)
**Problem:** Container als "unhealthy" markiert  
**Ursache:** curl nicht im alten Image  
**Impact:** Keine - Container funktionieren normal  
**Fix:**
```powershell
cd D:\Projekte\Birds
docker-compose build --no-cache
docker-compose up -d
```

### 2. ngrok Free Tier URL
**Problem:** URL ändert sich bei Neustart  
**Ursache:** Free Tier hat keine permanente Subdomain  
**Impact:** Mittel - Android App muss URL neu eingeben nach ngrok Neustart  
**Fix:** ngrok Domain reservieren (kostenpflichtig) oder Cloudflare Tunnel

### 3. BirdNET Rate Limiting
**Problem:** Gelegentlich HTTP 429 beim Download  
**Ursache:** Rate Limit vom offiziellen BirdNET Package Server  
**Impact:** Niedrig - Auto-Retry nach 5 Minuten  
**Status:** ✅ Aktuell resolved

---

## ✅ System Checklist

**Vor Deployment prüfen:**

- [x] Docker Container laufen
- [x] Alle 3 Modelle geladen (API GET /models)
- [x] ngrok Tunnel aktiv
- [x] ngrok Autostart installiert
- [ ] Docker Desktop Autostart aktiviert (manuell prüfen!)
- [x] Android App kann Modelle abrufen
- [x] Version 5.6.0 überall konsistent
- [x] .env konfiguriert (USE_MODEL_STUBS=false)
- [x] Dokumentation aktualisiert

---

## 📝 Nächste Version (5.7.0)

### Geplante Features
- [ ] Docker Health Checks reparieren
- [ ] Permanente ngrok Domain oder Cloudflare Tunnel
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Automated Tests für alle 3 Modelle
- [ ] iOS App Build
- [ ] Offline-Modus für Android App
- [ ] Model Caching Optimierungen

---

## 🎯 Zusammenfassung

**Status: ✅ PRODUKTIV**

Alle Komponenten sind auf Version 5.6.0 und funktional:
- Backend läuft in Docker auf Port 8003
- 3 ML-Modelle geladen und verfügbar
- ngrok Tunnel aktiv mit Autostart
- Android App verbunden und funktionsfähig

**Das System ist production-ready!**
