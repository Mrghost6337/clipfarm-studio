#!/usr/bin/env bash
# Install everything the local Clipfarm pipeline needs. No root, no paid services.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Python venv"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip >/dev/null
.venv/bin/python -m pip install -r requirements.txt

echo "==> Directories"
mkdir -p .tools models assets/fonts pipeline/data secrets

echo "==> ffmpeg (static build with libass)"
if [ ! -x .tools/ffmpeg ]; then
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" ;;
    aarch64|arm64) url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz" ;;
    *) echo "Unsupported architecture $arch. Install ffmpeg with libass and set FFMPEG_PATH." >&2; exit 1 ;;
  esac
  tmp="$(mktemp -d)"
  echo "    downloading $url"
  curl -fsSL "$url" | tar -xJ -C "$tmp"
  find "$tmp" -name ffmpeg -type f -exec cp {} .tools/ffmpeg \;
  find "$tmp" -name ffprobe -type f -exec cp {} .tools/ffprobe \;
  chmod +x .tools/ffmpeg .tools/ffprobe
  rm -rf "$tmp"
fi
.tools/ffmpeg -hide_banner -version | head -1

echo "==> YuNet face model"
if [ ! -f models/face_detection_yunet_2023mar.onnx ]; then
  curl -fsSL -o models/face_detection_yunet_2023mar.onnx \
    https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
fi

echo "==> Open-license fonts"
[ -f assets/fonts/Anton-Regular.ttf ] || curl -fsSL -o assets/fonts/Anton-Regular.ttf https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf
[ -f assets/fonts/BebasNeue-Regular.ttf ] || curl -fsSL -o assets/fonts/BebasNeue-Regular.ttf https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf
[ -f assets/fonts/NotoSans-Regular.ttf ] || curl -fsSL -o assets/fonts/NotoSans-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example"
fi

echo "==> Dependency check"
.venv/bin/python -m pipeline.cli check

cat <<'TXT'

Done. Start the pipeline:
  .venv/bin/python -m pipeline.cli serve

Then in another terminal:
  bun run dev --port 3000
and open http://localhost:3000/local

Optional free upgrades:
  - Ollama for smarter titles/scores: https://ollama.com then `ollama pull qwen2.5:7b`
  - YouTube upload: see the YOUTUBE_* block in .env.example
TXT
