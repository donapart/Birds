"""
Simple test to verify the BirdSound API is working.
Tests with a generated audio file since external sources are unreliable.
"""
import io
import json
import wave
import numpy as np
import requests

API_BASE = "http://localhost:8003"
DEVICE_ID = "test-device-simple"
API_KEY = "changeme-in-production"  # Default from .env


def generate_bird_like_audio(duration: float = 3.0, sample_rate: int = 48000) -> bytes:
    """Generate a WAV file with bird-like chirping sounds."""
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create a chirping pattern (frequency modulation)
    chirps = []
    for i in range(5):  # 5 chirps
        start = i * 0.6
        end = start + 0.2
        mask = (t >= start) & (t < end)
        
        # Frequency sweep from 2000 Hz to 4000 Hz
        freq = 2000 + 2000 * ((t - start) / 0.2)
        chirp = np.sin(2 * np.pi * freq * t) * mask
        chirps.append(chirp)
    
    # Combine chirps
    audio = sum(chirps)
    
    # Normalize and convert to int16
    audio = audio / np.max(np.abs(audio)) * 0.8
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Create WAV file in memory
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())
    
    wav_buffer.seek(0)
    return wav_buffer.read()


def test_health():
    """Test API health."""
    print("\n" + "="*70)
    print("🏥 API Health Check")
    print("="*70)
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        response.raise_for_status()
        
        health = response.json()
        print(f"✅ Status: {health.get('status')}")
        print(f"✅ Modelle geladen: {health.get('models_loaded')}")
        print(f"✅ Verfügbare Modelle: {', '.join(health.get('models', []))}")
        return True
        
    except Exception as e:
        print(f"❌ API Fehler: {e}")
        return False


def test_prediction():
    """Test prediction endpoint."""
    print("\n" + "="*70)
    print("🔮 API Prediction Test")
    print("="*70)
    
    try:
        # Generate test audio
        print("📝 Erzeuge Test-Audio (vogelähnliche Chirps)...")
        audio_bytes = generate_bird_like_audio()
        print(f"✅ Audio erzeugt: {len(audio_bytes)} bytes")
        
        # Send to API
        print("📤 Sende an API...")
        files = {"file": ("test_bird.wav", audio_bytes, "audio/wav")}
        data = {
            "device_id": DEVICE_ID,
            "latitude": 52.52,
            "longitude": 13.405,
        }
        headers = {
            "X-API-Key": API_KEY
        }
        
        response = requests.post(
            f"{API_BASE}/api/v1/predict/upload",
            files=files,
            data=data,
            headers=headers,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        
        # Display results
        print(f"\n✅ Vorhersage erfolgreich!")
        print(f"📊 Recording ID: {result.get('recording_id')}")
        print(f"📊 Anzahl Vorhersagen: {len(result.get('predictions', []))}")
        
        predictions = result.get('predictions', [])
        if predictions:
            print(f"\n🐦 Top-Vorhersagen:")
            
            # Group by model
            models = {}
            for pred in predictions:
                model = pred.get('model', 'Unknown')
                if model not in models:
                    models[model] = []
                models[model].append(pred)
            
            for model_name, preds in models.items():
                print(f"\n  🤖 {model_name}:")
                top_3 = sorted(preds, key=lambda x: x.get('confidence', 0), reverse=True)[:3]
                
                for i, pred in enumerate(top_3, 1):
                    species = pred.get('species_name', 'Unknown')
                    confidence = pred.get('confidence', 0) * 100
                    scientific = pred.get('scientific_name', '')
                    
                    print(f"    {i}. {species}")
                    print(f"       {scientific}")
                    print(f"       Konfidenz: {confidence:.1f}%")
        else:
            print("\n⚠️ Keine Vorhersagen erhalten (möglicherweise zu geringe Konfidenz)")
            print("    Dies ist bei synthetischem Audio normal.")
        
        return True
        
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP Fehler: {e}")
        if e.response is not None:
            print(f"📄 Status: {e.response.status_code}")
            print(f"📄 Response: {e.response.text}")
        return False
    except Exception as e:
        print(f"❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_models_endpoint():
    """Test models endpoint."""
    print("\n" + "="*70)
    print("🤖 Models Endpoint Test")
    print("="*70)
    
    try:
        response = requests.get(f"{API_BASE}/api/v1/models", timeout=5)
        response.raise_for_status()
        
        models = response.json()
        print(f"✅ Modelle verfügbar:")
        
        for model in models.get('models', []):
            name = model.get('name', 'Unknown')
            enabled = model.get('enabled', False)
            status = "✅" if enabled else "❌"
            print(f"  {status} {name}")
            
            if 'description' in model:
                print(f"      {model['description']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("🎵 BirdSound API - Einfacher Funktionstest")
    print("="*70)
    print("\nDieser Test überprüft, ob die API grundsätzlich funktioniert.")
    print("Er verwendet synthetische Audio-Daten, da externe Quellen nicht")
    print("verfügbar sind.\n")
    
    results = []
    
    # Test 1: Health
    results.append(("Health Check", test_health()))
    
    # Test 2: Models
    results.append(("Models Endpoint", test_models_endpoint()))
    
    # Test 3: Prediction
    results.append(("Prediction", test_prediction()))
    
    # Summary
    print("\n" + "="*70)
    print("📈 Zusammenfassung")
    print("="*70)
    
    for test_name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
    
    successful = sum(1 for _, s in results if s)
    total = len(results)
    
    print(f"\nErfolgsquote: {successful}/{total}")
    
    if successful == total:
        print("\n🎉 Alle Tests erfolgreich! Die API funktioniert.")
    else:
        print(f"\n⚠️ {total - successful} Test(s) fehlgeschlagen")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
