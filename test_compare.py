import numpy as np
import time

# Generate synthetic bird audio
sr = 48000
t = np.linspace(0, 3.0, 144000, endpoint=False)
chirp = np.zeros_like(t)
for start in np.arange(0, 2.5, 0.3):
    mask = (t >= start) & (t < start + 0.15)
    freq = np.linspace(3000, 6000, mask.sum())
    chirp[mask] = 0.8 * np.sin(2*np.pi*freq*t[mask])
audio = chirp.astype(np.float32)

print("=== Test 1: Direct TFLite inference ===")
from tensorflow.lite.python.interpreter import Interpreter
model_path = '/root/.local/share/birdnet/acoustic-models/v2.4/tf/model-fp32.tflite'
interp = Interpreter(model_path=model_path)
interp.allocate_tensors()

batch = audio.reshape(1, -1)
interp.resize_tensor_input(0, batch.shape, strict=True)
interp.allocate_tensors()
interp.set_tensor(0, batch)
interp.invoke()

# Try ALL output details
out_details = interp.get_output_details()
print(f"Output tensors: {len(out_details)}")
for i, d in enumerate(out_details):
    shape = d['shape']
    idx = d['index']
    name = d['name']
    tensor = interp.get_tensor(idx)
    print(f"  [{i}] index={idx} name={name} shape={shape} range=[{tensor.min():.4f}, {tensor.max():.4f}]")

# Get tensor 546
t546 = interp.get_tensor(546)
print(f"\nTensor 546: shape={t546.shape} range=[{t546.min():.4f}, {t546.max():.4f}]")
probs546 = 1.0 / (1.0 + np.exp(-t546))
print(f"Sigmoid of 546: max={probs546.max():.6f}")

# Also check tensor 0 
t0 = interp.get_tensor(0)
print(f"Tensor 0: shape={t0.shape} range=[{t0.min():.4f}, {t0.max():.4f}]")

print("\n=== Test 2: BirdNET predict_arrays ===")
from birdnet import model_loader
m = model_loader.load('acoustic', '2.4', 'tf')
result = m.predict_arrays(
    (audio.copy(), sr),
    top_k=5,
    default_confidence_threshold=0.0,
    apply_sigmoid=True,
)
species_list = list(m.species_list)
species_ids = result.species_ids
species_probs = result.species_probs
print(f"species_ids shape: {species_ids.shape}")
print(f"species_probs shape: {species_probs.shape}")
for seg in range(species_ids.shape[1]):
    for k in range(species_ids.shape[2]):
        sp_idx = int(species_ids[0, seg, k])
        prob = float(species_probs[0, seg, k])
        if prob > 0.001:
            sp = species_list[sp_idx]
            print(f"  seg={seg} k={k}: {sp} ({prob:.4f})")
