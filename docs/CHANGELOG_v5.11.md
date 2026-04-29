# BirdSound v5.11.0 (Build 66)

**Release**: November 2025

## ✨ Neue Funktionen

### 💾 Filter-Persistenz
Alle Karten-Einstellungen werden jetzt persistent in `AsyncStorage` gespeichert und beim App-Start wiederhergestellt:
- Karten-Layer (Standard / Satellit / Topographie)
- Heatmap An/Aus
- Zeitbereich (24h / 7d / 30d / Alle)
- Mindest-Konfidenz
- Artenfilter

### 🔄 Pull-to-Refresh
Sowohl im **Liste-Tab** (Erkennungen) als auch im **Sessions-Tab** kann durch Herunterziehen aktualisiert werden. Lädt Erkennungen, Sessions und Statistiken neu.

### ▶️ Audio-Replay
Aufgenommene Audio-Clips können direkt abgespielt werden:
- In der Erkennungsliste neben jedem Eintrag mit `audioUri`
- In Session-Details: pro erkannter Art wird die Aufnahme mit der höchsten Konfidenz abgespielt

Verwendet `expo-av` `Audio.Sound` und stoppt vorherige Wiedergabe automatisch.

### 📑 CSV-Export
Excel/DE-kompatibel mit UTF-8 BOM (`\uFEFF`) und Semikolon-Trennung:
- **Erkennungen**: alle erfassten Vögel mit Spalten `species;scientific;english;confidence;time;lat;lng;accuracy;altitude;model`
- **Sessions**: identisches Format pro Session

### 📍 GPS-Genauigkeit
- Erfassung mit `Location.Accuracy.High`
- Genauigkeit (in Metern) wird zusammen mit Höhe gespeichert
- Anzeige in Listenzeile: `📍 ±Xm`

### 🔍 Fuzzy-Suche in Bibliothek
Tippfehler-tolerante Suche (Levenshtein-Distanz mit Early-Exit) durchsucht parallel:
- Deutscher Name
- Wissenschaftlicher Name (Latein)
- Englischer Name
- Familie

## 🛠️ Technisch
- React Native 0.81.5, React 19.1.0, Expo SDK ~54.0.25
- versionCode 66, versionName 5.11.0
- Single-source-of-truth Version aus `app.json`
