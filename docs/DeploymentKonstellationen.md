# 🔧 BirdSound Deployment-Konstellationen

## Übersicht

Dieses Dokument beschreibt alle möglichen Kombinationen von Frontend-Apps und Backend-Systemen für BirdSound.

---

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT-OPTIONEN                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FRONTENDS                           BACKENDS                           │
│  ─────────                           ────────                           │
│  📱 Android App                      🐳 Docker (Lokal)                  │
│  📱 iOS App                          🐳 Docker (NAS/Server)             │
│  🖥️ Windows Desktop                  ☁️ Google Cloud Run                │
│  🍓 Raspberry Pi                     ☁️ AWS/Azure/Other                 │
│  🌐 Web Browser                      🖥️ Native Python                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend-Geräte

### 2.1 Mobile Apps

| Gerät | Technologie | Offline-Fähig | GPS | Mikrofon | Besonderheiten |
|-------|-------------|---------------|-----|----------|----------------|
| **Android** | Expo/React Native | ✅ Ja | ✅ | ✅ | APK direkt installierbar |
| **iOS** | Expo/React Native | ✅ Ja | ✅ | ✅ | TestFlight oder App Store |
| **Android Tablet** | Expo/React Native | ✅ Ja | ⚠️ Optional | ✅ | Größeres Display |
| **iPad** | Expo/React Native | ✅ Ja | ⚠️ Optional | ✅ | Größeres Display |

### 2.2 Desktop-Anwendungen

| Gerät | Technologie | Offline-Fähig | GPS | Mikrofon | Besonderheiten |
|-------|-------------|---------------|-----|----------|----------------|
| **Windows PC** | Electron / Python | ✅ Ja | ❌ Nein | ✅ USB | Installer verfügbar |
| **macOS** | Electron / Python | ✅ Ja | ❌ Nein | ✅ USB | DMG Package |
| **Linux Desktop** | Electron / Python | ✅ Ja | ❌ Nein | ✅ USB | AppImage / DEB |

### 2.3 Embedded Devices

| Gerät | Technologie | Offline-Fähig | GPS | Mikrofon | Besonderheiten |
|-------|-------------|---------------|-----|----------|----------------|
| **Raspberry Pi 4/5** | Python + systemd | ✅ Ja | ⚠️ USB GPS | ✅ USB | Headless, Dauerbetrieb |
| **Raspberry Pi Zero 2** | Python + systemd | ✅ Ja | ⚠️ USB GPS | ✅ USB | Stromsparend |
| **NVIDIA Jetson** | Python + CUDA | ✅ Ja | ⚠️ USB GPS | ✅ USB | GPU-Beschleunigung |
| **ESP32 + Audio** | C++ | ⚠️ Begrenzt | ❌ | ✅ | Nur Aufnahme, kein ML |

### 2.4 Web-Clients

| Zugang | Technologie | Offline-Fähig | GPS | Mikrofon | Besonderheiten |
|--------|-------------|---------------|-----|----------|----------------|
| **Browser (PWA)** | React/Vue | ⚠️ ServiceWorker | ✅ | ✅ | Keine Installation |
| **Admin Dashboard** | React | ❌ Nein | ❌ | ❌ | Nur Verwaltung |

---

## 3. Backend-Optionen

### 3.1 Docker-basiert

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOCKER DEPLOYMENT OPTIONS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Option A: Docker Compose (Lokal/NAS)                                   │
│  ┌────────────────────────────────────────┐                             │
│  │  docker-compose.yml                    │                             │
│  │  ├── birdsound-api (FastAPI)          │                             │
│  │  ├── postgres (Datenbank)             │                             │
│  │  ├── redis (Cache/Queue)              │                             │
│  │  └── nginx (Reverse Proxy)            │                             │
│  └────────────────────────────────────────┘                             │
│                                                                          │
│  Option B: Single Container (Einfach)                                   │
│  ┌────────────────────────────────────────┐                             │
│  │  docker run birdsound:latest          │                             │
│  │  └── SQLite intern                    │                             │
│  └────────────────────────────────────────┘                             │
│                                                                          │
│  Option C: Kubernetes (Skalierbar)                                      │
│  ┌────────────────────────────────────────┐                             │
│  │  Kubernetes Cluster                    │                             │
│  │  ├── API Deployment (3 Replicas)      │                             │
│  │  ├── PostgreSQL StatefulSet           │                             │
│  │  ├── Ingress Controller               │                             │
│  │  └── HorizontalPodAutoscaler          │                             │
│  └────────────────────────────────────────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Cloud-Plattformen

| Plattform | Service | Kosten | GPU | Auto-Scale | Komplexität |
|-----------|---------|--------|-----|------------|-------------|
| **Google Cloud Run** | Serverless Container | Pay-per-use | ❌ | ✅ | ⭐⭐ |
| **Google GKE** | Kubernetes | $70+/Monat | ✅ | ✅ | ⭐⭐⭐⭐ |
| **AWS Lambda** | Serverless Function | Pay-per-use | ❌ | ✅ | ⭐⭐⭐ |
| **AWS ECS** | Container Service | $30+/Monat | ✅ | ✅ | ⭐⭐⭐ |
| **Azure Container Apps** | Serverless Container | Pay-per-use | ❌ | ✅ | ⭐⭐ |
| **DigitalOcean App Platform** | PaaS | $12+/Monat | ❌ | ✅ | ⭐ |
| **Hetzner Cloud** | VPS + Docker | €5+/Monat | ❌ | ❌ | ⭐⭐ |
| **Fly.io** | Edge Container | Pay-per-use | ❌ | ✅ | ⭐⭐ |

### 3.3 Selbst-gehostet

| Setup | Hardware | Kosten | Internet | Wartung | Geeignet für |
|-------|----------|--------|----------|---------|--------------|
| **Windows PC** | Bestehend | Strom | ⚠️ Dynamische IP | ⭐ | Entwicklung |
| **Raspberry Pi** | ~€80 | ~€10/Jahr | ⚠️ Dynamische IP | ⭐⭐ | Heimnetzwerk |
| **NAS (Synology/QNAP)** | €300+ | Strom | ⚠️ DDNS | ⭐⭐ | Dauerbetrieb |
| **Home Server** | €200+ | Strom | ⚠️ DDNS | ⭐⭐⭐ | Power-User |
| **VPS (Hetzner etc.)** | - | €5+/Monat | ✅ Statische IP | ⭐⭐ | Öffentlich |

---

## 4. Konstellationen

### 4.1 Konstellation 1: Komplett Lokal (Offline)

```
┌─────────────────────────────────────────────────────────────┐
│                KONSTELLATION 1: OFFLINE                      │
│                     (Kein Internet)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────────────┐          │
│  │ 📱 Android    │◀───────▶│ 🖥️ Windows PC        │          │
│  │    App       │  WiFi   │    (Backend)         │          │
│  └──────────────┘         │    Port 8003         │          │
│                           └──────────────────────┘          │
│                                                              │
│  Vorteile:                                                  │
│  ✅ Kein Internet nötig                                     │
│  ✅ Volle Datenkontrolle                                    │
│  ✅ Keine Kosten                                            │
│                                                              │
│  Nachteile:                                                 │
│  ❌ Nur im lokalen Netzwerk                                 │
│  ❌ PC muss laufen                                          │
│  ❌ Kein Sync zwischen Geräten                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Typische Nutzer**: Hobby-Vogelbeobachter, Datenschutz-bewusste User

---

### 4.2 Konstellation 2: Raspberry Pi Feldstation

```
┌─────────────────────────────────────────────────────────────┐
│              KONSTELLATION 2: FELDSTATION                    │
│                  (Raspberry Pi Hotspot)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    🌲 Im Wald / Garten 🌲                    │
│                                                              │
│  ┌──────────────┐    WiFi    ┌──────────────────────┐       │
│  │ 📱 Smartphone │◀─────────▶│ 🍓 Raspberry Pi      │       │
│  │              │  Hotspot   │    - Backend         │       │
│  └──────────────┘            │    - USB Mikrofon    │       │
│                              │    - Powerbank/Solar │       │
│                              └──────────────────────┘       │
│                                                              │
│  Vorteile:                                                  │
│  ✅ Mobil einsetzbar                                        │
│  ✅ Kein Internet vor Ort nötig                             │
│  ✅ Dauerbetrieb möglich                                    │
│  ✅ Günstig (~€100 Setup)                                   │
│                                                              │
│  Nachteile:                                                 │
│  ❌ Begrenzter Akku                                         │
│  ❌ Nur lokaler Zugriff                                     │
│  ❌ Manuelle Daten-Übertragung                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Typische Nutzer**: Feldforschung, Naturschutzprojekte

---

### 4.3 Konstellation 3: Home Server + Mobile

```
┌─────────────────────────────────────────────────────────────┐
│             KONSTELLATION 3: HOME SERVER                     │
│                (NAS oder Raspberry Pi 24/7)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    HEIMNETZWERK                     │     │
│  │                                                     │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │     │
│  │  │📱Android │  │📱 iPad   │  │🖥️ Windows       │ │     │
│  │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │     │
│  │       │             │                  │           │     │
│  │       └─────────────┼──────────────────┘           │     │
│  │                     ▼                              │     │
│  │           ┌──────────────────┐                    │     │
│  │           │ 🐳 NAS/Docker    │                    │     │
│  │           │    Backend       │                    │     │
│  │           │    PostgreSQL    │                    │     │
│  │           └──────────────────┘                    │     │
│  │                     │                              │     │
│  └─────────────────────┼──────────────────────────────┘     │
│                        │ (Optional: DDNS/VPN)               │
│                        ▼                                     │
│                   🌐 Internet                                │
│                        │                                     │
│                   ┌────┴────┐                               │
│                   │📱Unterwegs│                              │
│                   └─────────┘                               │
│                                                              │
│  Vorteile:                                                  │
│  ✅ Alle Geräte synchron                                    │
│  ✅ 24/7 verfügbar                                          │
│  ✅ Volle Datenkontrolle                                    │
│  ✅ Mit VPN/DDNS auch unterwegs                             │
│                                                              │
│  Nachteile:                                                 │
│  ❌ Etwas technisches Know-how                              │
│  ❌ DDNS/VPN Setup für externen Zugriff                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Typische Nutzer**: Tech-affine Familien, Power-User

---

### 4.4 Konstellation 4: Cloud (Google Cloud Run)

```
┌─────────────────────────────────────────────────────────────┐
│               KONSTELLATION 4: CLOUD                         │
│                  (Google Cloud Run)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CLIENTS (überall auf der Welt)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │📱Android │ │📱 iPhone │ │🖥️Windows │ │🍓 RasPi  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│       └────────────┼────────────┼────────────┘              │
│                    │            │                           │
│                    ▼            ▼                           │
│               🌐 INTERNET 🌐                                │
│                    │                                        │
│                    ▼                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ☁️ GOOGLE CLOUD                         │   │
│  │  ┌───────────────────┐  ┌────────────────────────┐ │   │
│  │  │   Cloud Run       │  │   Cloud SQL            │ │   │
│  │  │   (API Container) │◀▶│   (PostgreSQL)         │ │   │
│  │  │   Auto-Scaling    │  │   Backups              │ │   │
│  │  └───────────────────┘  └────────────────────────┘ │   │
│  │           │                                         │   │
│  │           ▼                                         │   │
│  │  ┌───────────────────┐                             │   │
│  │  │   Cloud Storage   │                             │   │
│  │  │   (Audio Files)   │                             │   │
│  │  └───────────────────┘                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Vorteile:                                                  │
│  ✅ Überall erreichbar                                      │
│  ✅ Automatische Skalierung                                 │
│  ✅ Kein eigener Server nötig                               │
│  ✅ Professionelle Backups                                  │
│  ✅ Multi-User mit Accounts                                 │
│                                                              │
│  Nachteile:                                                 │
│  ❌ Monatliche Kosten (~$30-50)                             │
│  ❌ Internet erforderlich                                   │
│  ❌ Cold-Start Latenz                                       │
│  ❌ Daten bei Google                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Typische Nutzer**: Teams, Vereine, Wissenschaftsprojekte

---

### 4.5 Konstellation 5: Hybrid (Lokal + Cloud Sync)

```
┌─────────────────────────────────────────────────────────────┐
│               KONSTELLATION 5: HYBRID                        │
│             (Beste aus beiden Welten)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    ZUHAUSE                          │     │
│  │                                                     │     │
│  │  ┌──────────┐              ┌──────────────────┐   │     │
│  │  │📱 App    │◀────WiFi────▶│ 🍓 Raspberry Pi  │   │     │
│  │  │(Offline- │              │    (Lokales      │   │     │
│  │  │ Queue)   │              │     Backend)     │   │     │
│  │  └──────────┘              └────────┬─────────┘   │     │
│  │                                      │             │     │
│  └──────────────────────────────────────┼─────────────┘     │
│                                         │                    │
│                                    Sync │ (wenn online)     │
│                                         ▼                    │
│                                ┌─────────────────┐          │
│                                │ ☁️ Cloud Run    │          │
│                                │   (Backup &     │          │
│                                │    Community)   │          │
│                                └─────────────────┘          │
│                                         ▲                    │
│  ┌──────────────────────────────────────┼─────────────┐     │
│  │                   UNTERWEGS          │             │     │
│  │                                      │             │     │
│  │  ┌──────────┐                       │             │     │
│  │  │📱 App    │◀──────4G/5G───────────┘             │     │
│  │  │(Cloud    │                                     │     │
│  │  │ Modus)   │                                     │     │
│  │  └──────────┘                                     │     │
│  │                                                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                              │
│  Vorteile:                                                  │
│  ✅ Funktioniert offline UND online                         │
│  ✅ Lokale Analyse = schnell & kostenlos                    │
│  ✅ Cloud Sync für Backup & Teilen                          │
│  ✅ Community-Features verfügbar                            │
│  ✅ Niedrige Cloud-Kosten (nur Sync)                        │
│                                                              │
│  Nachteile:                                                 │
│  ❌ Komplexeres Setup                                       │
│  ❌ Zwei Backends warten                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Typische Nutzer**: Fortgeschrittene, die Flexibilität wollen

---

## 5. Entscheidungsmatrix

### Welche Konstellation passt zu mir?

| Kriterium | Lokal | RasPi Feld | Home Server | Cloud | Hybrid |
|-----------|-------|------------|-------------|-------|--------|
| **Kosten** | 💚 $0 | 💚 $0 | 💛 Strom | 💛 $30/Mo | 💛 $10/Mo |
| **Internet** | 💚 Nicht nötig | 💚 Nicht nötig | 💛 Optional | 🔴 Erforderlich | 💛 Optional |
| **Multi-Device** | 🔴 Nein | 🔴 Nein | 💚 Ja | 💚 Ja | 💚 Ja |
| **Multi-User** | 🔴 Nein | 🔴 Nein | 💛 Möglich | 💚 Ja | 💚 Ja |
| **Mobil nutzbar** | 🔴 Nein | 💛 Vor Ort | 💛 Mit VPN | 💚 Ja | 💚 Ja |
| **Setup-Aufwand** | 💚 Gering | 💛 Mittel | 💛 Mittel | 💚 Gering | 🔴 Hoch |
| **Datenschutz** | 💚 Maximal | 💚 Maximal | 💚 Maximal | 💛 Bei Google | 💚 Lokal first |
| **Community** | 🔴 Nein | 🔴 Nein | 🔴 Nein | 💚 Ja | 💚 Ja |
| **Skalierbarkeit** | 🔴 Nein | 🔴 Nein | 💛 Begrenzt | 💚 Unbegrenzt | 💚 Ja |

### Empfehlung nach Nutzertyp

| Nutzertyp | Empfehlung | Grund |
|-----------|------------|-------|
| **Einsteiger** | Lokal (Windows) | Einfachster Start |
| **Hobby-Beobachter** | Home Server | Alle Geräte, keine Kosten |
| **Feldforschung** | RasPi + Cloud Sync | Vor Ort offline, später sync |
| **Familie** | Home Server oder Cloud | Multi-Device wichtig |
| **Verein/Gruppe** | Cloud | Multi-User, Community |
| **Wissenschaft** | Cloud + API | Datensammlung, Auswertung |
| **Datenschutz-fokussiert** | Home Server | Volle Kontrolle |

---

## 6. Docker-Compose Varianten

### 6.1 Minimal (Single Container)

```yaml
# docker-compose.minimal.yml
version: '3.8'
services:
  birdsound:
    image: birdsound:latest
    ports:
      - "8003:8003"
    environment:
      - USE_SQLITE=true
    volumes:
      - ./data:/app/data
```

### 6.2 Standard (Mit PostgreSQL)

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: birdsound:latest
    ports:
      - "8003:8003"
    environment:
      - DATABASE_URL=postgresql://birdsound:secret@db:5432/birdsound
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=birdsound
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=birdsound
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 6.3 Produktion (Mit Nginx, Redis, Backup)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - api

  api:
    image: birdsound:latest
    environment:
      - DATABASE_URL=postgresql://birdsound:${DB_PASSWORD}@db:5432/birdsound
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=birdsound
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=birdsound
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

  backup:
    image: prodrigestivill/postgres-backup-local
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_DB=birdsound
      - POSTGRES_USER=birdsound
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - SCHEDULE=@daily
      - BACKUP_KEEP_DAYS=7
    volumes:
      - ./backups:/backups
    depends_on:
      - db

volumes:
  postgres_data:
  redis_data:
```

---

## 7. Netzwerk-Konfiguration

### 7.1 Ports

| Service | Port | Protokoll | Beschreibung |
|---------|------|-----------|--------------|
| BirdSound API | 8003 | HTTP | REST API |
| PostgreSQL | 5432 | TCP | Datenbank |
| Redis | 6379 | TCP | Cache |
| Nginx (HTTP) | 80 | HTTP | Reverse Proxy |
| Nginx (HTTPS) | 443 | HTTPS | SSL/TLS |

### 7.2 Firewall-Regeln (UFW)

```bash
# Nur API nach außen
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5432/tcp   # PostgreSQL nur intern
sudo ufw deny 6379/tcp   # Redis nur intern
```

### 7.3 DDNS für Home Server

| Anbieter | Kosten | Empfehlung |
|----------|--------|------------|
| DuckDNS | Kostenlos | ⭐⭐⭐ Gut für Hobby |
| No-IP | Kostenlos (30 Tage) | ⭐⭐ |
| Cloudflare Tunnel | Kostenlos | ⭐⭐⭐⭐ Beste Lösung |
| Fritz!Box MyFritz | Kostenlos | ⭐⭐⭐ Wenn Fritz!Box vorhanden |

---

## 8. Performance-Vergleich

| Setup | Cold Start | Analyse (3s Audio) | RAM | Gleichzeitige User |
|-------|------------|-------------------|-----|-------------------|
| **Windows PC** | 0s | ~300ms | 2-4GB | 5-10 |
| **Raspberry Pi 4** | 0s | ~1.5s | 1-2GB | 2-3 |
| **Raspberry Pi 5** | 0s | ~800ms | 2-4GB | 5-8 |
| **Docker (NAS)** | 5s | ~500ms | 2-4GB | 10-20 |
| **Cloud Run** | 10-30s | ~400ms | 4-8GB | 100+ (auto-scale) |
| **GKE mit GPU** | 0s | ~100ms | 8GB+ | 1000+ |

---

## 9. Migration zwischen Konstellationen

### Von Lokal zu Cloud

```bash
# 1. Daten exportieren
python scripts/export_data.py --format json --output backup.json

# 2. In Cloud importieren
curl -X POST https://api.birdsound.cloud/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "data=@backup.json"
```

### Von Cloud zu Lokal

```bash
# 1. Daten aus Cloud exportieren
curl https://api.birdsound.cloud/export \
  -H "Authorization: Bearer $TOKEN" \
  -o cloud_backup.json

# 2. Lokal importieren
python scripts/import_data.py --file cloud_backup.json
```

---

## 10. Zusammenfassung

```
┌─────────────────────────────────────────────────────────────┐
│                  EMPFEHLUNGEN                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🟢 EINSTEIGER     → Windows Lokal                          │
│  🟢 EINZELNUTZER   → Raspberry Pi / NAS                     │
│  🟢 FAMILIE        → Home Server (Docker)                   │
│  🟢 TEAM/VEREIN    → Google Cloud Run                       │
│  🟢 WISSENSCHAFT   → Cloud + API Keys                       │
│  🟢 MAXIMUM        → Hybrid (Lokal + Cloud Sync)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*Erstellt: 1. Dezember 2024*
*Status: Referenz-Dokumentation*
