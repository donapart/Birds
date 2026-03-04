"""Test bird recognition API with real bird recordings"""
import requests
import os
import sys
import json

API_URL = "http://localhost:8003"
AUDIO_DIR = "test_audio"

# Real bird recordings downloaded from SoundBible
test_files = [
    ("bird_song_forest.wav", "Bird Song (Forest)"),
    ("cardinal_bird.wav", "Northern Cardinal"),
    ("warbling_vireo.wav", "Warbling Vireo"),
    ("bird_in_rain.wav", "Bird in Rain"),
    ("horned_owl.wav", "Great Horned Owl"),
    ("hermit_thrush.wav", "Hermit Thrush"),
    ("meadowlark.wav", "Meadowlark"),
]

print("=" * 70)
print("BIRD RECOGNITION API TEST - Real Bird Audio")
print("=" * 70)

# Check API health
try:
    r = requests.get(f"{API_URL}/health", timeout=5)
    health = r.json()
    print(f"API Status: {health.get('status', 'unknown')}")
    print(f"Models: {health.get('models_loaded', 'unknown')}")
except Exception as e:
    print(f"API not reachable: {e}")
    sys.exit(1)

print()

results_summary = []

for filename, expected_bird in test_files:
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        print(f"SKIP: {filename} not found")
        continue
    
    size_kb = os.path.getsize(filepath) / 1024
    print(f"--- {expected_bird} ({filename}, {size_kb:.0f} KB) ---")
    
    try:
        with open(filepath, "rb") as f:
            files = {"file": (filename, f, "audio/wav")}
            r = requests.post(
                f"{API_URL}/api/v1/predict/upload",
                files=files,
                timeout=120
            )
        
        if r.status_code == 200:
            data = r.json()
            predictions = data.get("predictions", [])
            
            if predictions:
                best = predictions[0]
                confidence = best.get("confidence", 0)
                species = best.get("species", "?")
                scientific = best.get("scientific_name", "")
                model = best.get("model", "?")
                
                # Color coding
                if confidence >= 0.5:
                    status = "EXCELLENT"
                elif confidence >= 0.2:
                    status = "GOOD" 
                elif confidence >= 0.05:
                    status = "LOW"
                else:
                    status = "VERY LOW"
                
                print(f"  TOP: {species} ({scientific}) - {confidence*100:.1f}% [{model}] -> {status}")
                
                # Show top 3
                for i, p in enumerate(predictions[:5]):
                    conf = p.get("confidence", 0)
                    sp = p.get("species", "?")
                    sci = p.get("scientific_name", "")
                    mdl = p.get("model", "?")
                    print(f"    #{i+1}: {sp} ({sci}) - {conf*100:.1f}% [{mdl}]")
                
                results_summary.append({
                    "file": filename,
                    "expected": expected_bird,
                    "detected": species,
                    "confidence": confidence,
                    "status": status,
                    "model": model,
                    "total_predictions": len(predictions)
                })
            else:
                print(f"  NO PREDICTIONS returned!")
                results_summary.append({
                    "file": filename,
                    "expected": expected_bird,
                    "detected": "NONE",
                    "confidence": 0,
                    "status": "FAILED",
                    "model": "-",
                    "total_predictions": 0
                })
        else:
            error = r.text[:200]
            print(f"  ERROR {r.status_code}: {error}")
            results_summary.append({
                "file": filename,
                "expected": expected_bird,
                "detected": "ERROR",
                "confidence": 0,
                "status": f"HTTP {r.status_code}",
                "model": "-",
                "total_predictions": 0
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results_summary.append({
            "file": filename,
            "expected": expected_bird,
            "detected": "EXCEPTION",
            "confidence": 0,
            "status": str(e)[:50],
            "model": "-",
            "total_predictions": 0
        })
    
    print()

# Summary
print("=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"{'File':<25} {'Expected':<20} {'Detected':<25} {'Conf':>6} {'Status':<10}")
print("-" * 90)
for r in results_summary:
    print(f"{r['file']:<25} {r['expected']:<20} {r['detected']:<25} {r['confidence']*100:>5.1f}% {r['status']:<10}")

# Overall assessment
excellent = sum(1 for r in results_summary if r['status'] == 'EXCELLENT')
good = sum(1 for r in results_summary if r['status'] in ('EXCELLENT', 'GOOD'))
total = len(results_summary)
print(f"\nOverall: {excellent}/{total} excellent, {good}/{total} good+, {total} tested")
