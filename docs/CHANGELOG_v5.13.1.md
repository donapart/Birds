# BirdSound v5.13.1

**Release-Datum:** 30. April 2026
**Typ:** Patch / Bugfix

## Highlights

### 🔊 Wiedergabe von Aufnahmen funktioniert wieder zuverlässig
- **Problem:** Beim Antippen einer Erkennung scheiterte die Wiedergabe oft mit
  `FileNotFoundException … /cache/Audio/recording-…m4a (ENOENT)`. Ursache: Die
  Audiodatei wurde im flüchtigen Android-App-Cache abgelegt, den das System
  jederzeit (und insbesondere nach App-Neustart, Speicherengpass oder „Cache
  leeren") löschen kann.
- **Fix:** Neue Aufnahmen werden direkt nach der Analyse aus dem Cache in den
  persistenten Bereich `documentDirectory/recordings/` kopiert (`processDet`).
  Die Detection speichert ab sofort den dauerhaften Pfad, nicht mehr die
  Cache-URI.
- **Schutzschild bei alten Aufnahmen:** `playDetectionAudio` prüft die Datei
  vor dem Laden mit `FileSystem.getInfoAsync`. Existiert die Datei nicht mehr
  (alte Detection vor dem Fix oder manuell gelöscht), erscheint die freundliche
  Meldung „Aufnahme nicht mehr verfügbar" statt einer nativen Ausnahme.

### 🐦 Filter für nicht-europäische Megapoden / Großfußhühner
- **Problem:** BirdNET klassifizierte Geräusche gelegentlich als
  *Orange-footed Scrubfowl* (*Megapodius reinwardt*, Australasien). Die Art
  fehlte in der deutschen Bibliothek und im Geo-Plausibilitätsfilter, sodass
  der englische Name in den Erkennungen auftauchte.
- **Fix:** `EXOTIC_KEYWORDS` in `SpeciesResolver.js` erweitert um:
  `scrubfowl`, `megapode`, `brush-turkey`, `brushturkey`, `maleo`,
  `mound-builder`, `malleefowl`, `junglefowl`, `orange-footed`. Die Treffer
  werden jetzt vom Plausibilitätsfilter (`isPlausibleEuropean`) verworfen,
  bevor sie in der Liste oder Karte erscheinen.

## Geänderte Dateien
- `mobile/expo-app/App.js` (persistentes Audio + Wiedergabe-Guard, Changelog-Modal-Text, Versionsanzeige)
- `mobile/expo-app/src/utils/SpeciesResolver.js` (Exotik-Filter erweitert)
- `mobile/expo-app/app.json` (`version: 5.13.1`, `versionCode: 69`)
- `mobile/expo-app/package.json` (`version: 5.13.1`)
- `mobile/expo-app/android/app/build.gradle` (`versionName "5.13.1"`, `versionCode 69`)

## Hinweise
- Bestehende Detections (vor dem Update) verweisen weiterhin auf den Cache —
  diese Wiedergaben können fehlschlagen. Ab v5.13.1 aufgenommene Beobachtungen
  sind dauerhaft abspielbar.
- Empfehlung für viel-aufnehmende Nutzer: gelegentlich alte Beobachtungen
  exportieren oder löschen, da `documentDirectory/recordings/` wächst, bis es
  vom Nutzer / der App geleert wird.
