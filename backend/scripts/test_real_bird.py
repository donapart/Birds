#!/usr/bin/env python3
"""
Test the API with a real bird recording from public domain.
"""
import requests
import sys
from io import BytesIO

API_URL = "http://localhost:8003"
API_KEY = "changeme-in-production"

def test_with_sample_bird():
    """Test with a sample bird recording."""
    print("=" * 70)
    print("🐦 Testing BirdSound API with Real Bird Recording")
    print("=" * 70)
    
    # Use a small public domain bird recording URL
    # This is a Common Blackbird from Xeno-canto (CC BY-NC-SA)
    sample_url = "https://xeno-canto.org/sounds/uploaded/SDPLJKCKZX/XC639835-kos_poland_2020.mp3"
    
    print("\n📥 Downloading sample bird recording...")
    try:
        response = requests.get(sample_url, timeout=30)
        response.raise_for_status()
        audio_bytes = response.content
        print(f"✅ Downloaded {len(audio_bytes)} bytes")
    except Exception as e:
        print(f"❌ Failed to download sample: {e}")
        print("⚠️ Using synthetic audio instead...")
        # Fallback to synthetic audio
        import numpy as np
        import wave
        import io
        
        duration = 3
        sample_rate = 48000
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Create bird-like chirps
        audio = np.zeros_like(t)
        chirp_count = 5
        for i in range(chirp_count):
            start = i * duration / chirp_count
            end = start + 0.3
            mask = (t >= start) & (t < end)
            freq = 2000 + i * 500
            audio[mask] = np.sin(2 * np.pi * freq * t[mask]) * np.exp(-5 * (t[mask] - start))
        
        audio = (audio * 32767).astype(np.int16)
        
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio.tobytes())
        
        audio_bytes = wav_buffer.getvalue()
        print(f"✅ Generated {len(audio_bytes)} bytes synthetic audio")
    
    # Test prediction
    print("\n🔮 Sending to API for prediction...")
    try:
        files = {"file": ("bird.mp3", BytesIO(audio_bytes), "audio/mpeg")}
        headers = {"X-API-Key": API_KEY}
        
        response = requests.post(
            f"{API_URL}/api/v1/predict/upload",
            files=files,
            headers=headers,
            data={
                "latitude": 52.52,
                "longitude": 13.405,
            },
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        print("✅ Prediction successful!")
        print(f"\n📊 Recording ID: {result.get('recording_id')}")
        print(f"📊 Processing Time: {result.get('processing_time_ms')}ms")
        
        predictions = result.get('predictions', [])
        print(f"\n🐦 Found {len(predictions)} predictions:")
        
        if predictions:
            # Group by species
            species_preds = {}
            for pred in predictions[:15]:  # Show top 15
                species = pred['species']
                if species not in species_preds:
                    species_preds[species] = []
                species_preds[species].append(pred)
            
            print("\nTop Species Predictions:")
            for species, preds in list(species_preds.items())[:5]:
                avg_conf = sum(p['confidence'] for p in preds) / len(preds)
                models = [p['model'] for p in preds]
                print(f"  🐦 {species}")
                print(f"     Confidence: {avg_conf:.1%}")
                print(f"     Models: {', '.join(models)}")
        else:
            print("  ⚠️ No predictions found (confidence too low)")
        
        # Show consensus
        consensus = result.get('consensus', {})
        if consensus.get('species'):
            print(f"\n🎯 Consensus: {consensus['species']}")
            print(f"   Confidence: {consensus['confidence']:.1%}")
            print(f"   Models agree: {consensus['models_agree']}")
        
        return True
        
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP Error: {e}")
        print(f"📄 Status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_with_sample_bird()
    sys.exit(0 if success else 1)
