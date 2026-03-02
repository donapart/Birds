#!/usr/bin/env python3
"""
Test M4A format upload to verify v5.7 bug fix.
"""
import requests
import sys
import subprocess
import os
from pathlib import Path

API_URL = "http://localhost:8003"
API_KEY = "changeme-in-production"

def create_test_m4a():
    """Create a simple test M4A file using ffmpeg."""
    print("🎵 Creating test M4A file...")
    
    # First create a WAV file
    import numpy as np
    import wave
    
    duration = 3
    sample_rate = 48000
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create bird-like chirps
    audio = np.zeros_like(t)
    for i in range(5):
        start = i * duration / 5
        end = start + 0.3
        mask = (t >= start) & (t < end)
        freq = 2000 + i * 500
        audio[mask] = np.sin(2 * np.pi * freq * t[mask]) * np.exp(-5 * (t[mask] - start))
    
    audio = (audio * 32767).astype(np.int16)
    
    # Write WAV
    wav_path = Path("test_audio.wav")
    with wave.open(str(wav_path), 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())
    
    print(f"✅ Created WAV: {wav_path}")
    
    # Convert to M4A using ffmpeg
    m4a_path = Path("test_audio.m4a")
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav_path), "-c:a", "aac", "-b:a", "128k", str(m4a_path)],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and m4a_path.exists():
            print(f"✅ Converted to M4A: {m4a_path} ({m4a_path.stat().st_size} bytes)")
            wav_path.unlink()  # Remove WAV
            return m4a_path
        else:
            print(f"⚠️ ffmpeg conversion failed, using WAV instead")
            return wav_path
            
    except FileNotFoundError:
        print("⚠️ ffmpeg not found, using WAV instead")
        return wav_path
    except Exception as e:
        print(f"⚠️ Error converting to M4A: {e}, using WAV instead")
        return wav_path

def test_m4a_upload(file_path):
    """Test uploading M4A file to API."""
    print(f"\n📤 Testing upload of {file_path.suffix} file...")
    
    try:
        with open(file_path, 'rb') as f:
            audio_bytes = f.read()
        
        mime_type = "audio/mp4" if file_path.suffix == ".m4a" else "audio/wav"
        files = {"file": (file_path.name, audio_bytes, mime_type)}
        headers = {"X-API-Key": API_KEY}
        
        response = requests.post(
            f"{API_URL}/api/v1/predict/upload",
            files=files,
            headers=headers,
            data={
                "latitude": 52.52,
                "longitude": 13.405,
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"📊 Recording ID: {result.get('recording_id')}")
            print(f"📊 Processing Time: {result.get('processing_time_ms')}ms")
            print(f"🐦 Predictions: {len(result.get('predictions', []))}")
            
            if file_path.suffix == ".m4a":
                print("\n🎉 M4A format works! v5.7 bug fix confirmed!")
            
            return True
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            
            if "AttributeError" in response.text and file_path.suffix == ".m4a":
                print("\n⚠️ M4A AttributeError detected - this is the v5.6 bug!")
            
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup
        if file_path.exists():
            file_path.unlink()
            print(f"\n🧹 Cleaned up {file_path}")

def main():
    print("=" * 70)
    print("🎵 BirdSound M4A Format Test (v5.7 Bug Fix Validation)")
    print("=" * 70)
    
    # Create test file
    test_file = create_test_m4a()
    
    # Test upload
    success = test_m4a_upload(test_file)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
