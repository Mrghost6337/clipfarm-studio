"""Dependency checks for the System check page."""

from __future__ import annotations

import importlib.util
import json
import subprocess
from pathlib import Path
from typing import Any

from .config import FFMPEG, FFPROBE, FONTS_DIR, MODELS_DIR, OLLAMA_MODEL, WHISPER_MODEL, YOUTUBE_CLIENT_SECRETS, YOUTUBE_TOKEN_FILE
from .face import MODEL_PATH


def _version(command: list[str]) -> str | None:
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=20)
        if result.returncode != 0:
            return None
        return (result.stdout or result.stderr).splitlines()[0].strip()[:120]
    except Exception:
        return None


def _has_module(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def checks() -> dict[str, Any]:
    items: list[dict[str, Any]] = []

    def add(key: str, label: str, ok: bool, detail: str, required: bool = True) -> None:
        items.append({"key": key, "label": label, "ok": ok, "detail": detail, "required": required})

    ffmpeg_version = _version([FFMPEG, "-version"])
    add("ffmpeg", "ffmpeg", bool(ffmpeg_version), ffmpeg_version or "Not found. Run scripts/setup.sh.", True)
    libass_ok = False
    if ffmpeg_version:
        try:
            filters = subprocess.run([FFMPEG, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=30).stdout
            libass_ok = " ass " in filters or "subtitles" in filters
        except Exception:
            libass_ok = False
    add("libass", "libass / ASS subtitles", libass_ok, "ffmpeg has the ass filter" if libass_ok else "This ffmpeg build has no libass. Use the bundled .tools/ffmpeg.", True)

    probe_version = _version([FFPROBE, "-version"])
    add("ffprobe", "ffprobe", bool(probe_version), probe_version or "Not found", True)

    from .ingest import ytdlp_version

    ytdlp = ytdlp_version()
    add("ytdlp", "yt-dlp", bool(ytdlp), ytdlp or "Not installed. Run scripts/setup.sh.", True)

    add("faster_whisper", "faster-whisper", _has_module("faster_whisper"), f"Model: {WHISPER_MODEL}" if _has_module("faster_whisper") else "Not installed", True)
    add("opencv", "OpenCV", _has_module("cv2"), "Face tracking available" if _has_module("cv2") else "Not installed", True)
    add("face_model", "YuNet face model", MODEL_PATH.exists(), str(MODEL_PATH), True)
    fonts = sorted(path.name for path in FONTS_DIR.glob("*.ttf"))
    add("fonts", "Open-license fonts", bool(fonts), ", ".join(fonts) or "No fonts in assets/fonts", True)

    from . import llm

    ollama = llm.ollama_available()
    add("ollama", "Ollama (optional)", ollama, f"{OLLAMA_MODEL} at localhost:11434" if ollama else "Not running. Heuristics are used instead.", False)

    youtube = Path(YOUTUBE_TOKEN_FILE).exists() and Path(YOUTUBE_CLIENT_SECRETS).exists()
    add("youtube", "YouTube upload (optional)", youtube, "OAuth connected" if youtube else "Not connected. Download + copy caption still works.", False)

    whisper_cache = MODELS_DIR / "whisper"
    cached = list(whisper_cache.glob("**/model.bin")) if whisper_cache.exists() else []
    add("whisper_model", "Whisper weights", bool(cached), f"{len(cached)} cached model(s)" if cached else "Downloaded on first transcription", False)

    required_ok = all(item["ok"] for item in items if item["required"])
    return {"ok": required_ok, "checks": items, "model": WHISPER_MODEL}


def summary_text() -> str:
    return json.dumps(checks(), indent=2, ensure_ascii=False)
