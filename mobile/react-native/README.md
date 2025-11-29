# BirdSound Mobile App - Android

Vogelerkennungs-App mit Stereo-Mikrofon-Support für Richtungserkennung.

## Features

- 🎙️ **Stereo Audio-Aufnahme** - Richtung des Vogels erkennen
- 🧭 **Kompass-Anzeige** - Zeigt woher der Gesang kommt
- 🔌 **USB Audio Interface** - Externe Mikrofone anschließen
- 📴 **Offline-Modus** - Lokale Vogelbestimmung ohne Internet
- 🌡️ **Wetter-Integration** - Wetterdaten automatisch speichern
- 📍 **GPS-Ortung** - Standort der Beobachtung

## Installation

### Voraussetzungen

- Node.js 18+
- Java JDK 17
- Android Studio mit SDK 33+
- React Native CLI

### Setup

```bash
# 1. Abhängigkeiten installieren
cd mobile/react-native
npm install

# 2. Android Emulator oder Gerät verbinden
adb devices

# 3. App starten
npm run android
```

## Mikrofon-Empfehlungen

### Für Stereo-Aufnahmen (Richtungserkennung)

| Kategorie | Modell | Preis | Beschreibung |
|-----------|--------|-------|--------------|
| Budget | **Edutige EIM-003** | ~50€ | Binaurale In-Ears |
| Mittel | **Rode VideoMic Pro+** Stereo | ~200€ | XY-Stereo |
| Profi | **Sennheiser MKH 8040 Stereo** | ~2000€ | MS-Stereo für Wissenschaft |

### USB Audio Interfaces

| Modell | Preis | Kanäle | Bemerkung |
|--------|-------|--------|-----------|
| Behringer UMC22 | ~40€ | 2 | Gut für Einsteiger |
| Focusrite Scarlett 2i2 | ~150€ | 2 | Professionell |
| Zoom F3 | ~300€ | 2+2 | Field Recorder |

## Stereo-Richtungserkennung

Die App analysiert Stereo-Audio auf zwei Arten:

### 1. Phasendifferenz (ITD - Interaural Time Difference)
Schall erreicht das nähere Mikrofon früher:
```
Δt = d × sin(θ) / c
```
- d = Mikrofonabstand (~17cm bei Kopfhörern)
- θ = Winkel zur Schallquelle
- c = Schallgeschwindigkeit (343 m/s)

### 2. Pegeldifferenz (ILD - Interaural Level Difference)
Das nähere Mikrofon empfängt lauteren Schall:
```
ILD = 20 × log10(L_links / L_rechts)
```

### Genauigkeit
- ±5° bei 1m Mikrofonabstand
- ±10-15° bei Standard-Stereo
- Funktioniert am besten bei 1-4 kHz (Vogelgesang!)

## Projekt-Struktur

```
react-native/
├── App.tsx                      # Hauptkomponente
├── package.json                 # Abhängigkeiten
├── src/
│   └── services/
│       ├── BirdSoundService.ts       # Basis API-Service
│       ├── StereoAudioService.ts     # Stereo-Analyse
│       └── EnhancedBirdSoundService.ts # Kombinierter Service
└── android/
    └── app/
        └── src/main/
            ├── AndroidManifest.xml   # Berechtigungen
            └── res/xml/
                └── usb_audio_filter.xml
```

## API-Konfiguration

Die App verbindet sich standardmäßig mit `http://localhost:8003`.

Für Produktion in `App.tsx` ändern:
```typescript
const [apiUrl, setApiUrl] = useState('https://your-server.com');
```

## Berechtigungen

Die App benötigt:
- `RECORD_AUDIO` - Mikrofon-Zugriff
- `ACCESS_FINE_LOCATION` - GPS für Standort
- `INTERNET` - API-Aufrufe
- `USB_PERMISSION` - Externe USB-Mikrofone

## Offline-Modus

Im Offline-Modus:
1. Aufnahmen werden lokal gespeichert
2. Europäische Vogelarten-DB ist eingebaut
3. Synchronisation bei nächster Verbindung

## Entwicklung

```bash
# Metro Bundler starten
npm start

# Android Build
npm run android

# Release APK erstellen
cd android
./gradlew assembleRelease
```

## Lizenz

MIT
