# API Usage Guide | API-Nutzungsanleitung

[English](#english) | [Deutsch](#deutsch)

---

## English

### Quick Reference

**Base URL:** `http://localhost:8002/api/v1`

**Interactive Documentation:**

- Swagger UI: <http://localhost:8002/docs>
- ReDoc: <http://localhost:8002/redoc>

**Language Support:**

Add `?lang=en` or `?lang=de` to any endpoint, or set `Accept-Language` header.

### Authentication

Currently no authentication required (add if deploying publicly).

### Core Endpoints

#### 1. Health Check

Check if API is running and which models are loaded.

```http
GET /api/v1/health
```

**Response:**

```json
{
  "status": "healthy",
  "models_loaded": 1,
  "models": ["DimaBird"]
}
```

**cURL Example:**

```bash
curl http://localhost:8002/api/v1/health
```

---

#### 2. List Available Models

Get information about loaded ML models.

```http
GET /api/v1/models
```

**Response:**

```json
[
  {
    "name": "DimaBird",
    "version": "dima806/bird_sounds_classification",
    "type": "huggingface",
    "status": "loaded"
  }
]
```

**Python Example:**

```python
import requests

response = requests.get("http://localhost:8002/api/v1/models")
models = response.json()
print(f"Loaded models: {[m['name'] for m in models]}")
```

---

#### 3. Quick Prediction (No Database)

Fast prediction without storing to database. Best for testing or real-time apps.

```http
POST /api/v1/predict/quick
Content-Type: application/json
```

**Request Body:**

```json
{
  "device_id": "my-device-123",
  "timestamp_utc": "2025-11-29T12:00:00Z",
  "latitude": 52.52,
  "longitude": 13.405,
  "sample_rate": 48000,
  "audio_format": "pcm16_le",
  "audio_base64": "<base64-encoded-audio>"
}
```

**Response:**

```json
{
  "consensus": {
    "species_common": "European Robin",
    "species_scientific": "Erithacus rubecula",
    "confidence": 0.85,
    "method": "weighted_average"
  },
  "model_results": [
    {
      "model_name": "DimaBird",
      "model_version": "dima806/bird_sounds_classification",
      "predictions": [
        {
          "species_common": "European Robin",
          "species_scientific": "Erithacus rubecula",
          "confidence": 0.85,
          "rank": 1
        },
        {
          "species_common": "Common Nightingale",
          "species_scientific": "Luscinia megarhynchos",
          "confidence": 0.12,
          "rank": 2
        }
      ],
      "inference_time_ms": 234
    }
  ]
}
```

**Python Example:**

```python
import requests
import base64

# Load audio file
with open("bird_sound.wav", "rb") as f:
    audio_bytes = f.read()
    audio_b64 = base64.b64encode(audio_bytes).decode()

# Make prediction
response = requests.post(
    "http://localhost:8002/api/v1/predict/quick",
    json={
        "device_id": "python-client",
        "timestamp_utc": "2025-11-29T12:00:00Z",
        "latitude": 52.52,
        "longitude": 13.405,
        "sample_rate": 48000,
        "audio_format": "pcm16_le",
        "audio_base64": audio_b64
    }
)

result = response.json()
print(f"Detected: {result['consensus']['species_common']}")
print(f"Confidence: {result['consensus']['confidence']:.1%}")
```

---

#### 4. Full Prediction (With Database Storage)

Prediction with recording stored in database for later analysis.

```http
POST /api/v1/predict
Content-Type: application/json
```

**Request:** Same as Quick Prediction

**Response:**

```json
{
  "recording_id": "550e8400-e29b-41d4-a716-446655440000",
  "consensus": {
    "species_common": "European Robin",
    "species_scientific": "Erithacus rubecula",
    "confidence": 0.85,
    "method": "weighted_average"
  },
  "predictions": [ /* same as model_results */ ]
}
```

**JavaScript Example:**

```javascript
async function predictBirdSound(audioBlob) {
  // Convert audio to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  // Get current location
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });

  // Make prediction
  const response = await fetch('http://localhost:8002/api/v1/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: 'web-app',
      timestamp_utc: new Date().toISOString(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      sample_rate: 48000,
      audio_format: 'pcm16_le',
      audio_base64: base64
    })
  });

  const result = await response.json();
  return result;
}
```

---

#### 5. Search Species

Search bird species by name (English or German).

```http
GET /api/v1/species?search={query}&limit=10&lang=en
```

**Parameters:**

- `search` (required): Search term (e.g., "robin", "rotkehlchen")
- `limit` (optional): Max results (default: 20)
- `lang` (optional): Language for species names (en/de)

**Response:**

```json
[
  {
    "species_code": "erithacus_rubecula",
    "scientific_name": "Erithacus rubecula",
    "common_name_en": "European Robin",
    "common_name_de": "Rotkehlchen",
    "family": "Muscicapidae",
    "native_to_europe": true,
    "native_to_germany": true,
    "image_url": "https://..."
  }
]
```

**cURL Example:**

```bash
curl "http://localhost:8002/api/v1/species?search=robin&lang=en"
```

---

#### 6. List Recordings

Get stored recordings with optional filters.

```http
GET /api/v1/recordings?limit=50&offset=0&species=robin&min_confidence=0.5&start_date=2025-11-01
```

**Parameters:**

- `limit` (optional): Results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `species` (optional): Filter by species name
- `min_confidence` (optional): Minimum confidence threshold
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `device_id` (optional): Filter by device

**Response:**

```json
{
  "total": 150,
  "limit": 50,
  "offset": 0,
  "recordings": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp_utc": "2025-11-29T08:15:30Z",
      "latitude": 52.52,
      "longitude": 13.405,
      "consensus_species": "European Robin",
      "consensus_confidence": 0.85,
      "predictions_count": 1,
      "device_id": "my-device"
    }
  ]
}
```

---

#### 7. Get Single Recording

Get detailed information about a specific recording.

```http
GET /api/v1/recordings/{recording_id}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "device_id": "my-device",
  "timestamp_utc": "2025-11-29T08:15:30Z",
  "latitude": 52.52,
  "longitude": 13.405,
  "altitude_m": 35.0,
  "duration_sec": 3.0,
  "sample_rate": 48000,
  "audio_format": "pcm16_le",
  "consensus_species": "European Robin",
  "consensus_confidence": 0.85,
  "consensus_method": "weighted_average",
  "processing_time_ms": 250,
  "predictions": [
    {
      "model_name": "DimaBird",
      "species_common": "European Robin",
      "species_scientific": "Erithacus rubecula",
      "confidence": 0.85,
      "rank": 1,
      "inference_time_ms": 234
    }
  ]
}
```

---

#### 8. Export Data

Export recordings as CSV, JSON, or GeoJSON.

```http
GET /api/v1/export/csv?start_date=2025-11-01&end_date=2025-11-30&min_confidence=0.5
```

**Formats:**

- `/api/v1/export/csv` - CSV spreadsheet
- `/api/v1/export/json` - JSON data
- `/api/v1/export/geojson` - GeoJSON for mapping

**Parameters:** Same as List Recordings

**Response:** File download

**cURL Example:**

```bash
curl "http://localhost:8002/api/v1/export/csv?start_date=2025-11-01" -o recordings.csv
```

---

### Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

**Error Response Format:**

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Python Error Handling Example:**

```python
import requests

try:
    response = requests.post("http://localhost:8002/api/v1/predict/quick", json=data)
    response.raise_for_status()  # Raise exception for 4xx/5xx
    result = response.json()
except requests.exceptions.HTTPError as e:
    print(f"API error: {e.response.json()['detail']}")
except requests.exceptions.ConnectionError:
    print("Cannot connect to API server")
except requests.exceptions.Timeout:
    print("Request timed out")
```

---

### Rate Limiting

Currently no rate limiting (add if deploying publicly).

---

### WebSocket (Real-time Predictions)

For continuous audio streaming (advanced use case).

```javascript
const ws = new WebSocket('ws://localhost:8002/api/v1/ws/predict');

ws.onopen = () => {
  console.log('Connected to prediction stream');
};

ws.onmessage = (event) => {
  const result = JSON.parse(event.data);
  console.log('Detected:', result.consensus.species_common);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Send audio chunks
const audioChunk = /* ... base64 audio ... */;
ws.send(JSON.stringify({
  audio_base64: audioChunk,
  device_id: 'web-client',
  sample_rate: 48000
}));
```

---

## Deutsch

### Schnellreferenz

**Basis-URL:** `http://localhost:8002/api/v1`

**Interaktive Dokumentation:**

- Swagger UI: <http://localhost:8002/docs>
- ReDoc: <http://localhost:8002/redoc>

**Sprachunterstützung:**

Fügen Sie `?lang=en` oder `?lang=de` zu jedem Endpunkt hinzu oder setzen Sie den `Accept-Language` Header.

### Kern-Endpunkte

#### 1. Systemprüfung

Prüft ob API läuft und welche Modelle geladen sind.

```http
GET /api/v1/health
```

**Antwort:**

```json
{
  "status": "healthy",
  "models_loaded": 1,
  "models": ["DimaBird"]
}
```

#### 2. Schnellvorhersage

Schnelle Vorhersage ohne Datenbankspeicherung.

```http
POST /api/v1/predict/quick
```

**Python-Beispiel:**

```python
import requests
import base64

# Audio laden
with open("vogel.wav", "rb") as f:
    audio_b64 = base64.b64encode(f.read()).decode()

# Vorhersage machen
response = requests.post(
    "http://localhost:8002/api/v1/predict/quick",
    json={
        "device_id": "python-client",
        "timestamp_utc": "2025-11-29T12:00:00Z",
        "latitude": 52.52,
        "longitude": 13.405,
        "sample_rate": 48000,
        "audio_format": "pcm16_le",
        "audio_base64": audio_b64
    },
    params={"lang": "de"}  # Deutsche Artennamen
)

result = response.json()
print(f"Erkannt: {result['consensus']['species_common']}")
print(f"Konfidenz: {result['consensus']['confidence']:.1%}")
```

#### 3. Artensuche

```http
GET /api/v1/species?search=rotkehlchen&lang=de
```

**cURL-Beispiel:**

```bash
curl "http://localhost:8002/api/v1/species?search=rotkehlchen&lang=de"
```

#### 4. Aufzeichnungen exportieren

```bash
# Als CSV exportieren
curl "http://localhost:8002/api/v1/export/csv?start_date=2025-11-01" -o aufzeichnungen.csv

# Als JSON exportieren
curl "http://localhost:8002/api/v1/export/json?start_date=2025-11-01" -o aufzeichnungen.json
```

---

## Examples

### Complete Python Script

```python
#!/usr/bin/env python3
"""
Complete example: Record audio, predict species, store result
"""
import requests
import base64
from datetime import datetime
import sounddevice as sd
import soundfile as sf
import numpy as np

API_BASE = "http://localhost:8002/api/v1"
DEVICE_ID = "python-recorder"
SAMPLE_RATE = 48000
DURATION = 3  # seconds

def record_audio(duration=3, sample_rate=48000):
    """Record audio from microphone."""
    print(f"Recording {duration} seconds...")
    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype='int16'
    )
    sd.wait()
    return audio.flatten()

def predict_species(audio_data, latitude=None, longitude=None):
    """Send audio to API for prediction."""
    # Convert to base64
    audio_b64 = base64.b64encode(audio_data.tobytes()).decode()
    
    # Build request
    payload = {
        "device_id": DEVICE_ID,
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "latitude": latitude,
        "longitude": longitude,
        "sample_rate": SAMPLE_RATE,
        "audio_format": "pcm16_le",
        "audio_base64": audio_b64
    }
    
    # Send to API
    response = requests.post(
        f"{API_BASE}/predict",
        json=payload,
        params={"lang": "en"}
    )
    response.raise_for_status()
    return response.json()

def main():
    """Main recording loop."""
    print("Bird Sound Recorder")
    print("=" * 50)
    
    try:
        while True:
            input("Press ENTER to record (Ctrl+C to quit)...")
            
            # Record
            audio = record_audio(DURATION, SAMPLE_RATE)
            
            # Predict
            print("Analyzing...")
            result = predict_species(audio, latitude=52.52, longitude=13.405)
            
            # Display result
            consensus = result['consensus']
            print(f"\n✅ Detected: {consensus['species_common']}")
            print(f"   Scientific: {consensus['species_scientific']}")
            print(f"   Confidence: {consensus['confidence']:.1%}")
            print(f"   Recording ID: {result.get('recording_id', 'N/A')}")
            print()
            
    except KeyboardInterrupt:
        print("\nStopped.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
```

### Node.js/TypeScript Example

```typescript
import axios from 'axios';
import * as fs from 'fs';

const API_BASE = 'http://localhost:8002/api/v1';

interface PredictionRequest {
  device_id: string;
  timestamp_utc: string;
  latitude?: number;
  longitude?: number;
  sample_rate: number;
  audio_format: string;
  audio_base64: string;
}

async function predictBird(audioPath: string) {
  // Read and encode audio
  const audioBuffer = fs.readFileSync(audioPath);
  const audio_base64 = audioBuffer.toString('base64');

  // Build request
  const payload: PredictionRequest = {
    device_id: 'node-client',
    timestamp_utc: new Date().toISOString(),
    latitude: 52.52,
    longitude: 13.405,
    sample_rate: 48000,
    audio_format: 'pcm16_le',
    audio_base64
  };

  // Make prediction
  const response = await axios.post(
    `${API_BASE}/predict/quick`,
    payload,
    { params: { lang: 'en' } }
  );

  return response.data;
}

// Usage
predictBird('./bird_sound.wav')
  .then(result => {
    console.log('Detected:', result.consensus.species_common);
    console.log('Confidence:', (result.consensus.confidence * 100).toFixed(1) + '%');
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
```

---

## Support

- Interactive Docs: <http://localhost:8002/docs>
- GitHub Issues: <https://github.com/yourusername/Birds/issues>
- Full Documentation: See README.md
