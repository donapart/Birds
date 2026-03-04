import numpy as np, soundfile as sf, base64, requests, io, json

sr = 48000
t = np.linspace(0, 3.0, int(sr*3.0), endpoint=False)
chirp = np.zeros_like(t)
for start in np.arange(0, 2.5, 0.3):
    mask = (t >= start) & (t < start + 0.15)
    freq = np.linspace(3000, 6000, mask.sum())
    chirp[mask] = 0.8 * np.sin(2*np.pi*freq*t[mask])
chirp = chirp.astype(np.float32)

buf = io.BytesIO()
sf.write(buf, chirp, sr, format='WAV')
buf.seek(0)
files = {'file': ('bird.wav', buf, 'audio/wav')}
r = requests.post('http://localhost:8003/predict/upload', files=files, timeout=120)
print(f'Status: {r.status_code}')
data = r.json()
preds = data.get('predictions', [])
print(f'Predictions: {len(preds)}')
for p in preds[:15]:
    model = p.get("model", "?")
    species = p.get("species", "?")
    conf = p.get("confidence", 0) * 100
    print(f'  {model:<12} {species:<30} {conf:.1f}%')
