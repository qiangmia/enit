#!/usr/bin/env python3
"""
Build script: generate HeyGen Voice Turbo TTS MP3s for a week's read-along paragraphs.
Usage: python build_heygen_audio.py <HTML_FILE>
"""

import os
import sys
import re
import json
import time
from pathlib import Path
import urllib.request

# Parse command-line argument for HTML file
HTML_FILE = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if not HTML_FILE or not HTML_FILE.exists():
    print("Usage: python build_heygen_audio.py <HTML_FILE>")
    sys.exit(1)

# Get week directory (parent directory of HTML file)
WEEK_DIR = HTML_FILE.parent
AUDIO_DIR = WEEK_DIR / "audio"
MANIFEST_FILE = AUDIO_DIR / "manifest.json"

# Per-speaker voice mapping (all voices are from the provider docs).
VOICE_MAP = {
    "narrator": "nadine",
    "mason": "bram",
    "lin": "meredith",
    "chen": "tabitha",
}

API_URL = "https://openrouter.ai/api/v1/audio/speech"
MODEL = "heygen/heygen-voice-1-turbo"

# ------------------------------------------------------------------
# Read HTML and extract paragraphs
# ------------------------------------------------------------------
with open(HTML_FILE, "r", encoding="utf-8") as f:
    html_content = f.read()

# Extract all .readalong-para elements (basic approach: find <p class="readalong-para")
# Better approach: parse HTML, but for simplicity, find paragraphs by class
para_pattern = re.compile(r'<p class="readalong-para"[^>]*>.*?</p>', re.DOTALL)
paragraphs = para_pattern.findall(html_content)

# Extract speaker and text from each paragraph
paragraphs_data = []
for p in paragraphs:
    # Extract speaker
    speaker_match = re.search(r'data-speaker="([^"]+)"', p)
    speaker = speaker_match.group(1) if speaker_match else "narrator"
    
    # Extract voice (if present)
    voice_match = re.search(r'data-voice="([^"]+)"', p)
    voice = voice_match.group(1) if voice_match else VOICE_MAP.get(speaker, "nadine")
    
    # Extract text (strip HTML tags)
    text = re.sub(r'<[^>]+>', '', p).strip()
    
    paragraphs_data.append({
        "speaker": speaker,
        "voice": voice,
        "text": text,
        "html": p
    })

# ------------------------------------------------------------------
# Generate TTS for each paragraph
# ------------------------------------------------------------------
AUDIO_DIR.mkdir(exist_ok=True)
manifest = {
    "paragraphs": [],
    "generated_ok": False,
    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "notes": ["Real HeyGen Voice Turbo PCM audio generated from HTML paragraphs."]
}

for i, para in enumerate(paragraphs_data):
    speaker = para["speaker"]
    voice = para["voice"]
    text = para["text"]
    
    payload = {
        "input": text,
        "voice": voice,
        "response_format": "pcm",
        "model": MODEL
    }
    
    headers = {
        "Authorization": f"Bearer {os.environ.get('OPENROUTER_API_KEY')}",
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
            content_type = resp.headers.get("Content-Type", "")
            
            # Save as .pcm
            pcm_filename = f"para-{i+1:02d}.pcm"
            pcm_path = AUDIO_DIR / pcm_filename
            pcm_path.write_bytes(body)
            
            # Add to manifest
            manifest["paragraphs"].append({
                "n": i+1,
                "speaker": speaker,
                "voice": voice,
                "text": text,
                "audio_file": pcm_filename,
                "file_exists": True
            })
            
            print(f"Generated {pcm_filename} ({len(body)} bytes)")
            
    except Exception as e:
        print(f"Error generating para-{i+1:02d}: {e}")
        manifest["paragraphs"].append({
            "n": i+1,
            "speaker": speaker,
            "voice": voice,
            "text": text,
            "audio_file": f"para-{i+1:02d}.pcm",
            "file_exists": False
        })

# Save manifest
with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
    
print(f"Generated {len(paragraphs_data)} paragraphs for {HTML_FILE.name}. Manifest saved to {MANIFEST_FILE}")