"""Direct BirdNET test inside the container."""
import birdnet
import numpy as np
import soundfile as sf

# Generate chirp audio (3s, 48kHz)
sr = 48000
t = np.linspace(0, 3.0, sr*3, dtype=np.float32)
audio = np.zeros_like(t)
for f0,f1,ts,te in [(2500,4000,0,0.3),(4000,3000,0.35,0.6),(3500,5000,0.7,1.0),(5000,2000,1.0,1.5),(3000,4500,1.6,1.9),(4500,2800,2.0,2.5)]:
    m = (t>=ts)&(t<te)
    lt = (t[m]-ts)/(te-ts)
    freq = f0+(f1-f0)*lt
    env = np.sin(np.pi*lt)
    ph = 2*np.pi*np.cumsum(freq)/sr
    audio[m] += 0.5*env*np.sin(ph)
audio = audio / (np.max(np.abs(audio))+1e-6) * 0.8
sf.write('/tmp/bird_test.wav', audio, sr)

print("=== BirdNET v2.4 Direct Test ===")
model = birdnet.load()
print(f"Model type: {type(model).__name__}")

# Create prediction session
session = model.create_prediction_session()
print(f"Session type: {type(session).__name__}")

# Predict from file
results = session.predict_file('/tmp/bird_test.wav')
print(f"Results: {len(results)}")
for r in results:
    tp = type(r).__name__
    attrs = [a for a in dir(r) if not a.startswith("_")]
    print(f"  Type: {tp}")
    print(f"  Attrs: {attrs}")
    preds = r.predictions if hasattr(r, 'predictions') else []
    print(f"  Predictions count: {len(preds)}")
    for p in sorted(preds, key=lambda x: -x.confidence)[:10]:
        print(f"    {p.confidence:.3f} {p.label}")
    break

# === Now test with geo filter (Berlin) ===
print("\n=== BirdNET + Geo Filter (Berlin 52.52/13.40) ===")
geo_model = birdnet.load()
geo_session = geo_model.create_prediction_session()

# Check if we can set location
if hasattr(geo_session, 'set_location'):
    geo_session.set_location(52.52, 13.40)
    print("Location set!")

geo_results = geo_session.predict_file('/tmp/bird_test.wav')
for r in geo_results:
    preds = r.predictions if hasattr(r, 'predictions') else []
    for p in sorted(preds, key=lambda x: -x.confidence)[:10]:
        print(f"    {p.confidence:.3f} {p.label}")
    break

# === Now test via HTTP API ===
print("\n=== API /predict/upload Test ===")
import urllib.request
import io

with open('/tmp/bird_test.wav', 'rb') as f:
    file_data = f.read()

boundary = "----TestBoundary12345"
body = b""
body += f"--{boundary}\r\n".encode()
body += b'Content-Disposition: form-data; name="file"; filename="bird_test.wav"\r\n'
body += b"Content-Type: audio/wav\r\n\r\n"
body += file_data
body += b"\r\n"
body += f"--{boundary}\r\n".encode()
body += b'Content-Disposition: form-data; name="device_id"\r\n\r\ntest-direct\r\n'
body += f"--{boundary}\r\n".encode()
body += b'Content-Disposition: form-data; name="latitude"\r\n\r\n52.52\r\n'
body += f"--{boundary}\r\n".encode()
body += b'Content-Disposition: form-data; name="longitude"\r\n\r\n13.405\r\n'
body += f"--{boundary}--\r\n".encode()

import json
req = urllib.request.Request(
    "http://localhost:8000/api/v1/predict/upload",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        print(f"Processing time: {result.get('processing_time_ms', '?')}ms")
        for mp in result.get("model_predictions", []):
            print(f"\n  [{mp['model_name']}] ({mp.get('inference_time_ms', '?')}ms):")
            for p in mp.get("predictions", [])[:5]:
                print(f"    {p['confidence']:.3f} {p.get('species_common', p.get('species_scientific', '?'))}")
        c = result.get("consensus", {})
        if c and c.get("species_common"):
            print(f"\n  CONSENSUS: {c['species_common']} ({c.get('confidence',0):.1%})")
        else:
            print(f"\n  CONSENSUS: {c}")
except Exception as e:
    print(f"  API Error: {e}")
    import traceback; traceback.print_exc()
