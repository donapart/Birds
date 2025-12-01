# 🐦 BirdSound Multi-User Cloud Architecture

## Übersicht

Dieses Dokument beschreibt die Planung für eine Multi-User Cloud-Architektur mit Google Cloud Run, die folgende Anforderungen erfüllt:

- **Multi-Account**: Ein User kann mehrere Accounts verwalten
- **Multi-Device**: Ein Account kann auf mehreren Geräten genutzt werden
- **Community-Daten**: Anonymisierte Sichtungen anderer User sehen
- **Datenschutz**: DSGVO-konform, anonymisierte öffentliche Daten

---

## 1. Benutzer-Konstellationen

### 1.1 Account-Modelle

```
┌─────────────────────────────────────────────────────────────┐
│                    ACCOUNT-STRUKTUREN                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Modell A: Ein User - Ein Account                           │
│  ┌──────┐     ┌─────────┐                                   │
│  │ User │────▶│ Account │                                   │
│  └──────┘     └─────────┘                                   │
│                                                              │
│  Modell B: Ein User - Mehrere Accounts (Familie/Projekte)   │
│  ┌──────┐     ┌─────────────┐                               │
│  │ User │────▶│ Account 1   │ (Privat)                      │
│  │      │────▶│ Account 2   │ (Wissenschaft)                │
│  │      │────▶│ Account 3   │ (Familie)                     │
│  └──────┘     └─────────────┘                               │
│                                                              │
│  Modell C: Ein Account - Mehrere Geräte                     │
│  ┌─────────┐     ┌────────────┐                             │
│  │ Account │◀────│ Smartphone │                             │
│  │         │◀────│ Tablet     │                             │
│  │         │◀────│ Raspberry  │                             │
│  │         │◀────│ Windows PC │                             │
│  └─────────┘     └────────────┘                             │
│                                                              │
│  Modell D: Kombiniert (realistisch)                         │
│  ┌──────┐     ┌───────────┐     ┌────────────────┐         │
│  │ User │────▶│ Account 1 │◀────│ 3 Geräte       │         │
│  │      │────▶│ Account 2 │◀────│ 2 Geräte       │         │
│  └──────┘     └───────────┘     └────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Anwendungsfälle

| Anwendungsfall | Accounts | Geräte | Beispiel |
|----------------|----------|--------|----------|
| **Privatnutzer** | 1 | 1-2 | Hobby-Vogelbeobachter mit Handy |
| **Familie** | 1 (geteilt) | 3-5 | Familien-Account auf allen Geräten |
| **Wissenschaftler** | 2+ | 5+ | Privat + Forschungsprojekt |
| **Verein/Gruppe** | 1 (Team) | 10+ | NABU-Ortsgruppe |
| **Power-User** | 3+ | 10+ | Mehrere Projekte, Regionen |

---

## 2. Datenbank-Schema

### 2.1 Tabellen-Struktur

```sql
-- Benutzer (Login-Identität)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- Accounts (Daten-Container, mehrere pro User möglich)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,  -- "Privat", "NABU Projekt 2024"
    description TEXT,
    owner_id UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,  -- Öffentliches Profil?
    share_detections BOOLEAN DEFAULT TRUE,  -- Anonyme Daten teilen?
    created_at TIMESTAMP DEFAULT NOW()
);

-- User-Account-Beziehung (für geteilte Accounts)
CREATE TABLE account_members (
    account_id UUID REFERENCES accounts(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',  -- owner, admin, member, viewer
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (account_id, user_id)
);

-- Geräte (registriert pro Account)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    name VARCHAR(100),  -- "Pixel 7", "Raspberry Pi Garten"
    device_type VARCHAR(50),  -- android, ios, raspberry, windows
    device_token VARCHAR(255),  -- Push-Notifications
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Erkennungen (mit Account & Device Zuordnung)
CREATE TABLE detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    device_id UUID REFERENCES devices(id),
    
    -- Vogel-Daten
    species VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    confidence FLOAT NOT NULL,
    model_used VARCHAR(100),
    
    -- Ort & Zeit
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_accuracy FLOAT,
    detected_at TIMESTAMP NOT NULL,
    timezone VARCHAR(50),
    
    -- Audio (optional)
    audio_file_url TEXT,
    audio_duration_seconds FLOAT,
    
    -- Metadaten
    weather_conditions JSONB,
    habitat_type VARCHAR(100),
    notes TEXT,
    
    -- Community
    is_public BOOLEAN DEFAULT TRUE,  -- In Community-Feed zeigen?
    is_verified BOOLEAN DEFAULT FALSE,  -- Von Experten bestätigt?
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Anonymisierte Community-View
CREATE VIEW community_detections AS
SELECT 
    id,
    species,
    scientific_name,
    confidence,
    model_used,
    -- Koordinaten auf ~1km gerundet für Datenschutz
    ROUND(latitude::numeric, 2) as latitude_approx,
    ROUND(longitude::numeric, 2) as longitude_approx,
    DATE(detected_at) as detection_date,
    EXTRACT(HOUR FROM detected_at) as detection_hour,
    habitat_type,
    is_verified
FROM detections
WHERE is_public = TRUE
  AND confidence >= 0.5;

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    device_id UUID REFERENCES devices(id),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    location_name VARCHAR(255),  -- "Stadtpark Berlin"
    detection_count INT DEFAULT 0,
    species_count INT DEFAULT 0
);

-- API-Keys für programmatischen Zugriff
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    name VARCHAR(100),
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB,  -- {"read": true, "write": false}
    expires_at TIMESTAMP,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Indizes für Performance

```sql
-- Häufige Abfragen optimieren
CREATE INDEX idx_detections_account ON detections(account_id);
CREATE INDEX idx_detections_species ON detections(species);
CREATE INDEX idx_detections_location ON detections USING GIST (
    ST_MakePoint(longitude, latitude)
);
CREATE INDEX idx_detections_time ON detections(detected_at);
CREATE INDEX idx_detections_public ON detections(is_public) WHERE is_public = TRUE;
```

---

## 3. API-Endpunkte

### 3.1 Authentifizierung

```
POST /auth/register          # Neuen User registrieren
POST /auth/login             # Login, JWT Token erhalten
POST /auth/refresh           # Token erneuern
POST /auth/logout            # Logout (Token invalidieren)
POST /auth/forgot-password   # Passwort-Reset anfordern
POST /auth/verify-email      # E-Mail verifizieren
```

### 3.2 Account-Management

```
GET    /accounts                    # Alle Accounts des Users
POST   /accounts                    # Neuen Account erstellen
GET    /accounts/{id}               # Account-Details
PUT    /accounts/{id}               # Account bearbeiten
DELETE /accounts/{id}               # Account löschen

POST   /accounts/{id}/members       # Mitglied hinzufügen
DELETE /accounts/{id}/members/{uid} # Mitglied entfernen
PUT    /accounts/{id}/members/{uid} # Rolle ändern
```

### 3.3 Geräte-Management

```
GET    /accounts/{id}/devices       # Alle Geräte eines Accounts
POST   /accounts/{id}/devices       # Neues Gerät registrieren
PUT    /devices/{id}                # Gerät umbenennen
DELETE /devices/{id}                # Gerät entfernen
POST   /devices/{id}/sync           # Offline-Daten synchronisieren
```

### 3.4 Erkennungen

```
# Eigene Daten
GET    /accounts/{id}/detections    # Alle Erkennungen des Accounts
POST   /accounts/{id}/detections    # Neue Erkennung speichern
GET    /detections/{id}             # Einzelne Erkennung
PUT    /detections/{id}             # Erkennung bearbeiten
DELETE /detections/{id}             # Erkennung löschen

# Batch-Upload (Offline-Sync)
POST   /accounts/{id}/detections/batch  # Mehrere auf einmal

# Community
GET    /community/detections        # Anonymisierte Community-Daten
GET    /community/hotspots          # Beliebte Beobachtungsorte
GET    /community/species/{name}    # Sichtungen einer Art
GET    /community/statistics        # Globale Statistiken
```

### 3.5 Analyse (weiterhin CPU-intensiv)

```
POST   /api/v1/predict              # Audio analysieren
POST   /api/v1/predict/batch        # Mehrere Dateien
GET    /api/v1/models               # Verfügbare Modelle
```

---

## 4. Datenschutz & Anonymisierung

### 4.1 Datenschutz-Stufen

```
┌─────────────────────────────────────────────────────────────┐
│                   DATENSCHUTZ-LEVELS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Level 0: PRIVAT (Default)                                  │
│  - Nur der Account-Besitzer sieht die Daten                 │
│  - Exakte Koordinaten, Zeiten, Audio-Dateien                │
│                                                              │
│  Level 1: ACCOUNT-GETEILT                                   │
│  - Alle Mitglieder des Accounts sehen die Daten             │
│  - Für Familien, Teams, Projekte                            │
│                                                              │
│  Level 2: COMMUNITY-ANONYMISIERT                            │
│  - Alle User sehen anonymisierte Version                    │
│  - Koordinaten auf ~1km gerundet                            │
│  - Nur Datum, keine genaue Uhrzeit                          │
│  - Kein Bezug zum User/Account                              │
│                                                              │
│  Level 3: WISSENSCHAFT                                      │
│  - Für Forschungsprojekte mit Einwilligung                  │
│  - Genauere Daten mit Pseudonymisierung                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Anonymisierung für Community-Daten

```python
def anonymize_detection(detection: Detection) -> dict:
    """Anonymisiert eine Erkennung für die Community-Ansicht."""
    return {
        "id": generate_anonymous_id(detection.id),  # Nicht rückverfolgbar
        "species": detection.species,
        "scientific_name": detection.scientific_name,
        "confidence": round(detection.confidence, 1),  # Auf 10% gerundet
        "model_used": detection.model_used,
        
        # Ort: auf ~1km gerundet (2 Dezimalstellen ≈ 1.1km)
        "latitude": round(detection.latitude, 2),
        "longitude": round(detection.longitude, 2),
        
        # Zeit: nur Datum und Tageszeit-Kategorie
        "date": detection.detected_at.date().isoformat(),
        "time_of_day": categorize_time(detection.detected_at),  # "morning", "afternoon", "evening", "night"
        
        # Optional
        "habitat_type": detection.habitat_type,
        "is_verified": detection.is_verified,
    }

def categorize_time(dt: datetime) -> str:
    """Kategorisiert Uhrzeit statt exakte Zeit zu zeigen."""
    hour = dt.hour
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 21:
        return "evening"
    else:
        return "night"
```

### 4.3 DSGVO-Compliance

| Anforderung | Umsetzung |
|-------------|-----------|
| **Einwilligung** | Opt-in für Community-Sharing bei Registrierung |
| **Auskunftsrecht** | Export aller eigenen Daten als JSON/CSV |
| **Löschrecht** | Account-Löschung löscht alle Daten |
| **Datenportabilität** | Export in Standard-Formaten (KML, CSV, JSON) |
| **Zweckbindung** | Nur für Vogelbeobachtung, keine Werbung |
| **Datenminimierung** | Nur notwendige Daten erfassen |

---

## 5. Synchronisation

### 5.1 Offline-First Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNC-ARCHITEKTUR                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GERÄT (Offline-fähig)                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │  Local Storage (AsyncStorage / SQLite)      │            │
│  │  ├── detections_queue[]    (nicht synced)   │            │
│  │  ├── detections_synced[]   (bereits synced) │            │
│  │  ├── last_sync_timestamp                    │            │
│  │  └── offline_sessions[]                     │            │
│  └─────────────────────────────────────────────┘            │
│                          │                                   │
│                          ▼ (wenn online)                    │
│                   ┌──────────────┐                          │
│                   │  Sync Service │                          │
│                   └──────────────┘                          │
│                          │                                   │
│                          ▼                                   │
│  CLOUD (Google Cloud Run)                                   │
│  ┌─────────────────────────────────────────────┐            │
│  │  PostgreSQL (Cloud SQL)                     │            │
│  │  ├── Konflikt-Resolution (Last-Write-Wins)  │            │
│  │  ├── Merge-Strategien für Edits             │            │
│  │  └── Tombstones für Löschungen              │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Sync-Algorithmus

```javascript
// Client-Side Sync
async function syncWithCloud() {
  const lastSync = await getLastSyncTimestamp();
  const localChanges = await getUnsyncedDetections();
  
  // 1. Lokale Änderungen hochladen
  if (localChanges.length > 0) {
    const response = await api.post('/detections/batch', {
      detections: localChanges,
      device_id: DEVICE_ID,
      last_sync: lastSync,
    });
    
    // Konflikte behandeln
    if (response.conflicts.length > 0) {
      await resolveConflicts(response.conflicts);
    }
    
    // Als gesynced markieren
    await markAsSynced(localChanges.map(d => d.id));
  }
  
  // 2. Server-Änderungen herunterladen
  const serverChanges = await api.get('/detections/changes', {
    since: lastSync,
    account_id: ACCOUNT_ID,
  });
  
  await applyServerChanges(serverChanges);
  await setLastSyncTimestamp(new Date());
}
```

---

## 6. Community-Features

### 6.1 Community-Heatmap

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMUNITY MAP                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│     🔴 = Viele Sichtungen (>100)                            │
│     🟠 = Mittel (20-100)                                     │
│     🟡 = Wenige (5-20)                                       │
│     🟢 = Einzelne (1-5)                                      │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │                    🟡                        │           │
│  │         🟢                   🔴              │           │
│  │                🟠                            │           │
│  │    🟢                            🟡         │           │
│  │              🟢      🟠                      │           │
│  │                           🟢                │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  Filter: [Alle Arten ▼] [Letzte 7 Tage ▼] [5km Radius ▼]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Community-Statistiken

```json
{
  "global": {
    "total_detections": 1250000,
    "total_species": 2847,
    "total_users": 15420,
    "detections_today": 3250
  },
  "trending_species": [
    {"species": "Amsel", "count_7d": 12500, "trend": "+15%"},
    {"species": "Kohlmeise", "count_7d": 9800, "trend": "+8%"},
    {"species": "Rotkehlchen", "count_7d": 7200, "trend": "+22%"}
  ],
  "hotspots": [
    {"name": "Tiergarten Berlin", "detections_7d": 450, "species": 34},
    {"name": "Englischer Garten München", "detections_7d": 380, "species": 28}
  ],
  "rare_sightings": [
    {"species": "Eisvogel", "location_approx": "Bayern", "date": "2024-12-01"}
  ]
}
```

### 6.3 Benachrichtigungen (Optional)

```python
# Push-Notification Triggers
NOTIFICATION_TYPES = {
    "rare_species_nearby": {
        "description": "Seltene Art in deiner Nähe gesichtet",
        "radius_km": 10,
        "min_rarity": 4,
    },
    "new_species_region": {
        "description": "Neue Art in deiner Region",
        "check_period_days": 365,
    },
    "milestone": {
        "description": "Du hast 100 Arten entdeckt!",
    },
    "community_verified": {
        "description": "Deine Sichtung wurde bestätigt",
    },
}
```

---

## 7. Kostenplanung

### 7.1 Google Cloud Kosten (geschätzt)

| Service | Nutzung | Kosten/Monat |
|---------|---------|--------------|
| **Cloud Run** | 100k Requests, 4GB RAM | ~$15-30 |
| **Cloud SQL** (PostgreSQL) | db-f1-micro, 10GB | ~$10 |
| **Cloud Storage** | Audio-Dateien, 50GB | ~$1 |
| **Secret Manager** | API Keys | ~$0.50 |
| **Cloud Build** | CI/CD | ~$0 (Free Tier) |
| **Networking** | Egress | ~$5 |
| **Total** | | **~$30-50/Monat** |

### 7.2 Skalierung

| User-Anzahl | Requests/Tag | Geschätzte Kosten |
|-------------|--------------|-------------------|
| 1-100 | 1.000 | $10-20/Monat |
| 100-1.000 | 10.000 | $30-50/Monat |
| 1.000-10.000 | 100.000 | $100-200/Monat |
| 10.000+ | 1.000.000+ | $500+/Monat |

---

## 8. Implementierungs-Roadmap

### Phase 1: Basis (2-3 Wochen)
- [ ] User-Authentifizierung (JWT)
- [ ] Account-CRUD
- [ ] Geräte-Registrierung
- [ ] Cloud SQL Setup
- [ ] Cloud Run Deployment

### Phase 2: Multi-Device (1-2 Wochen)
- [ ] Offline-Queue im Client
- [ ] Sync-Endpunkte
- [ ] Konflikt-Resolution
- [ ] Device-Management UI

### Phase 3: Community (2-3 Wochen)
- [ ] Anonymisierungs-Layer
- [ ] Community-Endpunkte
- [ ] Heatmap-API
- [ ] Statistiken

### Phase 4: Polish (1-2 Wochen)
- [ ] Push-Notifications
- [ ] Rate-Limiting
- [ ] Monitoring & Alerts
- [ ] Dokumentation

---

## 9. Sicherheit

### 9.1 Authentifizierung

```python
# JWT Token Struktur
{
    "sub": "user-uuid",
    "email": "user@example.com",
    "accounts": ["account-uuid-1", "account-uuid-2"],
    "current_account": "account-uuid-1",
    "device_id": "device-uuid",
    "iat": 1701234567,
    "exp": 1701320967  # 24h
}
```

### 9.2 Rate Limiting

| Endpunkt | Limit | Zeitraum |
|----------|-------|----------|
| `/auth/*` | 10 | pro Minute |
| `/api/v1/predict` | 100 | pro Stunde |
| `/detections` POST | 1000 | pro Tag |
| `/community/*` | 1000 | pro Stunde |

### 9.3 API-Key Scopes

```python
SCOPES = {
    "read:own": "Eigene Daten lesen",
    "write:own": "Eigene Daten schreiben",
    "read:community": "Community-Daten lesen",
    "admin:account": "Account verwalten",
    "analyze": "Audio analysieren",
}
```

---

## 10. Nächste Schritte

1. **Entscheidung**: Welche Features sind für MVP essentiell?
2. **Google Cloud Setup**: Projekt erstellen, Billing aktivieren
3. **Datenbank-Migration**: Von SQLite zu Cloud SQL
4. **Auth-System**: Firebase Auth oder eigene Implementation?
5. **Client-Update**: App um Login/Sync erweitern

---

*Erstellt: 1. Dezember 2024*
*Status: Planung*
