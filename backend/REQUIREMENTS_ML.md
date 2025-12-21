# Production ML Models - Requirements

## WICHTIG: Optional Dependencies

Diese Dependencies sind **NUR erforderlich wenn `USE_MODEL_STUBS=false`** gesetzt ist.

Für Entwicklung und Testing mit `USE_MODEL_STUBS=true` werden diese NICHT benötigt!

## Installation

### Vollständige Installation (alle Modelle)

```bash
pip install -r requirements-ml-full.txt
```

### Minimale Installation (nur 1-2 Modelle)

**Nur BirdNET Official:**
```bash
pip install birdnet>=0.2.0
```

**Nur DimaBird (HuggingFace):**
```bash
pip install transformers>=4.35.0 torch>=2.0.0
```

**Nur Perch (Google):**
```bash
pip install tensorflow>=2.13.0 tensorflow-hub>=0.14.0
```

## Requirements Details

### 1. BirdNET (6,000+ Arten)

**Option A: Official Package (empfohlen)**
```bash
pip install birdnet>=0.2.0
```

**Option B: ONNX Runtime (alternativ)**
```bash
pip install onnxruntime>=1.16.0

# Plus Model-Dateien herunterladen:
python scripts/download_models.py birdnet
```

### 2. DimaBird - HuggingFace (50 europäische Arten)

```bash
pip install transformers>=4.35.0 torch>=2.0.0
```

**GPU Support (optional):**
```bash
# Für NVIDIA GPUs
pip install torch>=2.0.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

### 3. Google Perch (15,000+ Arten)

```bash
pip install tensorflow>=2.13.0 tensorflow-hub>=0.14.0
```

**Dann in `.env` aktivieren:**
```
ENABLE_PERCH_MODEL=true
```

## Troubleshooting

### ModuleNotFoundError: No module named 'transformers'

**Problem:** DimaBird kann nicht geladen werden
**Lösung:** 
```bash
pip install transformers torch
# ODER
USE_MODEL_STUBS=true  # in .env setzen
```

### ModuleNotFoundError: No module named 'birdnet'

**Problem:** BirdNET Official Package fehlt
**Lösung:**
```bash
pip install birdnet
# ODER ONNX Model herunterladen
python scripts/download_models.py birdnet
# ODER
USE_MODEL_STUBS=true  # in .env setzen
```

### BirdNET ONNX model not found

**Problem:** ONNX Model-Dateien fehlen
**Lösung:**
```bash
python scripts/download_models.py birdnet
# Oder official package verwenden:
pip install birdnet
```

## Speicherverbrauch

| Modell | RAM | GPU VRAM | Installation |
|--------|-----|----------|--------------|
| Stubs | ~50 MB | - | Immer verfügbar |
| BirdNET Official | ~500 MB | - | pip install birdnet |
| DimaBird | ~200 MB | ~1 GB | transformers + torch |
| Perch | ~1 GB | ~2 GB | tensorflow |

## Empfohlene Setups

### Entwicklung / CI/CD
```env
USE_MODEL_STUBS=true
```
✅ Keine zusätzlichen Dependencies
✅ Schneller Start
✅ Ideal für Tests

### Production (kleine Instanz)
```bash
pip install birdnet
```
```env
USE_MODEL_STUBS=false
ENABLE_PERCH_MODEL=false
```
✅ Echte Predictions
✅ Geringer Speicherbedarf
✅ 6,000+ Arten

### Production (große Instanz)
```bash
pip install -r requirements-ml-full.txt
```
```env
USE_MODEL_STUBS=false
ENABLE_PERCH_MODEL=true
```
✅ Alle Modelle
✅ 15,000+ Arten
✅ Konsensus-Voting
