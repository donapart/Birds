# BirdSound API v5.7.0 - Schnellstart

## ✅ Was ist neu in v5.7?

- 🐛 **M4A Bug behoben** - M4A/AAC Audioformate werden jetzt unterstützt
- 📝 **2 neue Test-Scripts** - Automatisierte Tests für API-Funktionalität
- 📚 **Umfassende Dokumentation** - Kompletter Test-Bericht verfügbar
- ✅ **Alle 3 Modelle verifiziert** - DimaBird, BirdNET, Perch funktionieren

---

## 🚀 Schnellstart

### 1. Container starten

```bash
# Container neu bauen (wichtig für v5.7!)
docker-compose down
docker-compose up -d --build

# Status prüfen
docker-compose ps

# Sollte zeigen:
# - birdsound-db (healthy)
# - birdsound-redis (healthy)
# - birdsound-api (healthy)
```

### 2. API testen

```bash
cd backend

# Einfacher Funktionstest (empfohlen)
python scripts/test_api_simple.py

# Erwartete Ausgabe:
# ✅ Health Check
# ✅ Models Endpoint
# ✅ Prediction
# Erfolgsquote: 3/3
```

### 3. Health Check

```bash
# Mit curl
curl http://localhost:8003/health

# Mit PowerShell
Invoke-WebRequest http://localhost:8003/health | ConvertFrom-Json

# Erwartete Antwort:
# {
#   "status": "healthy",
#   "models_loaded": 3,
#   "models": ["DimaBird", "BirdNET", "Perch"]
# }
```

---

## 🎯 API Endpoints

### Health Check
```http
GET http://localhost:8003/health
```

### Modelle auflisten
```http
GET http://localhost:8003/api/v1/models
```

### Vogelgesang analysieren
```http
POST http://localhost:8003/api/v1/predict
Headers:
  X-API-Key: changeme-in-production
Body (multipart/form-data):
  audio: <audio_file.wav|mp3|m4a>
  device_id: <your-device-id>
  latitude: <optional>
  longitude: <optional>
```

---

## 📊 Unterstützte Formate

### Audio-Formate (alle unterstützt)
- ✅ WAV (empfohlen für beste Qualität)
- ✅ MP3
- ✅ M4A / AAC (neu in v5.7!)
- ✅ OGG Opus
- ✅ PCM16 (raw)

### ML-Modelle (alle aktiv)
- ✅ **DimaBird** - Schnell, genau, europäische Vögel
- ✅ **BirdNET** - Global, 6.000+ Arten
- ✅ **Perch** - Google, 15.000+ Arten

---

## 🔧 Konfiguration

### Ports
- **API:** http://localhost:8003
- **PostgreSQL:** localhost:5433
- **Redis:** localhost:6379

### API-Key
Standard: `changeme-in-production`

**⚠️ Wichtig:** Ändern Sie den API-Key für Produktionsumgebungen!

```bash
# Neuen Key generieren
python -c "import secrets; print(secrets.token_urlsafe(32))"

# In backend/.env eintragen
API_KEYS=["<neuer-key>"]

# Container neu starten
docker-compose restart api
```

---

## 📚 Dokumentation

### Neue Dokumente in v5.7
- **[TESTING_REPORT_v5.7.md](TESTING_REPORT_v5.7.md)** - Umfassender Test-Bericht
- **[CHANGELOG_v5.7.md](CHANGELOG_v5.7.md)** - Vollständiges Changelog

### Bestehende Dokumente
- **[API.md](../API.md)** - API-Referenz
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment-Anleitung
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Problemlösungen

---

## 🧪 Test-Scripts

### test_api_simple.py (EMPFOHLEN)
Schneller Test ohne externe Abhängigkeiten:

```bash
cd backend
python scripts/test_api_simple.py
```

**Features:**
- Generiert synthetisches Audio
- Testet alle Endpoints
- Keine Downloads benötigt
- 30 Sekunden Laufzeit

### test_real_birds.py
Test mit echten Vogelaufnahmen (erfordert Internet):

```bash
cd backend
python scripts/test_real_birds.py
```

⚠️ **Hinweis:** Xeno-canto API v3 benötigt Authentifizierung (noch nicht implementiert)

---

## ❌ Fehlerbehebung

### Container starten nicht

```bash
# Logs prüfen
docker logs birdsound-api

# Ports prüfen (sollten frei sein)
netstat -an | findstr "8003 5433 6379"

# Container neu bauen
docker-compose down
docker-compose up -d --build --force-recreate
```

### "No such container: birdsound-api"

```bash
# Prüfen ob Container existiert
docker ps -a | findstr birdsound

# Container starten
docker-compose up -d
```

### "401 Unauthorized"

API-Key fehlt oder ist falsch:

```bash
# In HTTP Header einfügen:
X-API-Key: changeme-in-production
```

### "500 Internal Server Error"

Möglicherweise alte Version. Container neu bauen:

```bash
docker-compose down
docker-compose up -d --build
```

---

## 📈 Performance

### Typische Response-Zeiten
- Health Check: < 50ms
- Models List: < 100ms
- Prediction (3s audio, alle 3 Modelle): 2-10s

### System-Anforderungen
- **CPU:** 2+ Kerne (4+ empfohlen)
- **RAM:** 4 GB (8 GB empfohlen)
- **Disk:** 2 GB für Docker Images
- **Netzwerk:** Internet für Modell-Downloads (einmalig)

---

## 🎓 Beispiel-Code

### Python
```python
import requests

# API-URL
API_BASE = "http://localhost:8003"
API_KEY = "changeme-in-production"

# Audio hochladen
with open("bird_sound.wav", "rb") as audio_file:
    response = requests.post(
        f"{API_BASE}/api/v1/predict",
        headers={"X-API-Key": API_KEY},
        files={"audio": audio_file},
        data={"device_id": "my-device"}
    )

# Ergebnisse
result = response.json()
for prediction in result["predictions"]:
    print(f"{prediction['species_name']}: {prediction['confidence']*100:.1f}%")
```

### PowerShell
```powershell
# API-Key
$apiKey = "changeme-in-production"

# Audio hochladen
$response = Invoke-RestMethod `
    -Uri "http://localhost:8003/api/v1/predict" `
    -Method Post `
    -Headers @{"X-API-Key" = $apiKey} `
    -InFile "bird_sound.wav" `
    -ContentType "multipart/form-data"

# Ergebnisse anzeigen
$response.predictions | Format-Table species_name, confidence, model
```

---

## 🔗 Weitere Ressourcen

- **GitHub:** https://github.com/donapart/Birds
- **BirdNET:** https://birdnet.cornell.edu/
- **Xeno-canto:** https://xeno-canto.org/
- **Google Perch:** https://tfhub.dev/google/bird-vocalization-classifier/1

---

**Version:** 5.7.0  
**Status:** ✅ Produktionsreif  
**Letzte Aktualisierung:** 1. März 2026
