# Changelog v5.12.0 (Build 67)

Veröffentlicht: 2025

## Highlights

### 🌓 Theme-Umschalter (Dark / Light / Auto)
- Neue Einstellung in den Settings: `Auto` (folgt System), `Dunkel` oder `Hell`.
- Komplette Farbpalette zentral in `PAL` definiert; Komponenten-Styles via `makeStyles(palette)`-Factory.
- Persistenz über `AsyncStorage` gemeinsam mit allen anderen Settings.

### 💾 Datensicherung als ZIP-Export
- Neue Schaltfläche in den Settings: „📦 Backup erstellen".
- Erzeugt ein ZIP via [JSZip](https://stuk.github.io/jszip/) mit:
  - `detections.json` (alle Erkennungen)
  - `sessions.json` (alle Aufnahme-Sessions)
  - `settings.json` (aktuelle App-Konfiguration)
  - `meta.json` (Version, Zeitstempel, Statistik)
- Teilbar/speicherbar per `expo-sharing`.

### 🛡️ Sentry Crash-Reporting (Opt-in)
- `@sentry/react-native` integriert.
- Aktivierung: `expo.extra.sentryDsn` in `app.json` setzen — leer = deaktiviert.
- Release-Tag `birdsound@<version>`, Environment automatisch (`development` / `production`), `tracesSampleRate: 0.2`.
- Volles Init am Modul-Start; Sentry-Wrap (ErrorBoundary) für v5.13.0 vorgemerkt.

### 🔔 Push-Benachrichtigungen (Scaffold)
- `expo-notifications` + `expo-device` integriert.
- Android-Channels: `default` (DEFAULT) und `detections` (HIGH, türkises Licht).
- Opt-in via Settings: „🔔 Push-Benachrichtigungen" (Aus/An).
- Bei Aktivierung: Permission-Request → Expo-Push-Token → AsyncStorage + Backend-POST.
- Neuer Backend-Endpoint: `POST /api/v1/push/register` (token, platform, version) → Persistenz in `backend/app/data/push_tokens.json`.
- `GET /api/v1/push/tokens/count` für Diagnose.

## Backend
- Neuer Router `app/api/routes/push.py` mit Pydantic-Validierung, JSON-Datei-Persistenz.
- `requirements.txt`-Versions-Floors auf aktuelle Patch-Releases gehoben (vorher in v5.11.0 vorbereitet, jetzt aktiv).

## Datei-Änderungen
- `mobile/expo-app/App.js` — Theme, Backup, Sentry, Push.
- `mobile/expo-app/app.json` — Version 5.12.0, Build 67, `extra.sentryDsn` Slot.
- `mobile/expo-app/android/app/build.gradle` — `versionCode 67`, `versionName "5.12.0"`.
- `mobile/expo-app/package.json` — neue Deps: `jszip`, `@sentry/react-native`, `expo-notifications`, `expo-device`.
- `backend/app/main.py` — Push-Router registriert.
- `backend/app/api/routes/__init__.py` — Push-Modul exportiert.
- `backend/app/api/routes/push.py` (neu).
- `backend/app/data/mobile_version.json` — auf 5.12.0/67 aktualisiert.

## Bekannte Hinweise
- Sentry-Config-Plugin meldet beim `expo install` warning zu fehlender `org`/`project`-Konfiguration. Akzeptabel: ohne DSN passiert ohnehin nichts.
- `npm audit` zeigt 19–20 transitive Vulnerabilities (16–17 moderate, 3 high) — keine direkte Exposure, vertagt.
- Sentry-Wrap (ErrorBoundary) noch nicht aktiviert; reine `Sentry.init` deckt Crashes ab.

## Upgrade-Pfad
1. APK `BirdSound-v5.12.0.apk` aus dem GitHub-Release herunterladen und installieren (über v5.11.0 möglich, kein Datenverlust).
2. Backend neu deployen / starten — neuer `/api/v1/push/*` Endpoint ist verfügbar.
3. Optional: in `mobile/expo-app/app.json` unter `expo.extra.sentryDsn` den Sentry-DSN einsetzen, dann neu bauen.
