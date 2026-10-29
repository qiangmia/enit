#!/usr/bin/env python3
"""
Generate placeholder silent MP3 files for Wk9 audio paragraphs.
These are minimal valid MP3 frames (~3 KB per paragraph) so the
manifest-driven playback works. Real TTS audio replaces these
when OPENROUTER_API_KEY is available (see build_heygen_audio.py).
"""
import os
from pathlib import Path

WEEK_DIR = Path(__file__).parent.resolve()
AUDIO_DIR = WEEK_DIR / "audio"

# Minimal MPEG-1 Layer III silent MP3 frame structure.
# Frame sync (11 ones) + MPEG-1 Layer III header = 0xFFFB.
# Bitrate 128 kbps, 44100 Hz stereo = 0001 0101 in binary.
# Padding and silence frames make it playable (~2.5 sec silent audio).

# This is a minimal valid silent MP3 (~3 KB) — enough for browser playback.
# The frame header is correct; remaining bytes are padding/zeros.
MP3_SILENCE_BYTES = bytes([
    0xFF, 0xFB,  # MPEG-1 Layer III frame sync
    0x90,  # bitrate 128 kbps, 44100 Hz (0010 0100 in binary encoding)
    0x00,  # padding / stereo / emphasis bits
    # Padding: 417 bytes for 128 kbps at 44100 Hz = 417 byte frame
]) + bytes([0x00] * 417) + bytes([
    0xFF, 0xFB,
    0x90,
    0x00,
]) + bytes([0x00] * 417) + bytes([
    0xFF, 0xFB,
    0x90,
    0x00,
]) + bytes([0x00] * 417) + bytes([
    0xFF, 0xFB,
    0x90,
    0x00,
]) + bytes([0x00] * 417) + bytes([
    0xFF, 0xFB,
    0x90,
    0x00,
]) + bytes([0x00] * 417)

# Repeat to make it ~3 KB (playable duration ~2-3 seconds of silence)
MP3_DATA = MP3_SILENCE_BYTES * 5

# Write one placeholder MP3 per paragraph (01-12), matching manifest filenames.
MANIFEST_FILE = AUDIO_DIR / "manifest.json"
if MANIFEST_FILE.exists():
    import json
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        m = json.load(f)
    paras = m.get("paragraphs", [])
else:
    paras = [{"audio_file": f"para-{i:02d}.mp3"} for i in range(1, 13)]

for p in paras:
    fname = p.get("audio_file", f"para-{p.get('n', 1):02d}.mp3")
    out_path = AUDIO_DIR / fname
    # Each placeholder is a short silent MP3. For a 12-paragraph lesson,
    # the total is ~36 KB, which is acceptable.
    out_path.write_bytes(MP3_DATA)
    print(f"Placeholder MP3 written: {out_path} ({len(MP3_DATA)} bytes, silent audio)")

print(f"Total placeholder files: {len(paras)}")
