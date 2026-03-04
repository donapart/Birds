"""Download real bird audio for testing"""
import urllib.request
import os
import ssl

# Disable SSL verification for downloads
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

output_dir = "test_audio"
os.makedirs(output_dir, exist_ok=True)

# Try multiple sources for real bird recordings
sources = [
    # Wikimedia Commons - Common Blackbird (Turdus merula) 
    ("blackbird_wikimedia.ogg", 
     "https://upload.wikimedia.org/wikipedia/commons/a/a9/Common_Blackbird_%28Turdus_merula%29_song.ogg"),
    # Wikimedia - European Robin
    ("robin_wikimedia.ogg",
     "https://upload.wikimedia.org/wikipedia/commons/5/5a/European_Robin_%28Erithacus_rubecula%29_singing.ogg"),
    # Wikimedia - Great Tit
    ("great_tit_wikimedia.ogg",
     "https://upload.wikimedia.org/wikipedia/commons/7/7e/Parus_major_15mars2011.ogg"),
    # Wikimedia - Common Chaffinch
    ("chaffinch_wikimedia.ogg",
     "https://upload.wikimedia.org/wikipedia/commons/4/42/Fringilla_coelebs_-_song.ogg"),
    # Wikimedia - Song Thrush
    ("song_thrush_wikimedia.ogg",
     "https://upload.wikimedia.org/wikipedia/commons/b/b5/Song_Thrush_%28Turdus_philomelos%29.ogg"),
    # Wikimedia - Eurasian Wren
    ("wren_wikimedia.ogg",
     "https://upload.wikimedia.org/wikipedia/commons/4/4e/Troglodytes_troglodytes_-_song.ogg"),
]

downloaded = []
for filename, url in sources:
    filepath = os.path.join(output_dir, filename)
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BirdSound-Test/1.0"
        })
        resp = urllib.request.urlopen(req, timeout=30, context=ctx)
        data = resp.read()
        with open(filepath, "wb") as f:
            f.write(data)
        size_kb = len(data) / 1024
        print(f"  OK: {size_kb:.1f} KB")
        downloaded.append(filepath)
    except Exception as e:
        print(f"  FAILED: {e}")

print(f"\nDownloaded {len(downloaded)} files:")
for f in downloaded:
    print(f"  {f}")
