# BirdSound - Quick Reference

**Version 5.6.0** | Stand: 21. Dezember 2025

---

## ⚡ Quick Commands

### Starten & Stoppen

```powershell
# Docker Backend starten
cd D:\Projekte\Birds
docker-compose up -d

# ngrok Tunnel starten
cd D:\Projekte\Birds\scripts
.\start_ngrok.ps1

# Status prüfen
docker ps --filter "name=birdsound"
Get-Process ngrok

# Stoppen
docker-compose down
Stop-Process -Name ngrok
```

---

## 🔗 URLs

| Service | URL | Status |
|---------|-----|--------|
| **Backend (lokal)** | http://localhost:8003 | ✅ |
| **ngrok Tunnel** | https://available-nonsegmentary-arlene.ngrok-free.dev | ✅ |
| **API Docs** | http://localhost:8003/docs | ✅ |
| **Health Check** | http://localhost:8003/health | ✅ |

---

## 🧪 API Tests

### Modelle abrufen
```powershell
# Lokal
Invoke-RestMethod http://localhost:8003/api/v1/models | ConvertTo-Json

# Via ngrok
Invoke-RestMethod -Uri https://available-nonsegmentary-arlene.ngrok-free.dev/api/v1/models -Headers @{"ngrok-skip-browser-warning"="true"} | ConvertTo-Json
```

### Prediction Test
```powershell
# Base64 Audio erstellen
$audioBytes = [IO.File]::ReadAllBytes("test.wav")
$audioBase64 = [Convert]::ToBase64String($audioBytes)

# Predict Request
$body = @{
    audio_data = $audioBase64
    model = "BirdNET"
    top_n = 5
    min_confidence = 0.1
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8003/api/v1/predict -Method POST -Body $body -ContentType "application/json" | ConvertTo-Json
```

---

## 🐛 Troubleshooting

### Android App zeigt 0 Modelle
```powershell
# 1. ngrok läuft?
Get-Process ngrok

# 2. Wenn nicht, starten:
cd D:\Projekte\Birds\scripts
.\start_ngrok.ps1

# 3. Docker läuft?
docker ps --filter "name=birdsound"

# 4. Wenn nicht, starten:
docker-compose up -d
```

### ngrok URL hat sich geändert
```powershell
# Neue URL anzeigen
ngrok api tunnels

# Oder im Browser:
http://localhost:4040
```

### Docker Container neu bauen
```powershell
cd D:\Projekte\Birds
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Logs anschauen
```powershell
# API Logs
docker logs birdsound-api --tail 50 -f

# Worker Logs
docker logs birdsound-worker --tail 50 -f

# Alle Container
docker-compose logs -f
```

---

## 📂 Wichtige Dateien

### Konfiguration
| Datei | Beschreibung |
|-------|--------------|
| `backend/.env` | Backend Konfiguration (Version, Modelle) |
| `docker-compose.yml` | Docker Services (Port 8003) |
| `mobile/expo-app/app.json` | Android App Config |

### Scripts
| Script | Zweck |
|--------|-------|
| `scripts/start_ngrok.ps1` | ngrok manuell starten |
| `scripts/install_ngrok_autostart_simple.ps1` | ngrok Autostart installieren |
| `start_ngrok_background.ps1` | ngrok im Hintergrund (Autostart) |
| `start_ngrok_silent.vbs` | VBS Launcher (unsichtbar) |

### Dokumentation
| Dokument | Inhalt |
|----------|--------|
| `docs/SETUP_COMPLETE.md` | ✅ **Vollständige Doku** |
| `docs/VERSION_CHECK.md` | Versions-Status |
| `docs/QUICK_REFERENCE.md` | Diese Datei |

---

## 🔄 Autostart

### ngrok
✅ **Installiert** (Windows Startup Folder)
- Startet automatisch beim Login
- Läuft im Hintergrund (unsichtbar)
- Überlebt VS Code schließen & Neustarts

**Verknüpfung:**
```
C:\Users\dano\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\ngrok_tunnel.lnk
```

### Docker Desktop
⚠️ **Manuell aktivieren!**
1. Docker Desktop öffnen
2. Settings → General
3. ✅ "Start Docker Desktop when you log in"

---

## 📱 Android App

### Backend URL ändern
1. App öffnen
2. Settings / Einstellungen
3. Backend URL eingeben:
   ```
   https://available-nonsegmentary-arlene.ngrok-free.dev
   ```
4. "Verbinden" / "Connect"

### APK Download
**Datei:** `BirdSound-v5.6.0.apk` (~90MB)  
**Link:** https://github.com/donapart/Birds/raw/main/BirdSound-v5.6.0.apk

---

## ✅ System Check

```powershell
# Alles auf einmal prüfen
Write-Host "=== Docker ===" -ForegroundColor Cyan
docker ps --filter "name=birdsound" --format "table {{.Names}}\t{{.Status}}"

Write-Host "`n=== ngrok ===" -ForegroundColor Cyan
Get-Process ngrok -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime

Write-Host "`n=== Modelle ===" -ForegroundColor Cyan
Invoke-RestMethod http://localhost:8003/api/v1/models | Select-Object -ExpandProperty models | Format-Table name, version, is_loaded

Write-Host "`n=== ngrok Public URL ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri https://available-nonsegmentary-arlene.ngrok-free.dev/api/v1/models -Headers @{"ngrok-skip-browser-warning"="true"} | Select-Object total
```

---

## 🎯 Status Übersicht

| Komponente | Status | Details |
|------------|--------|---------|
| Docker API | ✅ | Port 8003, unhealthy (curl fehlt) |
| Docker DB | ✅ | PostgreSQL, Port 5433 |
| Docker Redis | ✅ | Port 6379 |
| ngrok | ✅ | PID 8108, seit 13:31:35 |
| DimaBird | ✅ | 50 Arten |
| BirdNET | ✅ | 6,522 Arten |
| Perch | ✅ | 15,000+ Arten |
| Android App | ✅ | v5.6.0, 3 Modelle |
| Autostart | ✅ | ngrok (Windows Startup) |

**System ist vollständig funktionsfähig! 🎉**

---

## 📞 Support

**Dokumentation:**
- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Vollständige Setup-Anleitung
- [VERSION_CHECK.md](VERSION_CHECK.md) - Version & Known Issues
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problemlösungen

**Repository:** https://github.com/donapart/Birds
