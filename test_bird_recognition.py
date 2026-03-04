"""
Bird Sound Test Script
Downloads bird audio samples and tests the BirdSound API prediction pipeline.
"""
import urllib.request
import json
import base64
import os
import io
import sys
import time

TEST_DIR = os.path.join(os.path.dirname(__file__), "test_audio")
os.makedirs(TEST_DIR, exist_ok=True)

API_BASE = "http://localhost:8003/api/v1"

# Free bird sound sources (Wikimedia Commons / Internet Archive)
BIRD_SOURCES = {
    "amsel_turdus_merula": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Turdus_merula_2.ogg",
        "species": "Turdus merula",
        "common": "Amsel / Eurasian Blackbird",
        "format": "ogg"
    },
    "kohlmeise_parus_major": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/Parus_major_15.ogg", 
        "species": "Parus major",
        "common": "Kohlmeise / Great Tit",
        "format": "ogg"
    },
    "buchfink_fringilla_coelebs": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/32/Fringilla_coelebs_-_Chaffinch_-_Buchfink.ogg",
        "species": "Fringilla coelebs", 
        "common": "Buchfink / Common Chaffinch",
        "format": "ogg"
    },
    "nachtigall_luscinia_megarhynchos": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/b/b2/Luscinia_megarhynchos_-_Nightingale_XC768302.ogg",
        "species": "Luscinia megarhynchos",
        "common": "Nachtigall / Common Nightingale",
        "format": "ogg"
    },
    "star_sturnus_vulgaris": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Sturnus_vulgaris.ogg",
        "species": "Sturnus vulgaris",
        "common": "Star / Common Starling",
        "format": "ogg"
    }
}


def download_audio(name: str, info: dict) -> str | None:
    """Download a bird audio file."""
    ext = info["format"]
    filepath = os.path.join(TEST_DIR, f"{name}.{ext}")
    
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        print(f"  [CACHED] {name}: {os.path.getsize(filepath)} bytes")
        return filepath
    
    print(f"  Downloading {info['common']}...")
    req = urllib.request.Request(info["url"], headers={"User-Agent": "Mozilla/5.0 BirdSoundTest/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            with open(filepath, "wb") as f:
                f.write(data)
            print(f"  [OK] {len(data)} bytes -> {filepath}")
            return filepath
    except Exception as e:
        print(f"  [FEHLER] {e}")
        return None


def convert_to_wav(filepath: str) -> str:
    """Convert OGG to WAV using pydub or soundfile."""
    wav_path = filepath.rsplit(".", 1)[0] + ".wav"
    if os.path.exists(wav_path) and os.path.getsize(wav_path) > 1000:
        return wav_path
    
    try:
        import soundfile as sf
        import numpy as np
        data, sr = sf.read(filepath)
        if len(data.shape) > 1:
            data = data.mean(axis=1)
        sf.write(wav_path, data, sr)
        print(f"  [CONVERTED] {os.path.basename(wav_path)} ({sr}Hz)")
        return wav_path
    except Exception:
        pass
    
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(filepath)
        audio = audio.set_channels(1)
        audio.export(wav_path, format="wav")
        print(f"  [CONVERTED via pydub] {os.path.basename(wav_path)}")
        return wav_path
    except Exception as e:
        print(f"  [CONVERT FEHLER] {e}")
        return filepath


def test_api_health():
    """Test if API is reachable."""
    print("\n=== API Health Check ===")
    try:
        req = urllib.request.Request(f"{API_BASE.rsplit('/api/v1', 1)[0]}/health")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            print(f"  Status: {data.get('status', 'unknown')}")
            return True
    except Exception as e:
        print(f"  [FEHLER] API nicht erreichbar: {e}")
        return False


def test_models():
    """Check loaded models."""
    print("\n=== Geladene Modelle ===")
    try:
        req = urllib.request.Request(f"{API_BASE}/models")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            for m in data.get("models", []):
                status = "✓" if m["is_loaded"] else "✗"
                print(f"  {status} {m['name']} v{m['version']} (top_n={m['top_n']}, min_conf={m['min_confidence']})")
            return data
    except Exception as e:
        print(f"  [FEHLER] {e}")
        return None


def test_predict_upload(wav_path: str, bird_info: dict) -> dict | None:
    """Test /predict/upload endpoint with a WAV file."""
    import mimetypes
    
    print(f"\n--- Teste: {bird_info['common']} ({bird_info['species']}) ---")
    print(f"  Datei: {os.path.basename(wav_path)} ({os.path.getsize(wav_path)} bytes)")
    
    # Multipart form data
    boundary = "----BirdSoundTestBoundary"
    
    with open(wav_path, "rb") as f:
        file_data = f.read()
    
    filename = os.path.basename(wav_path)
    
    body = b""
    # File field
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode()
    body += b"Content-Type: audio/wav\r\n\r\n"
    body += file_data
    body += b"\r\n"
    
    # device_id field
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="device_id"\r\n\r\n'
    body += b"test-script\r\n"
    
    # latitude (Berlin)
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="latitude"\r\n\r\n'
    body += b"52.52\r\n"
    
    # longitude (Berlin)
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="longitude"\r\n\r\n'
    body += b"13.405\r\n"
    
    body += f"--{boundary}--\r\n".encode()
    
    req = urllib.request.Request(
        f"{API_BASE}/predict/upload",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "BirdSoundTest/1.0"
        },
        method="POST"
    )
    
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            elapsed = time.time() - start
            result = json.loads(resp.read())
            
            print(f"  Verarbeitungszeit: {elapsed:.1f}s (API: {result.get('processing_time_ms', '?')}ms)")
            
            # Model predictions
            for mp in result.get("model_predictions", []):
                model_name = mp.get("model_name", "?")
                preds = mp.get("predictions", [])
                print(f"\n  [{model_name}] ({mp.get('inference_time_ms', '?')}ms):")
                if not preds:
                    print(f"    (keine Ergebnisse)")
                for p in preds[:5]:
                    conf = p.get("confidence", 0)
                    bar = "█" * int(conf * 20) + "░" * (20 - int(conf * 20))
                    print(f"    {bar} {conf:.1%} {p.get('species_common', p.get('species_scientific', '?'))}")
                    if p.get("species_scientific"):
                        print(f"         ({p['species_scientific']})")
            
            # Consensus
            consensus = result.get("consensus", {})
            if consensus and consensus.get("species_common"):
                print(f"\n  >>> KONSENSUS: {consensus['species_common']} "
                      f"({consensus.get('species_scientific', '?')}) "
                      f"Konfidenz: {consensus.get('confidence', 0):.1%} "
                      f"Einigkeit: {consensus.get('agreement_count', '?')}/{consensus.get('total_models', '?')}")
            
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"  [HTTP {e.code}] {error_body[:500]}")
        return None
    except Exception as e:
        print(f"  [FEHLER] {e}")
        return None


def test_predict_base64(wav_path: str, bird_info: dict) -> dict | None:
    """Test /predict/quick endpoint with base64 audio."""
    print(f"\n--- Teste (base64): {bird_info['common']} ---")
    
    with open(wav_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode()
    
    payload = {
        "device_id": "test-script",
        "timestamp_utc": "2026-03-03T10:00:00Z",
        "latitude": 52.52,
        "longitude": 13.405,
        "sample_rate": 48000,
        "audio_format": "wav",
        "audio_base64": audio_b64
    }
    
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API_BASE}/predict/quick",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            elapsed = time.time() - start
            result = json.loads(resp.read())
            
            print(f"  Verarbeitungszeit: {elapsed:.1f}s")
            
            for mp in result.get("model_predictions", []):
                model_name = mp.get("model_name", "?")
                preds = mp.get("predictions", [])
                print(f"  [{model_name}]: ", end="")
                if preds:
                    top = preds[0]
                    print(f"{top.get('species_common', '?')} ({top.get('confidence', 0):.1%})")
                else:
                    print("keine Ergebnisse")
            
            consensus = result.get("consensus", {})
            if consensus and consensus.get("species_common"):
                print(f"  >>> KONSENSUS: {consensus['species_common']} ({consensus.get('confidence', 0):.1%})")
            
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"  [HTTP {e.code}] {error_body[:500]}")
        return None
    except Exception as e:
        print(f"  [FEHLER] {e}")
        return None


def main():
    print("=" * 60)
    print("  BirdSound Erkennungs-Test")
    print("=" * 60)
    
    # 1. Health check
    if not test_api_health():
        print("\n[ABBRUCH] API nicht erreichbar!")
        sys.exit(1)
    
    # 2. Check models
    test_models()
    
    # 3. Download bird audio files
    print("\n=== Audio-Dateien herunterladen ===")
    wav_files = {}
    for name, info in BIRD_SOURCES.items():
        filepath = download_audio(name, info)
        if filepath:
            wav_path = convert_to_wav(filepath)
            wav_files[name] = (wav_path, info)
    
    if not wav_files:
        print("\n[ABBRUCH] Keine Audio-Dateien verfügbar!")
        sys.exit(1)
    
    print(f"\n{len(wav_files)} Audio-Dateien bereit.")
    
    # 4. Test each file via /predict/upload
    print("\n" + "=" * 60)
    print("  TEST: /predict/upload (Datei-Upload)")
    print("=" * 60)
    
    results = {}
    for name, (wav_path, info) in wav_files.items():
        result = test_predict_upload(wav_path, info)
        results[name] = result
    
    # 5. Summary
    print("\n" + "=" * 60)
    print("  ZUSAMMENFASSUNG")
    print("=" * 60)
    
    correct = 0
    total = 0
    for name, result in results.items():
        total += 1
        info = BIRD_SOURCES[name]
        expected_species = info["species"].lower()
        
        if result is None:
            print(f"  ✗ {info['common']}: API-Fehler")
            continue
        
        consensus = result.get("consensus", {})
        detected = consensus.get("species_scientific", "").lower() if consensus else ""
        detected_common = consensus.get("species_common", "nichts") if consensus else "nichts"
        confidence = consensus.get("confidence", 0) if consensus else 0
        
        # Check if any model detected the right species
        any_correct = False
        for mp in result.get("model_predictions", []):
            for p in mp.get("predictions", []):
                if expected_species in p.get("species_scientific", "").lower():
                    any_correct = True
                    break
        
        if expected_species in detected:
            print(f"  ✓ {info['common']}: KORREKT erkannt ({confidence:.0%})")
            correct += 1
        elif any_correct:
            print(f"  ~ {info['common']}: Von mind. einem Modell erkannt (Konsensus: {detected_common})")
            correct += 0.5
        else:
            print(f"  ✗ {info['common']}: NICHT erkannt (stattdessen: {detected_common} {confidence:.0%})")
    
    print(f"\n  Ergebnis: {correct}/{total} korrekt erkannt")
    
    if correct == 0:
        print("\n  ⚠ WARNUNG: Keine einzige Art wurde erkannt!")
        print("  Mögliche Ursachen:")
        print("  - Modelle sind Stubs (USE_MODEL_STUBS=True)")
        print("  - Audio-Preprocessing-Fehler")
        print("  - Modell-Inference schlägt fehl")
        print("  - Confidence-Threshold zu hoch")


if __name__ == "__main__":
    main()
