import numpy as np
from tensorflow.lite.python.interpreter import Interpreter

# Load the TFLite model directly
model_path = '/root/.local/share/birdnet/acoustic-models/v2.4/tf/model-fp32.tflite'
interp = Interpreter(model_path=model_path)
interp.allocate_tensors()

# Get input/output details
in_details = interp.get_input_details()
out_details = interp.get_output_details()
print('Input:', in_details[0]['shape'], in_details[0]['dtype'])
print('Output count:', len(out_details))

# Generate synthetic bird audio
sr = 48000
t = np.linspace(0, 3.0, 144000, endpoint=False)
chirp = np.zeros_like(t)
for start in np.arange(0, 2.5, 0.3):
    mask = (t >= start) & (t < start + 0.15)
    freq = np.linspace(3000, 6000, mask.sum())
    chirp[mask] = 0.8 * np.sin(2*np.pi*freq*t[mask])
audio = chirp.astype(np.float32)

# Reshape for model: (1, 144000)
batch = audio.reshape(1, -1)

# Run inference
interp.resize_tensor_input(0, batch.shape, strict=True)
interp.allocate_tensors()
interp.set_tensor(0, batch)
interp.invoke()

# Get prediction output (index 546 for FP32)
logits = interp.get_tensor(546)
print('Logits shape:', logits.shape, 'min:', logits.min(), 'max:', logits.max())

# Apply sigmoid
probs = 1.0 / (1.0 + np.exp(-logits))
print('Probs shape:', probs.shape, 'max:', probs.max())

# Top 5
top_indices = np.argsort(probs[0])[::-1][:5]
# Load species list
from birdnet import model_loader
m = model_loader.load('acoustic', '2.4', 'tf')
species_list = list(m.species_list)
for idx in top_indices:
    sp = species_list[idx]
    p = probs[0][idx]
    print(f'  {sp}: {p:.4f}')
