# BirdSound Troubleshooting Guide

## 🔍 Backend-Ausfälle verhindern

### 1. **Automatischer Neustart bei Absturz**

**Problem:** Backend stürzt ab und bleibt offline

**Lösung:** Verwende `start_backend_bg.ps1` mit Auto-Restart:

```powershell
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Projekte\Birds\scripts\start_backend_bg.ps1"
```

Dieser Script:
- ✅ Startet Backend automatisch neu bei Absturz
- ✅ Wartet 10 Sekunden zwischen Neustarts
- ✅ Läuft im Hintergrund (kein sichtbares Fenster)

### 2. **Windows-Autostart einrichten**

**Problem:** Backend ist nach Neustart offline

**Lösung:** Installiere Autostart:

```powershell
powershell -ExecutionPolicy Bypass -File "D:\Projekte\Birds\scripts\install_autostart.ps1"
```

### 3. **Windows-Service (Empfohlen für 24/7)**

**Problem:** Backend soll immer laufen, auch ohne Anmeldung

**Lösung:** Installiere als Windows-Service:

```powershell
# NSSM installieren (falls nicht vorhanden)
choco install nssm

# Service installieren
powershell -ExecutionPolicy Bypass -File "D:\Projekte\Birds\scripts\install_service.ps1"
```

Service-Verwaltung:
```powershell
# Status prüfen
Get-Service BirdSound

# Manuell starten/stoppen
Start-Service BirdSound
Stop-Service BirdSound

# Logs anzeigen
Get-EventLog -LogName Application -Source BirdSound -Newest 50
```

### 4. **ngrok Tunnel-Stabilität**

**Problem:** ngrok trennt Verbindung nach 2 Stunden (Free-Plan)

**Lösungen:**

**A) Bezahlter ngrok-Plan** (~$8/Monat):
- ✅ Permanente URLs
- ✅ Keine Zeitlimits
- ✅ Mehr Bandbreite

**B) ngrok Auto-Restart** (kostenlos):
```powershell
# In start_backend_bg.ps1 eingebaut:
# - Startet ngrok automatisch neu
# - Prüft alle 60 Sekunden ob Tunnel aktiv ist
```

**C) Alternative Tunneling:**
```powershell
# Cloudflare Tunnel (kostenlos, keine Limits)
cloudflared tunnel --url http://localhost:8000
```

### 5. **Speicherprobleme vermeiden**

**Problem:** Backend verbraucht zu viel RAM (3 Modelle = ~3GB)

**Lösungen:**

```python
# Nur 1 Modell laden (in settings.py):
ENABLED_MODELS = ["BirdNET"]  # Statt alle 3

# Oder kleinere Batch-Size:
MODEL_BATCH_SIZE = 1  # Standard: 4
```

### 6. **Port-Konflikte lösen**

**Problem:** Port 8000 bereits belegt

**Prüfen:**
```powershell
netstat -ano | findstr :8000
```

**Lösung A - Prozess beenden:**
```powershell
# PID aus netstat nehmen
Stop-Process -Id <PID> -Force
```

**Lösung B - Anderen Port verwenden:**
```powershell
# In .env oder settings.py:
API_PORT=8001

# Backend starten:
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 7. **Datenbank-Verbindungsprobleme**

**Problem:** PostgreSQL offline oder nicht erreichbar

**Prüfen:**
```powershell
# PostgreSQL-Status
Get-Service -Name postgresql*

# Verbindung testen
psql -U postgres -d birdsound -c "SELECT 1"
```

**Fallback - SQLite verwenden:**
```python
# In settings.py:
DATABASE_URL = "sqlite:///./birdsound.db"
```

### 8. **Monitoring & Logs**

**Logs in Echtzeit verfolgen:**
```powershell
# Backend-Logs
Get-Content d:\Projekte\Birds\backend\logs\app.log -Wait -Tail 50

# ngrok-Logs
Get-Content ~\.ngrok2\ngrok.log -Wait -Tail 50
```

**Health-Checks automatisieren:**
```powershell
# Alle 5 Minuten prüfen (Task Scheduler):
while($true) {
    $status = Invoke-RestMethod "http://localhost:8000/health"
    if($status.status -ne "healthy") {
        Write-Host "⚠️ Backend unhealthy!"
        # Email senden, Neustart triggern, etc.
    }
    Start-Sleep 300
}
```

### 9. **App-seitige Auto-Reconnect**

**Bereits implementiert in v5.6.0:**
- ✅ App prüft alle 15 Sekunden ob Backend online ist
- ✅ Lädt automatisch Modelle nach wenn Verbindung wiederhergestellt

**Anpassen in App.js:**
```javascript
// Reconnect-Intervall ändern (Standard: 15 Sekunden)
const RECONNECT_INTERVAL = 30000; // 30 Sekunden
```

### 10. **Fehlerdiagnose-Checklist**

Wenn Backend nicht erreichbar:

```powershell
# 1. Backend-Prozess läuft?
Get-Process | Where-Object {$_.ProcessName -like "*python*"}

# 2. Port 8000 offen?
Test-NetConnection localhost -Port 8000

# 3. Health-Endpoint antwortet?
curl http://localhost:8000/health

# 4. ngrok läuft?
Get-Process ngrok

# 5. ngrok-Tunnel aktiv?
curl https://available-nonsegmentary-arlene.ngrok-free.dev/health

# 6. Firewall blockiert?
Test-NetConnection available-nonsegmentary-arlene.ngrok-free.dev -Port 443

# 7. DNS-Auflösung funktioniert?
Resolve-DnsName available-nonsegmentary-arlene.ngrok-free.dev
```

### 11. **Performance-Optimierung**

**Für stabileren Betrieb:**

```python
# settings.py - Optimierte Konfiguration
WORKER_PROCESSES = 1  # Nicht zu viele (RAM!)
KEEPALIVE_TIMEOUT = 65  # Verbindung länger offen
REQUEST_TIMEOUT = 120  # Genug Zeit für große Dateien
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB limit
```

**uvicorn-Optimierung:**
```powershell
# Mit Timeout-Einstellungen starten
uvicorn app.main:app `
  --host 0.0.0.0 `
  --port 8000 `
  --timeout-keep-alive 65 `
  --timeout-graceful-shutdown 30
```

## 📊 Monitoring-Dashboard (Optional)

Für professionelles Monitoring:

```powershell
# Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Zugriff:
# Grafana: http://localhost:3000
# Prometheus: http://localhost:9090
```

## 🆘 Notfall-Kommandos

```powershell
# ALLES neu starten
.\scripts\stop_backend.bat
Start-Sleep 5
.\scripts\start_backend_bg.ps1

# Backend-Status forcieren
curl http://localhost:8000/health/detailed

# Alle Python-Prozesse beenden
Get-Process python | Stop-Process -Force

# ngrok neu authentifizieren
ngrok authtoken <YOUR_TOKEN>
```

## 📞 Support

Bei persistenten Problemen:
1. Logs sammeln (`d:\Projekte\Birds\backend\logs\`)
2. Screenshot von Fehler
3. Output von Health-Check speichern
4. Issue auf GitHub öffnen: https://github.com/donapart/Birds/issues

---

**Tipp:** Für maximale Stabilität kombiniere:
- ✅ Windows-Service (`install_service.ps1`)
- ✅ Auto-Restart-Script (`start_backend_bg.ps1`)
- ✅ Health-Monitoring (alle 5 Min.)
- ✅ Bezahlter ngrok-Plan (für permanente URL)
