"""
Test BirdSound API with real bird recordings from Xeno-canto.

Downloads known bird species recordings and tests all 3 models:
- DimaBird
- BirdNET
- Perch
"""
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests

# API Configuration
API_BASE = "http://localhost:8003"
DEVICE_ID = "test-device-real-birds"

# Test species with direct download URLs to bird recordings
TEST_BIRDS = [
    {
        "common_name": "Northern Cardinal",
        "scientific_name": "Cardinalis cardinalis",
        "audio_url": "https://www.xeno-canto.org/sounds/uploaded/OOECIWCSWV/XC134898-cardinal.mp3",
    },
    {
        "common_name": "American Robin",
        "scientific_name": "Turdus migratorius",
        "audio_url": "https://www.xeno-canto.org/sounds/uploaded/OTVUCMJDEZ/XC132592-American%20Robin.mp3",
    },
    {
        "common_name": "House Sparrow",
        "scientific_name": "Passer domesticus",
        "audio_url": "https://www.xeno-canto.org/sounds/uploaded/ZNCDXTUOFL/XC501498-House%20Sparrow.mp3",
    },
    {
        "common_name": "Song Sparrow",
        "scientific_name": "Melospiza melodia",
        "audio_url": "https://www.xeno-canto.org/sounds/uploaded/OOECIWCSWV/XC134905-song%20sparrow.mp3",
    },
]


def download_bird_recording(audio_url: str, species_name: str) -> Optional[bytes]:
    """
    Download a bird recording from a direct URL.
    
    Args:
        audio_url: Direct URL to audio file
        species_name: Species name for display
        
    Returns:
        Audio bytes or None if download failed
    """
    try:
        print(f"  📥 Lade Aufnahme herunter...")
        print(f"     {audio_url}")
        
        # Download audio file
        response = requests.get(audio_url, timeout=30, stream=True)
        response.raise_for_status()
        
        audio_bytes = response.content
        print(f"  ✓ Download erfolgreich: {len(audio_bytes) / 1024:.1f} KB")
        
        return audio_bytes
        
    except Exception as e:
        print(f"  ❌ Fehler beim Download: {e}")
        return None


def test_api_health() -> bool:
    """Test if API is healthy and models are loaded."""
    print("\n" + "="*70)
    print("🏥 API Health Check")
    print("="*70)
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        response.raise_for_status()
        
        health = response.json()
        print(f"Status: {health.get('status')}")
        print(f"Modelle geladen: {health.get('models_loaded')}")
        print(f"Verfügbare Modelle: {', '.join(health.get('models', []))}")
        
        if health.get("models_loaded", 0) >= 3:
            print("✅ Alle 3 Modelle sind online!")
            return True
        else:
            print("⚠️ Nicht alle Modelle sind geladen")
            return False
            
    except Exception as e:
        print(f"❌ API nicht erreichbar: {e}")
        return False


def predict_audio(audio_bytes: bytes, species_name: str) -> Dict:
    """
    Send audio to API for prediction.
    
    Args:
        audio_bytes: Audio file content
        species_name: Expected species name (for display)
        
    Returns:
        Prediction results
    """
    print(f"\n  🔮 Sende an BirdSound API...")
    
    try:
        # Prepare multipart upload
        files = {
            "audio": ("bird.mp3", audio_bytes, "audio/mpeg")
        }
        
        data = {
            "device_id": DEVICE_ID,
            "latitude": 52.52,  # Berlin
            "longitude": 13.405,
        }
        
        response = requests.post(
            f"{API_BASE}/api/v1/predict",
            files=files,
            data=data,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        return result
        
    except Exception as e:
        print(f"  ❌ API Fehler: {e}")
        return {}


def analyze_predictions(predictions: Dict, expected_species: str) -> None:
    """
    Analyze and display prediction results.
    
    Args:
        predictions: API response with predictions
        expected_species: Expected species scientific name
    """
    if not predictions:
        print("  ❌ Keine Vorhersagen erhalten")
        return
    
    print(f"\n  📊 Ergebnisse (Erwartet: {expected_species}):")
    print("  " + "-"*66)
    
    predictions_data = predictions.get("predictions", [])
    
    if not predictions_data:
        print("  ❌ Keine Vogelarten erkannt!")
        return
    
    # Group by model
    models = {}
    for pred in predictions_data:
        model_name = pred.get("model", "Unknown")
        if model_name not in models:
            models[model_name] = []
        models[model_name].append(pred)
    
    # Display results per model
    found_expected = False
    
    for model_name, preds in models.items():
        print(f"\n  🤖 {model_name}:")
        
        # Show top 3 predictions
        top_preds = sorted(preds, key=lambda x: x.get("confidence", 0), reverse=True)[:3]
        
        for i, pred in enumerate(top_preds, 1):
            species = pred.get("species_name", "Unknown")
            confidence = pred.get("confidence", 0) * 100
            scientific = pred.get("scientific_name", "")
            
            # Check if expected species is found
            is_expected = expected_species.lower() in scientific.lower()
            marker = "🎯" if is_expected else "  "
            
            if is_expected:
                found_expected = True
            
            print(f"    {marker} {i}. {species} ({scientific})")
            print(f"       Konfidenz: {confidence:.1f}%")
    
    if found_expected:
        print(f"\n  ✅ Erwartete Art wurde erkannt!")
    else:
        print(f"\n  ⚠️ Erwartete Art wurde NICHT unter Top-3 erkannt")


def test_bird(bird_info: Dict) -> bool:
    """
    Test one bird species.
    
    Args:
        bird_info: Bird information dict
        
    Returns:
        True if test successful
    """
    print("\n" + "="*70)
    print(f"🐦 {bird_info['common_name']}")
    print(f"   {bird_info['scientific_name']}")
    print("="*70)
    
    # Download recording
    audio_bytes = download_bird_recording(bird_info["audio_url"], bird_info["scientific_name"])
    
    if not audio_bytes:
        return False
    
    # Wait a bit to not overwhelm the API
    time.sleep(2)
    
    # Predict
    predictions = predict_audio(audio_bytes, bird_info["scientific_name"])
    
    # Analyze results
    analyze_predictions(predictions, bird_info["scientific_name"])
    
    return bool(predictions)


def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("🎵 BirdSound API Test mit echten Vogelgesang-Aufnahmen")
    print("="*70)
    
    # Check API health
    if not test_api_health():
        print("\n❌ API ist nicht bereit. Bitte starte die Container mit:")
        print("   docker-compose up -d")
        sys.exit(1)
    
    # Test each bird
    print(f"\n\n📋 Teste {len(TEST_BIRDS)} verschiedene Vogelarten...")
    
    results = []
    for bird_info in TEST_BIRDS:
        success = test_bird(bird_info)
        results.append((bird_info["common_name"], success))
        
        # Wait between tests
        time.sleep(3)
    
    # Summary
    print("\n\n" + "="*70)
    print("📈 Zusammenfassung")
    print("="*70)
    
    successful = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}")
    
    print(f"\nErfolgsquote: {successful}/{total} ({successful/total*100:.0f}%)")
    
    if successful == total:
        print("\n🎉 Alle Tests erfolgreich!")
    elif successful > 0:
        print(f"\n⚠️ {total - successful} Test(s) fehlgeschlagen")
    else:
        print("\n❌ Alle Tests fehlgeschlagen - bitte Logs prüfen!")
        sys.exit(1)


if __name__ == "__main__":
    main()
