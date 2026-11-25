"""Configuration for the local Clipfarm pipeline.

Everything is free and local by default. Optional integrations (Ollama, a
free-tier OpenAI-compatible endpoint, YouTube upload) are read from `.env`
and stay disabled when the values are absent.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("PIPELINE_DATA", ROOT / "pipeline" / "data"))
CACHE_DIR = DATA_DIR / "cache"
JOBS_DIR = DATA_DIR / "jobs"
UPLOAD_DIR = DATA_DIR / "uploads"
FONTS_DIR = ROOT / "assets" / "fonts"
MODELS_DIR = ROOT / "models"
ENV_FILE = ROOT / ".env"


def load_env() -> None:
    """Minimal .env loader (python-dotenv is not required)."""
    if not ENV_FILE.exists():
        return
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env()

for folder in (DATA_DIR, CACHE_DIR, JOBS_DIR, UPLOAD_DIR, FONTS_DIR, MODELS_DIR):
    folder.mkdir(parents=True, exist_ok=True)


def _tool(name: str, fallback: Path) -> str:
    configured = os.environ.get(f"{name.upper()}_PATH")
    if configured:
        return configured
    found = shutil.which(name)
    if found:
        return found
    if fallback.exists():
        return str(fallback)
    return name


FFMPEG = _tool("ffmpeg", ROOT / ".tools" / "ffmpeg")
FFPROBE = _tool("ffprobe", ROOT / ".tools" / "ffprobe")
YTDLP = os.environ.get("YTDLP_PATH") or str(Path(sys.executable).parent / "yt-dlp")

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "auto")  # auto | cpu | cuda
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8")  # int8 | float16 | float32

MAX_CLIPS = int(os.environ.get("MAX_CLIPS", "5"))
MIN_CLIP_SECONDS = float(os.environ.get("MIN_CLIP_SECONDS", "15"))
MAX_CLIP_SECONDS = float(os.environ.get("MAX_CLIP_SECONDS", "60"))
TARGET_CLIP_SECONDS = float(os.environ.get("TARGET_CLIP_SECONDS", "32"))
MAX_SOURCE_HEIGHT = int(os.environ.get("MAX_SOURCE_HEIGHT", "1080"))

CAPTION_PRESET = os.environ.get("CAPTION_PRESET", "bold")

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "auto").lower()  # auto | ollama | openai | none
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.groq.com/openai/v1")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "llama-3.1-8b-instant")

YTDLP_COOKIES = os.environ.get("YTDLP_COOKIES", "")
YTDLP_COOKIES_FROM_BROWSER = os.environ.get("YTDLP_COOKIES_FROM_BROWSER", "")

YOUTUBE_CLIENT_SECRETS = os.environ.get("YOUTUBE_CLIENT_SECRETS", str(ROOT / "secrets" / "youtube_client.json"))
YOUTUBE_TOKEN_FILE = os.environ.get("YOUTUBE_TOKEN_FILE", str(ROOT / "secrets" / "youtube_token.json"))

API_HOST = os.environ.get("PIPELINE_HOST", "127.0.0.1")
API_PORT = int(os.environ.get("PIPELINE_PORT", "8787"))
# When the first port is taken the service tries the next ones. The browser
# Studio probes the same range (src/lib/pipeline.ts, PIPELINE_PORTS).
API_PORT_RANGE = max(1, min(10, int(os.environ.get("PIPELINE_PORT_RANGE", "5"))))
PUBLIC_BASE_URL = os.environ.get("PIPELINE_PUBLIC_URL", f"http://127.0.0.1:{API_PORT}")

# Who may call the local API from a browser. The hosted site, the desktop app
# and the Vite dev server; add more with PIPELINE_ALLOWED_ORIGINS (comma list).
SITE_ORIGIN = os.environ.get("CLIPFARM_SITE_ORIGIN", "https://fractional-hr-34cett.freebuff.site").rstrip("/")
ALLOWED_ORIGINS = frozenset(
    origin.strip().rstrip("/")
    for origin in [
        SITE_ORIGIN,
        "app://clipfarm",
        "http://localhost:5357",
        "http://127.0.0.1:5357",
        *os.environ.get("PIPELINE_ALLOWED_ORIGINS", "").split(","),
    ]
    if origin.strip()
)
# The desktop app passes a fresh token per launch. Without it, `serve` makes
# one and writes it to DATA_DIR/launch-token for the CLI and the dev proxy.
LAUNCH_TOKEN = os.environ.get("PIPELINE_LAUNCH_TOKEN", "")
