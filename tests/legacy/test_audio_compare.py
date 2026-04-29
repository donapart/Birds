import numpy as np

# Audio version A: what the test_quick.py/web server uses (t[mask] directly)
sr = 48000
t = np.linspace(0, 3.0, int(sr*3.0), endpoint=False)
chirpA = np.zeros_like(t)
for start in np.arange(0, 2.5, 0.3):
    mask = (t >= start) & (t < start + 0.15)
    freq = np.linspace(3000, 6000, mask.sum())
    chirpA[mask] = 0.8 * np.sin(2*np.pi*freq*t[mask])
audioA = chirpA.astype(np.float32)

# Audio version B: the earlier test that gave 83% (local_t = t[mask] - start)
chirpB = np.zeros_like(t)
for start in np.arange(0, 2.5, 0.3):
    mask = (t >= start) & (t < start + 0.15)
    local_t = t[mask] - start
    freq = np.linspace(3000, 6000, mask.sum())
    chirpB[mask] = 0.8 * np.sin(2 * np.pi * freq * local_t)
audioB = chirpB.astype(np.float32)

print("Audio A (t[mask]):", audioA.shape, "first5:", audioA[:5].tolist())
print("Audio B (local_t):", audioB.shape, "first5:", audioB[:5].tolist())
print("Are they equal?", np.array_equal(audioA, audioB))
print("Max diff:", np.abs(audioA - audioB).max())

# Test both with predict_arrays
from birdnet import model_loader
m = model_loader.load('acoustic', '2.4', 'tf')
species_list = list(m.species_list)

for label, audio in [("A (t[mask])", audioA), ("B (local_t)", audioB)]:
    result = m.predict_arrays(
        (audio.copy(), sr),
        top_k=5,
        default_confidence_threshold=0.0,
        apply_sigmoid=True,
    )
    ids = result.species_ids
    probs = result.species_probs
    print(f"\n=== {label} ===")
    for seg in range(ids.shape[1]):
        for k in range(ids.shape[2]):
            sp_idx = int(ids[0, seg, k])
            prob = float(probs[0, seg, k])
            sp = species_list[sp_idx]
            print(f"  seg={seg} k={k}: {sp} ({prob:.4f})")
