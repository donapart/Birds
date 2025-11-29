"""
Test the Birds API with sample audio.

This script demonstrates how to use the API to:
1. Get available models
2. Make predictions with audio data
3. List recordings
4. Get species information
"""
import base64
import json
from pathlib import Path

import numpy as np
import requests

# API Configuration
API_BASE = "http://localhost:8002"
DEVICE_ID = "test-device-001"


def generate_test_audio(duration_sec: float = 3.0, sample_rate: int = 48000) -> bytes:
    """
    Generate synthetic audio for testing.
    
    Creates a simple sine wave at 1000 Hz.
    
    Args:
        duration_sec: Duration in seconds
        sample_rate: Sample rate in Hz
        
    Returns:
        PCM16 audio bytes
    """
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec))
    # 1 kHz sine wave
    audio = np.sin(2 * np.pi * 1000 * t)
    # Convert to int16
    audio_int16 = (audio * 32767).astype(np.int16)
    return audio_int16.tobytes()


def test_health():
    """Test health endpoint."""
    print("\n" + "="*60)
    print("Testing Health Endpoint")
    print("="*60)
    
    response = requests.get(f"{API_BASE.replace('/api/v1', '')}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_list_models():
    """Test listing available models."""
    print("\n" + "="*60)
    print("Listing Available Models")
    print("="*60)
    
    response = requests.get(f"{API_BASE}/api/v1/models")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        models = data.get('models', [])
        print(f"\nFound {len(models)} model(s):")
        for model in models:
            print(f"  - {model['name']} (version: {model.get('version', 'N/A')})")
    else:
        print(f"Error: {response.text}")


def test_quick_prediction():
    """Test quick prediction without database storage."""
    print("\n" + "="*60)
    print("Testing Quick Prediction (No DB Storage)")
    print("="*60)
    
    # Generate test audio
    audio_bytes = generate_test_audio(duration_sec=1.0)
    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    payload = {
        "device_id": DEVICE_ID,
        "timestamp_utc": "2025-11-29T12:00:00Z",
        "latitude": 52.52,  # Berlin
        "longitude": 13.405,
        "sample_rate": 48000,
        "audio_format": "pcm16_le",
        "audio_base64": audio_b64
    }
    
    print(f"Sending {len(audio_bytes)} bytes of audio (Base64: {len(audio_b64)} chars)...")
    
    response = requests.post(
        f"{API_BASE}/api/v1/predict/quick", json=payload, timeout=30
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nConsensus Prediction:")
        print(f"  Species: {result['consensus']['species_common']}")
        print(f"  Confidence: {result['consensus']['confidence']:.2%}")
        print(f"  Method: {result['consensus']['method']}")
        
        print(f"\nIndividual Model Predictions:")
        try:
            for pred in result.get('predictions', result.get('model_results', [])):
                print(f"\n  Model: {pred['model_name']}")
                print(f"    Top predictions:")
                for p in pred['predictions'][:3]:
                    print(f"      - {p['species_common']}: {p['confidence']:.2%}")
        except Exception as e:
            print(f"❌ Error parsing predictions: {str(e)}")
            print(f"Raw response structure: {list(result.keys())}")
    else:
        print(f"Error: {response.text}")


def test_full_prediction():
    """Test full prediction with database storage."""
    print("\n" + "="*60)
    print("Testing Full Prediction (With DB Storage)")
    print("="*60)
    
    # Generate test audio
    audio_bytes = generate_test_audio(duration_sec=1.0)
    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    payload = {
        "device_id": DEVICE_ID,
        "timestamp_utc": "2025-11-29T12:00:00Z",
        "latitude": 52.52,
        "longitude": 13.405,
        "sample_rate": 48000,
        "audio_format": "pcm16_le",
        "audio_base64": audio_b64
    }
    
    print(f"Sending {len(audio_bytes)} bytes of audio (Base64: {len(audio_b64)} chars)...")
    
    response = requests.post(
        f"{API_BASE}/api/v1/predict", json=payload, timeout=30
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nRecording ID: {result['recording_id']}")
        print(f"\nConsensus Prediction:")
        print(f"  Species: {result['consensus']['species_common']}")
        print(f"  Confidence: {result['consensus']['confidence']:.2%}")
    else:
        print(f"Error: {response.text}")


def test_list_recordings():
    """Test listing recordings."""
    print("\n" + "="*60)
    print("Listing Recent Recordings")
    print("="*60)
    
    params = {
        "limit": 5,
        "device_id": DEVICE_ID
    }
    
    response = requests.get(f"{API_BASE}/api/v1/recordings", params=params)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nTotal recordings: {data['total']}")
        print(f"Showing: {len(data['recordings'])} recording(s)")
        
        for rec in data['recordings']:
            print(f"\n  ID: {rec['id']}")
            print(f"  Device: {rec['device_id']}")
            print(f"  Time: {rec['timestamp_utc']}")
            print(f"  Location: ({rec['latitude']}, {rec['longitude']})")
    else:
        print(f"Error: {response.text}")


def test_species_search():
    """Test species search."""
    print("\n" + "="*60)
    print("Searching for Species")
    print("="*60)
    
    params = {"search": "robin"}  # Corrected parameter name
    
    response = requests.get(f"{API_BASE}/api/v1/species", params=params)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        total = data.get('total', 0)
        species_list = data.get('species', [])
        
        print(f"\nFound {total} species matching 'robin':")
        for s in species_list[:5]:
            print(f"  - {s.get('common_name_en', 'N/A')} ({s.get('scientific_name', 'N/A')})")
            print(f"    Code: {s.get('species_code', 'N/A')}")
    else:
        print(f"Error: {response.text}")


def main():
    """Run all tests."""
    print("\n" + "#"*60)
    print("# Birds API Test Suite")
    print("#"*60)
    print(f"\nAPI Base URL: {API_BASE}")
    
    try:
        # Run tests
        test_health()
        test_list_models()
        test_quick_prediction()
        test_species_search()
        
        # Database-dependent tests
        try:
            test_full_prediction()
            test_list_recordings()
        except Exception as e:
            print(f"\n⚠️  Database tests skipped: {e}")
        
        print("\n" + "#"*60)
        print("# All Tests Complete!")
        print("#"*60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to API")
        print(f"   Make sure the server is running at {API_BASE}")
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()
