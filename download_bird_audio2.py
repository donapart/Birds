"""Download real bird audio from SoundBible (Public Domain / Attribution)"""
import urllib.request
import os
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

output_dir = "test_audio"
os.makedirs(output_dir, exist_ok=True)

# SoundBible direct download URLs (grab.php?id=X&type=wav)
sources = [
    ("bird_song_forest.wav", "http://soundbible.com/grab.php?id=340&type=wav", "Bird Song (forest) - Jc Guan - Attribution 3.0"),
    ("cardinal_bird.wav", "http://soundbible.com/grab.php?id=1515&type=wav", "Best Cardinal Bird - PsychoBird - Attribution 3.0"),
    ("warbling_vireo.wav", "http://soundbible.com/grab.php?id=1846&type=wav", "Warbling Vireo - Mike Koenig - Attribution 3.0"),
    ("bird_in_rain.wav", "http://soundbible.com/grab.php?id=2006&type=wav", "Bird In Rain - Mike Koenig - Attribution 3.0"),
    ("horned_owl.wav", "http://soundbible.com/grab.php?id=1851&type=wav", "Horned Owl - Mike Koenig - Attribution 3.0"),
    ("hermit_thrush.wav", "http://soundbible.com/grab.php?id=923&type=wav", "Hermit Thrush - NPS - Attr-Noncom 3.0"),
    ("meadowlark.wav", "http://soundbible.com/grab.php?id=2180&type=wav", "Meadowlark - Attribution"),
]

downloaded = []
for filename, url, desc in sources:
    filepath = os.path.join(output_dir, filename)
    print(f"Downloading {filename} ({desc})...")
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        resp = urllib.request.urlopen(req, timeout=30, context=ctx)
        data = resp.read()
        with open(filepath, "wb") as f:
            f.write(data)
        size_kb = len(data) / 1024
        print(f"  OK: {size_kb:.1f} KB")
        downloaded.append((filepath, desc))
    except Exception as e:
        print(f"  FAILED: {e}")

print(f"\nDownloaded {len(downloaded)} / {len(sources)} bird recordings:")
for f, d in downloaded:
    print(f"  {f} - {d}")
