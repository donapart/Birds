# BirdSound v5.13.0

**Release-Datum:** 2025

## Highlights

### 📬 Push-Benachrichtigungen end-to-end
- **Expo Push API Sender** im Backend (`backend/app/api/routes/push.py`):
  - `POST /api/v1/push/register` — Token-Registrierung mit Validierung (`ExponentPushToken[...]` / `ExpoPushToken[...]` / `DevPushToken[...]`).
  - `GET /api/v1/push/tokens/count` — Anzahl registrierter Tokens.
  - `POST /api/v1/push/send` — Manuell Notification an alle Tokens senden (Admin/Server-Use).
  - `POST /api/v1/push/test` — Testnachricht.
  - Batches ≤100 Tokens, Auto-Pruning bei `DeviceNotRegistered` / `InvalidCredentials` / `MessageTooBig`.
- **Trigger bei Erkennung** (Opt-in via `PUSH_NOTIFY_ON_DETECTION`):
  - Mindest-Konfidenz konfigurierbar (`PUSH_NOTIFY_MIN_CONFIDENCE`, default 0.85).
  - Cooldown pro Spezies (`PUSH_NOTIFY_COOLDOWN_SEC`, default 300s) verhindert Spam.
  - Asynchron (Fire-and-Forget) — keine Verzögerung der Inferenz-Pipeline.

### 🛡️ Sentry vollständig aktiviert
- `App.js` ist jetzt `Sentry.wrap(App)` als Default-Export (No-Op solange `extra.sentryDsn` leer ist).
- Expo Config-Plugin in `app.json` für native Symbolisierung beim Build.
- Aktivieren: DSN unter `extra.sentryDsn` in `app.json` setzen.

### 🧪 Backend-Tests für /push
- 7 neue Pytest-Tests in `backend/tests/test_push.py` (alle grün, ~1.3s):
  - Token-Registrierung (gültig, doppelt, ungültig, alternative Präfixe).
  - Count-Endpoint.
  - Send-Endpoint mit gemocktem `httpx.AsyncClient` (Ticket-Pruning).

### 📖 In-App Changelog-Modal
- Beim ersten Start nach Update wird automatisch ein Modal mit den Highlights angezeigt.
- Persistenz via `AsyncStorage.lastSeenVersion`.

### 🍏 iOS / EAS Submit vorbereitet
- `eas.json` erweitert um:
  - iOS-Simulator-Builds in `development` / `preview`.
  - `production` baut Android `app-bundle` (Play-Store-ready) + iOS `m-medium` Resource-Class.
  - `production-apk` Profil für direkte APK-Builds.
  - `submit.production.ios` Vorlage (Apple-ID, ASC App-ID, Team-ID auszufüllen).
- iOS Bundle-Identifier `com.birdsound.app` und `supportsTablet` bereits gesetzt.

### 🔒 npm audit Cleanup
- `npm audit fix` ausgeführt: **20 → 15 moderate** Vulnerabilities.
- Verbleibend: ausschließlich transitive Expo-SDK-Abhängigkeiten (`@expo/config`, `expo-constants`, `expo-notifications` etc.) — Fix erfordert SDK-Major-Bump und ist daher als Baseline akzeptiert.
- 0 critical / 0 high.

## Upgrade-Hinweise
- Keine Breaking Changes für End-User.
- Server-Operatoren, die Push-Trigger nutzen wollen: Env-Variablen setzen:
  ```
  PUSH_NOTIFY_ON_DETECTION=true
  PUSH_NOTIFY_MIN_CONFIDENCE=0.85
  PUSH_NOTIFY_COOLDOWN_SEC=300
  ```
- Sentry aktivieren: `extra.sentryDsn` in `mobile/expo-app/app.json` mit DSN befüllen, dann neu builden.

## Build
- APK: `BirdSound-v5.13.0.apk` (siehe Release-Assets).
- Version: `5.13.0` (versionCode/build 68).
