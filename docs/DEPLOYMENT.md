# 🐦 BirdSound - Deployment Guide

Anleitung für den dauerhaften Betrieb von BirdSound ohne VS Code.

## 📋 Übersicht der Optionen

| Option | Komplexität | Automatisch | Extern erreichbar | Empfohlen für |
|--------|-------------|-------------|-------------------|---------------|
| **1. Autostart (BAT)** | ⭐ Einfach | ✅ Bei Login | ✅ Mit ngrok | Heimgebrauch |
| **2. Windows Service** | ⭐⭐ Mittel | ✅ Bei Boot | ✅ Mit ngrok | Dauerbetrieb |
| **3. Docker** | ⭐⭐⭐ Komplex | ✅ Bei Boot | ✅ Mit ngrok | Server/Cloud |
| **4. Cloud (VPS)** | ⭐⭐⭐ Komplex | ✅ Immer | ✅ Feste URL | Professionell |

---

## Option 1: Windows Autostart (Empfohlen für Einsteiger)

### Installation

```powershell
# Führe das Autostart-Script aus
.\scripts\install_autostart.ps1
```

Oder manuell:
1. Rechtsklick auf `scripts\start_backend.bat` → "Verknüpfung erstellen"
2. Windows-Taste + R → `shell:startup` → Enter
3. Verknüpfung in den Startup-Ordner verschieben

### Verwendung

- **Starten:** `scripts\start_backend.bat`
- **Stoppen:** `scripts\stop_backend.bat`
- **Status prüfen:** http://localhost:8000/docs

### Deinstallation

```powershell
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\BirdSound Backend.lnk"
```

---

## Option 2: Windows Service (mit NSSM)

Ein Windows Service läuft im Hintergrund, auch ohne Benutzer-Login.

### Voraussetzungen

```powershell
# NSSM installieren (mit Chocolatey)
choco install nssm

# Oder manuell von https://nssm.cc/download
```

### Installation

```powershell
# Als Administrator ausführen!
.\scripts\install_service.ps1
```

### Service-Befehle

```powershell
# Status prüfen
Get-Service BirdSoundBackend

# Service starten
nssm start BirdSoundBackend

# Service stoppen
nssm stop BirdSoundBackend

# Service neustarten
nssm restart BirdSoundBackend

# Service deinstallieren
nssm remove BirdSoundBackend confirm
```

### Logs

```powershell
# Logs anzeigen
Get-Content D:\Projekte\Birds\backend\logs\service.log -Tail 50

# Fehler-Logs
Get-Content D:\Projekte\Birds\backend\logs\service_error.log -Tail 50
```

---

## Option 3: Docker

Docker Container starten automatisch beim System-Boot (mit `restart: unless-stopped`).

### Voraussetzungen

- Docker Desktop installiert und gestartet
- "Start Docker Desktop when you log in" aktiviert

### Starten

```powershell
cd D:\Projekte\Birds
docker-compose up -d
```

### Status prüfen

```powershell
docker ps --filter "name=birdsound"
docker logs birdsound-api --tail 50
```

### Ports

| Service | Port |
|---------|------|
| API | http://localhost:8003 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

### Stoppen

```powershell
docker-compose down
```

---

## 🌐 Externer Zugriff mit ngrok

ngrok erstellt einen Tunnel, um das lokale Backend von außen erreichbar zu machen.

### Einrichtung

1. **ngrok Account erstellen:** https://ngrok.com/signup
2. **Authtoken setzen:**
   ```powershell
   ngrok config add-authtoken YOUR_TOKEN
   ```

### Starten

```powershell
# Einfach (zufällige URL)
ngrok http 8000

# Mit Script
.\scripts\setup_ngrok.ps1
```

### URL abrufen

```powershell
# Im Browser
http://127.0.0.1:4040

# Per API
(Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url
```

### ⚠️ Wichtig: URL ändert sich

Bei kostenlosem ngrok ändert sich die URL bei jedem Neustart!

**Lösungen für feste URL:**
- **ngrok Pro** ($8/Monat): Feste Subdomain
- **Eigener Server**: VPS mit fester IP

---

## Option 4: Cloud Deployment (VPS)

Für produktiven Einsatz mit fester URL.

### Empfohlene Anbieter

| Anbieter | Ab | GPU | Empfehlung |
|----------|-----|-----|------------|
| Hetzner | 4€/Monat | ❌ | Budget |
| DigitalOcean | $6/Monat | ❌ | Einfach |
| Google Cloud Run | Pay-per-use | ❌ | Skalierbar |
| AWS EC2 | $10/Monat | ✅ | Enterprise |

### Docker auf VPS

```bash
# Auf dem VPS
git clone https://github.com/donapart/Birds.git
cd Birds
docker-compose up -d

# Nginx als Reverse Proxy einrichten
# SSL mit Let's Encrypt
```

Siehe auch: [docs/MultiUserCloudRun.md](docs/MultiUserCloudRun.md)

---

## 🔧 Troubleshooting

### Backend startet nicht

```powershell
# Port prüfen
netstat -ano | findstr ":8000"

# Prozess beenden
taskkill /F /PID <PID>

# Logs prüfen
Get-Content D:\Projekte\Birds\backend\logs\service_error.log
```

### ngrok verbindet nicht

```powershell
# ngrok Status
curl http://127.0.0.1:4040/api/tunnels

# ngrok neustarten
taskkill /F /IM ngrok.exe
ngrok http 8000
```

### Docker Container stoppt

```powershell
# Logs prüfen
docker logs birdsound-api

# Container neustarten
docker-compose restart api
```

---

## 📱 App-Konfiguration

Nach dem Start, konfiguriere die Mobile App:

1. Öffne die App → Einstellungen
2. Server-URL eingeben:
   - **Lokal:** `http://192.168.x.x:8000` (deine lokale IP)
   - **ngrok:** `https://xxx.ngrok-free.dev`
   - **VPS:** `https://your-domain.com`

---

## 📊 Quick Reference

```powershell
# === STARTEN ===
.\scripts\start_backend.bat              # Manuell starten
nssm start BirdSoundBackend              # Service starten
docker-compose up -d                      # Docker starten

# === STOPPEN ===
.\scripts\stop_backend.bat               # Manuell stoppen
nssm stop BirdSoundBackend               # Service stoppen
docker-compose down                       # Docker stoppen

# === STATUS ===
curl http://localhost:8000/api/v1/models  # API prüfen
Get-Service BirdSoundBackend              # Service Status
docker ps --filter "name=birdsound"       # Docker Status

# === LOGS ===
Get-Content backend\logs\service.log -Tail 50
docker logs birdsound-api --tail 50
```
