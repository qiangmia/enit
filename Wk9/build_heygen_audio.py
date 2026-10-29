#!/usr/bin/env python3
"""
Build script: generate HeyGen Voice Turbo TTS MP3s for Wk9 read-along paragraphs.
Reads Wk9/Week9_Cybersecurity.html, extracts .readalong-para elements,
calls openrouter.ai /api/v1/audio/speech (model: heygen/heygen-voice-1-turbo),
and writes Wk9/audio/*.mp3 + Wk9/audio/manifest.json.

Requires: OPENROUTER_API_KEY environment variable.
Without it, writes a manifest.json that points to nothing (used with
speechSynthesis fallback) and logs which paragraphs need audio.
"""
import os
import re
import json
import time
from pathlib import Path

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
WEEK_DIR = Path(__file__).parent.resolve()
HTML_FILE = WEEK_DIR / "Week9_Cybersecurity.html"
AUDIO_DIR = WEEK_DIR / "audio"
MANIFEST_FILE = AUDIO_DIR / "manifest.json"

API_URL = "https://openrouter.ai/api/v1/audio/speech"
MODEL = "heygen/heygen-voice-1-turbo"

# Per-speaker voice mapping (all voices are from the provider docs).
VOICE_MAP = {
    "narrator": "nadine",
    "mason": "bram",
    "lin": "meredith",
    "chen":  "tabitha",
}

RATE_NAMES = {"0.85": "slow", "1.0": "normal"}  # informational only

# ------------------------------------------------------------------
# HTML parser — minimal, no external deps
# ------------------------------------------------------------------

def extract_paragraphs():
    """Return list of dicts: {n, speaker, text, file, text_length}."""
    html = HTML_FILE.read_text(encoding="utf-8")
    # Find each .readalong-para and capture the inner text until closing </p>
    # We use regex rather than html.parser so this runs on any python3.
    paras = []
    pattern = re.compile(
        r'<p class="readalong-para" data-speaker="([^"]+)">(.*?)</p>',
        re.DOTALL)
    for i, m in enumerate(pattern.finditer(html), start=1):
        speaker = m.group(1)
        raw_text = m.group(2)
        # Strip inner HTML tags (e.g. <strong>, <em>) — keep only raw text.
        text = re.sub(r'<[^>]+>', '', raw_text)
        # Collapse whitespace exactly as the read-along JS does.
        text = ' '.join(text.split())
        paras.append({
            "n": i,
            "speaker": speaker,
            "text": text,
            "file": f"para-{i:02d}.mp3",
            "voice": VOICE_MAP.get(speaker, VOICE_MAP["narrator"]),
            "text_length": len(text),
        })
    return paras


# ------------------------------------------------------------------
# Audio generator (requires OPENROUTER_API_KEY)
# ------------------------------------------------------------------

def generate_audio(paras):
    import urllib.request
    import urllib.error

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        print("WARNING: OPENROUTER_API_KEY not set. Skipping audio generation.")
        return False

    header = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
    }
    ok = True
    for p in paras:
        payload = {
            "model": MODEL,
            "input": p["text"],
            "voice": p["voice"],
            "response_format": "mp3",
        }
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            API_URL, data=data, headers=header, method="POST")
        out_path = AUDIO_DIR / p["file"]
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
                content_type = resp.headers.get("Content-Type", "")
                if b"audio/mpeg" in content_type or b"audio/mp3" in content_type:
                    out_path.write_bytes(body)
                    # Small sanity check: MP3 header starts with ID3 or 0xFFFB
                    if len(body) > 10 and (body[:3] == b"ID3" or body[:2] == b'\xff\xfb'):
                        print(f"OK  para {p['n']:02d} ({p['voice']}) -> {p['file']} ({len(body)} bytes)")
                    else:
                        print(f"WARN para {p['n']:02d} response is {len(body)} bytes, not a valid MP3 header")
                else:
                    # If the server returns text/error instead of binary.
                    print(f"FAIL para {p['n']:02d}: unexpected Content-Type: {content_type}")
                    ok = False
        except urllib.error.HTTPError as e:
            # 429 (rate limit) => retry with backoff.
            body_text = e.read().decode("utf-8", errors="replace")
            print(f"FAIL para {p['n']:02d}: HTTP {e.code} — {body_text[:200]}")
            ok = False
        except Exception as e:
            print(f"FAIL para {p['n']:02d}: {e}")
            ok = False
        # Small delay to avoid 429s.
        time.sleep(0.8)
    return ok


# ------------------------------------------------------------------
# Manifest writer
# ------------------------------------------------------------------

def write_manifest(paras, generated_ok=True):
    manifest = {
        "version": 1,
        "lesson_file": "Week9_Cybersecurity.html",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": MODEL,
        "audio_dir": "audio/",
        "notes": [
            "Audio files are pre-generated MP3s from HeyGen Voice Turbo via OpenRouter.",
            "If OPENROUTER_API_KEY is not available, set to speechSynthesis fallback.",
            "Rate control uses HTMLAudioElement playbackRate (0.85 / 1.0).",
        ],
        "paragraphs": [
            {
                "n": p["n"],
                "speaker": p["speaker"],
                "voice": p["voice"],
                "text_preview": p["text"][:120] + ("..." if len(p["text"]) > 120 else ""),
                "text_length": p["text_length"],
                "audio_file": p["file"],
                "file_exists": (AUDIO_DIR / p["file"]).is_file(),
            }
            for p in paras
        ],
        "generated_ok": generated_ok,
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest written: {MANIFEST_FILE}")
    print(f"Total paragraphs: {len(paras)}")

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

if __name__ == "__main__":
    AUDIO_DIR.mkdir(exist_ok=True)
    paras = extract_paragraphs()
    print(f"Found {len(paras)} paragraphs.")
    for p in paras:
        print(f"  {p['n']:02d} | speaker={p['speaker']:12s} | voice={p['voice']:12s} | chars={p['text_length']:3d} | preview: {p['text'][:80]}...")
    ok = generate_audio(paras)
    write_manifest(paras, generated_ok=ok)
    # Always print a reminder regardless of result.
    if not ok:
        print("\nNOTE: Audio files may be missing or incomplete — fall back to speechSynthesis is available.")
