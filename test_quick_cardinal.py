import requests
r = requests.post('http://localhost:8003/api/v1/predict/upload', 
                  files={'file': open('test_audio/cardinal_bird.wav', 'rb')}, timeout=60)
d = r.json()
p = d['predictions'][0]
print(f"{p['species']} - {p['confidence']*100:.1f}% [{p['model']}]")
print(f"Total predictions: {len(d['predictions'])}")
print(f"Consensus: {d['consensus']['species']} ({d['consensus']['confidence']*100:.1f}%)")
