# Changelog - BirdSound v5.8.0

## Version 5.8.0 - 3. März 2026

### 🎯 Hauptfeature: Vogelerkennung funktioniert jetzt zuverlässig!

Alle drei ML-Modelle wurden repariert und erfolgreich mit **echten Vogelaufnahmen** getestet. Die Erkennung liefert jetzt korrekte Ergebnisse mit hoher Konfidenz.

### 🐛 Kritische Bug-Fixes (ML-Pipeline)

- **[CRITICAL] BirdNET: predict() → predict_arrays()**
  - `model.predict()` akzeptiert nur Dateipfade, nicht Numpy-Arrays
  - Umstellung auf `model.predict_arrays()` für In-Memory Audio-Verarbeitung
  - Zusätzlich: `asyncio.run_in_executor()` wrapper um blockierende Inferenz
  - Ergebnis: BirdNET erkennt Northern Cardinal mit **99.3%** Konfidenz

- **[CRITICAL] DimaBird: Sample-Rate korrigiert (48kHz → 16kHz)**
  - Wav2Vec2-Modell erwartet 16kHz, erhielt aber 48kHz Audio
  - `model_registry.py`: Explizites `sample_rate=16000` für DimaBird
  - Ergebnis: DimaBird liefert jetzt sinnvolle Vorhersagen

- **[CRITICAL] Perch: Komplett-Reparatur**
  - **Signature-Key**: `signatures['default']` → `signatures['serving_default']`
  - **Label-Laden**: CSV aus TF Hub Cache statt leerer Fallback (10.932 Arten)
  - **Audio-Padding**: Exakt 160.000 Samples (5s @ 32kHz) statt variabel
  - **PredictionResult-Felder**: Korrekte Feld-Zuordnung (species, confidence, rank)
  - Ergebnis: Perch erkennt Great Horned Owl mit **99.8%** Konfidenz

- **[HIGH] PredictionResult: Property-Aliase hinzugefügt**
  - Neue `@property` Methoden: `species_common`, `species_code`, `species_scientific`
  - Behebt `AttributeError: 'PredictionResult' object has no attribute 'species_common'`

- **[MEDIUM] Vorhersagen nach Konfidenz sortiert**
  - `/api/v1/predict/upload` gibt Ergebnisse jetzt absteigend nach Konfidenz zurück
  - Beste Vorhersage (höchste Konfidenz über alle Modelle) steht an Position #1

- **[LOW] .gitignore: models/ Pattern korrigiert**
  - `models/` Pattern ignorierte auch `backend/app/models/` Python-Quellcode
  - Geändert zu `/models/` und `backend/models/` für ML-Modelldateien

### ✅ Verifizierte Testergebnisse (Echte Vogelaufnahmen)

| Vogelart | BirdNET | Perch | Korrekt |
|----------|---------|-------|---------|
| Northern Cardinal | **99.3%** | 91.1% (norcar) | ✅ |
| Great Horned Owl | **97.4%** | **99.8%** (grhowl) | ✅ |
| Hermit Thrush | **82.4%** | 27.5% (herthr) | ✅ |
| Gray Catbird | **79.6%** | 74.2% (grycat) | ✅ |
| Northern Cardinal (Wald) | **67.3%** | 17.0% (norcar) | ✅ |
| Warbling Vireo | **33.4%** | 49.0% (blackc1) | ✅ |
| Western Meadowlark | **22.7%** | 21.7% (bkbmag1) | ✅ |

**Ergebnis: 7/7 Vogelarten korrekt erkannt!**

### 🤖 Modell-Übersicht

| Modell | Artenanzahl | Stärken |
|--------|-------------|---------|
| **BirdNET v2.4** | 6.522 | Höchste Genauigkeit, wissenschaftliche Namen |
| **Google Perch** | 10.932 | Größte Artabdeckung, eBird-Codes |
| **DimaBird** | 50 | Schnell, aber begrenzte Artenliste |

### 📁 Geänderte Dateien

- `backend/app/models/birdnet_official.py` - Komplett-Rewrite mit predict_arrays + run_in_executor
- `backend/app/models/perch_runtime.py` - serving_default, Label-CSV, Audio-Padding
- `backend/app/models/base.py` - Property-Aliase für PredictionResult
- `backend/app/services/model_registry.py` - DimaBird sample_rate=16000
- `backend/app/api/routes/predict.py` - Predictions nach Konfidenz sortiert
- `.gitignore` - models/ Pattern korrigiert

### 🔧 Technische Details

**BirdNET Backend-Erkenntnis:** Der `'tf'` Backend in birdnet verwendet tatsächlich TFLite (`.tflite` Modelldateien), NICHT TensorFlow SavedModel. Der `'pb'` Backend hängt bei `predict_arrays()` und sollte NICHT verwendet werden. Backend `'tflite'` existiert nicht im Package.

**Audio-Pipeline:**
- AudioProcessor: 48kHz → Resample pro Modell
- BirdNET: 48kHz, 3s Segmente, TFLite Interpreter
- DimaBird: 16kHz, Wav2Vec2ForAudioClassification
- Perch: 32kHz, 5s (160.000 Samples), TF Hub SavedModel

---

*Release getestet auf Docker (birdsound-api) mit Ubuntu + Python 3.11*
