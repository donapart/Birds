"""
Direkter API-Test: Sendet synthetischen Vogelgesang an die BirdSound API
und prüft ob die Modelle Vogelarten erkennen.
"""
import numpy as np
import io
import base64
import json
import urllib.request
import time
import struct

API = "http://localhost:8003"

def generate_bird_chirp(duration=3.0, sr=48000):
    """Erzeuge realistischen Vogelgesang (Amsel-artig)."""
    t = np.linspace(0, duration, int(sr * duration), dtype=np.float32)
    audio = np.zeros_like(t)
    
    # Amsel-typische Muster: absteigende Melodien mit Trillern
    chirps = [
        (2200, 3800, 0.0, 0.25),
        (3800, 2800, 0.3, 0.55),
        (3200, 5500, 0.6, 0.85),
        (5500, 2000, 0.9, 1.4),
        (2800, 4200, 1.5, 1.75),
        (4200, 2500, 1.8, 2.3),
        (3000, 6000, 2.35, 2.55),
        (6000, 3500, 2.6, 2.9),
    ]
    
    for f0, f1, ts, te in chirps:
        mask = (t >= ts) & (t < te)
        if not mask.any():
            continue
        lt = (t[mask] - ts) / (te - ts)
        freq = f0 + (f1 - f0) * lt
        envelope = np.sin(np.pi * lt) ** 0.7
        phase = 2 * np.pi * np.cumsum(freq) / sr
        audio[mask] += envelope * np.sin(phase)
        # Harmonics
        audio[mask] += 0.3 * envelope * np.sin(2 * phase)
        audio[mask] += 0.1 * envelope * np.sin(3 * phase)
    
    # Normalize
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.85
    return audio, sr


def audio_to_wav_bytes(audio, sr):
    """Konvertiere numpy array zu WAV bytes."""
    # PCM 16-bit WAV
    pcm = (audio * 32767).astype(np.int16)
    buf = io.BytesIO()
    # WAV header
    num_samples = len(pcm)
    data_size = num_samples * 2  # 16-bit = 2 bytes
    buf.write(b'RIFF')
    buf.write(struct.pack('<I', 36 + data_size))
    buf.write(b'WAVE')
    buf.write(b'fmt ')
    buf.write(struct.pack('<I', 16))  # chunk size
    buf.write(struct.pack('<H', 1))   # PCM
    buf.write(struct.pack('<H', 1))   # mono
    buf.write(struct.pack('<I', sr))  # sample rate
    buf.write(struct.pack('<I', sr * 2))  # byte rate
    buf.write(struct.pack('<H', 2))   # block align
    buf.write(struct.pack('<H', 16))  # bits per sample
    buf.write(b'data')
    buf.write(struct.pack('<I', data_size))
    buf.write(pcm.tobytes())
    return buf.getvalue()


def test_upload(wav_bytes, label="synth"):
    """Teste /predict/upload."""
    boundary = "----BirdTest123"
    body = b""
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="file"; filename="{label}.wav"\r\n'.encode()
    body += b"Content-Type: audio/wav\r\n\r\n"
    body += wav_bytes
    body += b"\r\n"
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="device_id"\r\n\r\ntest-script\r\n'
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="latitude"\r\n\r\n52.52\r\n'
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="longitude"\r\n\r\n13.405\r\n'
    body += f"--{boundary}--\r\n".encode()
    
    req = urllib.request.Request(
        f"{API}/api/v1/predict/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            elapsed = time.time() - start
            return json.loads(resp.read()), elapsed
    except urllib.error.HTTPError as e:
        err = e.read().decode() if e.fp else str(e)
        return {"error": f"HTTP {e.code}: {err[:500]}"}, time.time() - start
    except Exception as e:
        return {"error": str(e)}, time.time() - start


def test_base64(wav_bytes, label="synth"):
    """Teste /predict/quick mit base64."""
    audio_b64 = base64.b64encode(wav_bytes).decode()
    
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
        f"{API}/api/v1/predict/quick",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            elapsed = time.time() - start
            return json.loads(resp.read()), elapsed
    except urllib.error.HTTPError as e:
        err = e.read().decode() if e.fp else str(e)
        return {"error": f"HTTP {e.code}: {err[:500]}"}, time.time() - start
    except Exception as e:
        return {"error": str(e)}, time.time() - start


def print_result(result, elapsed, label):
    """Zeige Ergebnis an."""
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    
    if "error" in result:
        print(f"  FEHLER: {result['error']}")
        return
    
    print(f"  Zeit: {elapsed:.1f}s (API: {result.get('processing_time_ms', '?')}ms)")
    
    for mp in result.get("model_predictions", []):
        model_name = mp.get("model_name", "?")
        preds = mp.get("predictions", [])
        print(f"\n  [{model_name}] ({mp.get('inference_time_ms', '?')}ms, {len(preds)} Ergebnisse):")
        if not preds:
            print(f"    -> KEINE VORHERSAGEN!")
        for p in preds[:5]:
            conf = p.get("confidence", 0)
            bar = "#" * int(conf * 30)
            sci = p.get("species_scientific", "?")
            com = p.get("species_common", "?")
            print(f"    {conf:6.1%} {bar:30s} {com} ({sci})")
    
    c = result.get("consensus", {})
    if c and c.get("species_common"):
        print(f"\n  >>> KONSENSUS: {c['species_common']} ({c.get('species_scientific', '')}) "
              f"= {c.get('confidence', 0):.1%} "
              f"[{c.get('agreement_count', '?')}/{c.get('total_models', '?')} Modelle einig]")
    else:
        print(f"\n  >>> KEIN KONSENSUS! ({c})")


if __name__ == "__main__":
    print("BirdSound API - Erkennungstest")
    print("=" * 60)
    
    # Health check
    try:
        with urllib.request.urlopen(f"{API}/health", timeout=5) as resp:
            health = json.loads(resp.read())
            print(f"API: {health['status']}, Modelle: {health.get('models', [])}")
    except Exception as e:
        print(f"API nicht erreichbar: {e}")
        exit(1)
    
    # Generate test audio
    print("\nErzeuge synthetischen Vogelgesang (Amsel-artige Chirps)...")
    audio, sr = generate_bird_chirp(duration=3.0, sr=48000)
    wav_bytes = audio_to_wav_bytes(audio, sr)
    print(f"  Audio: {len(audio)/sr:.1f}s @ {sr}Hz, WAV: {len(wav_bytes)} bytes")
    
    # Save locally for debugging
    with open("test_audio/synth_bird.wav", "wb") as f:
        f.write(wav_bytes)
    print("  Gespeichert: test_audio/synth_bird.wav")
    
    # Test 1: Upload endpoint
    print("\n\nTest 1: /predict/upload (Datei-Upload)")
    result, elapsed = test_upload(wav_bytes, "synth_bird")
    print_result(result, elapsed, "Synthetischer Vogelgesang via Upload")
    
    # Test 2: Base64 endpoint
    print("\n\nTest 2: /predict/quick (Base64)")
    result2, elapsed2 = test_base64(wav_bytes, "synth_bird")
    print_result(result2, elapsed2, "Synthetischer Vogelgesang via Base64")
    
    # Test 3: Generate different frequency patterns
    print("\n\nTest 3: Verschiedene Frequenzmuster")
    
    # Kohlmeise-artig: "tii-taa tii-taa" (wiederholend, 3-5kHz)
    t = np.linspace(0, 3.0, sr * 3, dtype=np.float32)
    meise = np.zeros_like(t)
    for i in range(6):
        ts = i * 0.45
        te = ts + 0.2
        mask = (t >= ts) & (t < te)
        if not mask.any():
            continue
        lt = (t[mask] - ts) / (te - ts)
        f = 4000 if i % 2 == 0 else 3000
        env = np.sin(np.pi * lt)
        meise[mask] += env * np.sin(2 * np.pi * f * (t[mask] - ts))
    meise = meise / (np.max(np.abs(meise)) + 1e-6) * 0.8
    wav3 = audio_to_wav_bytes(meise, sr)
    
    result3, elapsed3 = test_upload(wav3, "meise_pattern")
    print_result(result3, elapsed3, "Kohlmeise-artiges Muster (3-4kHz wiederholend)")
    
    # Test 4: Stille (Negativtest)
    print("\n\nTest 4: Stille (sollte 'keine Erkennung' ergeben)")
    silence = np.zeros(sr * 3, dtype=np.float32) + np.random.randn(sr * 3).astype(np.float32) * 0.001
    wav4 = audio_to_wav_bytes(silence, sr)
    result4, elapsed4 = test_upload(wav4, "silence")
    print_result(result4, elapsed4, "Stille / Rauschen")
    
    print("\n\n" + "=" * 60)
    print("  FAZIT")
    print("=" * 60)
    
    has_predictions = False
    for r in [result, result2, result3]:
        if isinstance(r, dict) and "model_predictions" in r:
            for mp in r.get("model_predictions", []):
                if mp.get("predictions"):
                    has_predictions = True
    
    if has_predictions:
        print("  Die Modelle liefern Ergebnisse - Erkennung funktioniert!")
    else:
        print("  PROBLEM: Keine Modelle liefern Ergebnisse!")
        print("  Mögliche Ursachen:")
        print("  1. USE_MODEL_STUBS=True -> nur Dummy-Modelle geladen")
        print("  2. min_confidence zu hoch -> Ergebnisse werden gefiltert")
        print("  3. Modell-Inference fehlerhaft")
        print("  4. Audio-Preprocessing erzeugt ungültige Daten")
