# BirdSound - Real-time Bird Sound Recognition

A multi-model ML system for real-time bird sound recognition with mobile app support.

## Features

- **Multi-Model Analysis**: Run multiple ML models (BirdNET, HuggingFace) in parallel
- **Consensus Voting**: Combine predictions from all models for reliable identification
- **Real-time Processing**: Process 3-second audio windows with 1-second overlap
- **GPS Tagging**: Associate detections with location and time
- **Database Storage**: Store all recordings and predictions in PostgreSQL/PostGIS
- **REST API**: FastAPI backend with comprehensive endpoints
- **Mobile Ready**: Example implementations for Flutter and React Native

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│  Mobile App     │     │           Backend (FastAPI)          │
│  (Flutter/RN)   │────▶│                                     │
│                 │     │  ┌─────────┐  ┌─────────────────┐   │
│  - Audio Capture│     │  │ BirdNET │  │ HuggingFace     │   │
│  - GPS Location │     │  │ (ONNX)  │  │ (Transformers)  │   │
│  - Display      │     │  └────┬────┘  └────────┬────────┘   │
└─────────────────┘     │       │                │            │
                        │       └───────┬────────┘            │
                        │               ▼                     │
                        │       ┌───────────────┐             │
                        │       │   Consensus   │             │
                        │       │    Engine     │             │
                        │       └───────┬───────┘             │
                        │               │                     │
                        │               ▼                     │
                        │       ┌───────────────┐             │
                        │       │  PostgreSQL   │             │
                        │       │   (PostGIS)   │             │
                        │       └───────────────┘             │
                        └─────────────────────────────────────┘
```

## Quick Start

### 1. Clone and Setup

```bash
cd Birds

# Copy environment file
cp backend/.env.example backend/.env

# Create models directory
mkdir -p models/birdnet
```

### 2. Download Models

Download BirdNET ONNX model from [HuggingFace](https://huggingface.co/kahst/BirdNET-onnx):

```bash
# Download model
wget -O models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx \
  https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx

# Download labels
wget -O models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt \
  https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt
```

### 3. Start with Docker

```bash
docker-compose up -d
```

### 4. Access the API

- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
- Database UI (dev): http://localhost:8080 (login: postgres/postgres)

## API Endpoints

### Prediction

```bash
# Single prediction
POST /api/v1/predict
{
  "device_id": "my-phone",
  "timestamp_utc": "2025-11-29T12:00:00Z",
  "latitude": 52.52,
  "longitude": 13.405,
  "sample_rate": 16000,
  "audio_format": "pcm16_le",
  "audio_base64": "<base64-encoded-audio>"
}

# Quick prediction (no database storage)
POST /api/v1/predict/quick

# Batch prediction
POST /api/v1/predict/batch
```

### Recordings

```bash
# List recordings
GET /api/v1/recordings?species=Blackbird&min_confidence=0.5

# Get single recording
GET /api/v1/recordings/{recording_id}

# Map data points
GET /api/v1/recordings/map/points

# Timeline
GET /api/v1/recordings/timeline?hours=24

# Statistics
GET /api/v1/recordings/stats?days=7

# Model comparison
GET /api/v1/recordings/compare?disagreements_only=true
```

### Models

```bash
# List available models
GET /api/v1/models

# Get model info
GET /api/v1/models/{model_name}
```

## Development

### Local Development (without Docker)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (or use existing)
# Set DATABASE_URL in .env

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Running Tests

```bash
cd backend
pytest tests/
```

## Mobile App Development

### Flutter

See `mobile/flutter/lib/services/audio_service.dart` for a complete example.

```dart
final service = BirdSoundService(
  apiBaseUrl: 'http://your-server:8000',
  deviceId: 'flutter-device-123',
);

await service.initialize();
await service.startListening();

service.predictions.listen((prediction) {
  print('Detected: ${prediction.consensus.species}');
});
```

### React Native

See `mobile/react-native/src/services/BirdSoundService.ts` for a complete example.

```typescript
const service = new BirdSoundService(
  'http://your-server:8000',
  'rn-device-123'
);

await service.initialize();
service.setOnPrediction((prediction) => {
  console.log('Detected:', prediction.consensus.speciesCommon);
});
await service.startListening();
```

## Models

### BirdNET

- **Source**: Cornell Lab of Ornithology & Chemnitz University
- **Species**: ~6,000 species worldwide
- **Sample Rate**: 48 kHz
- **Window Size**: 3 seconds
- [GitHub](https://github.com/kahst/BirdNET-Analyzer) | [Paper](https://doi.org/10.1016/j.ecoinf.2021.101236)

### HuggingFace Models

Default: `dima806/bird_sounds_classification`

Other options:
- `greenarcade/wav2vec2-vd-bird-sound-classification`
- Custom fine-tuned models

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection |
| `BIRDNET_MODEL_PATH` | `models/birdnet/...` | Path to BirdNET ONNX |
| `HF_MODEL_NAME` | `dima806/bird_sounds...` | HuggingFace model ID |
| `MIN_CONFIDENCE_THRESHOLD` | `0.1` | Minimum confidence |
| `TOP_N_PREDICTIONS` | `5` | Top N predictions per model |

## Project Structure

```
Birds/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # API endpoints
│   │   ├── core/                # Configuration
│   │   ├── db/                  # Database models
│   │   ├── models/              # ML model wrappers
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/            # Business logic
│   ├── requirements.txt
│   └── Dockerfile
├── mobile/
│   ├── flutter/                 # Flutter example
│   └── react-native/            # React Native example
├── models/                      # ML model files (not in git)
└── docker-compose.yml
```

## License

MIT

## Acknowledgments

- [BirdNET](https://birdnet.cornell.edu/) by Cornell Lab of Ornithology
- [HuggingFace](https://huggingface.co/) for model hosting
- [FastAPI](https://fastapi.tiangolo.com/) for the amazing framework
