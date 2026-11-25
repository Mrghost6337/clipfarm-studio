"""Real measurements for the desktop app's PC check and model test.

- benchmark(): encodes 4 s of a 1080×1920 test pattern with the bundled
  ffmpeg (libx264, the codec every clip uses) and times float32 matrix
  multiplications with numpy (a proxy for CPU transcription speed). Progress
  is reported per encoded frame and per multiplication.
- model_test(): transcribes the first 15 s of the bundled sample video with an
  installed Whisper model and runs YuNet face detection on one of its frames.
"""

from __future__ import annotations

import re
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Callable, Iterator

from .config import FFMPEG, ROOT

SAMPLE = ROOT / "pipeline" / "sample" / "sample.mp4"
ENCODE_SECONDS = 4
ENCODE_FPS = 30
MATMUL_SIZE = 512
MATMUL_ROUNDS = 40


def benchmark() -> Iterator[dict[str, Any]]:
    total_frames = ENCODE_SECONDS * ENCODE_FPS
    command = [
        FFMPEG, "-hide_banner", "-loglevel", "error", "-nostats",
        "-f", "lavfi", "-i", f"testsrc2=size=1080x1920:rate={ENCODE_FPS}",
        "-t", str(ENCODE_SECONDS), "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-progress", "pipe:1", "-f", "null", "-",
    ]
    started = time.perf_counter()
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert process.stdout is not None
    frames = 0
    for line in process.stdout:
        match = re.match(r"frame=(\d+)", line.strip())
        if match:
            frames = int(match.group(1))
            yield {"stage": "encode", "progress": min(1.0, frames / total_frames)}
    process.wait()
    elapsed = time.perf_counter() - started
    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg could not run the encode test: {(process.stderr.read() if process.stderr else '')[-300:]}")
    encode_fps = total_frames / elapsed if elapsed > 0 else 0.0
    yield {"stage": "encode", "progress": 1.0, "encodeFps": round(encode_fps, 1)}

    import numpy as np

    a = np.random.default_rng(1).standard_normal((MATMUL_SIZE, MATMUL_SIZE), dtype=np.float32)
    b = np.random.default_rng(2).standard_normal((MATMUL_SIZE, MATMUL_SIZE), dtype=np.float32)
    np.dot(a, b)  # warm-up
    started = time.perf_counter()
    for index in range(MATMUL_ROUNDS):
        np.dot(a, b)
        yield {"stage": "cpu", "progress": (index + 1) / MATMUL_ROUNDS}
    elapsed = time.perf_counter() - started
    gflops = 2 * MATMUL_SIZE**3 * MATMUL_ROUNDS / elapsed / 1e9 if elapsed > 0 else 0.0
    yield {"stage": "done", "progress": 1.0, "encodeFps": round(encode_fps, 1), "encodeRealtime": round(encode_fps / ENCODE_FPS, 2), "gflops": round(gflops, 1)}


def model_test(model_name: str, progress: Callable[[str], None] | None = None) -> dict[str, Any]:
    from .face import MODEL_PATH
    from .transcribe import installed_model_dir, load_audio, resolve_device

    folder = installed_model_dir(model_name)
    if not folder:
        raise RuntimeError(f"The model `{model_name}` is not installed.")
    if not SAMPLE.exists():
        raise RuntimeError("The test video is missing from the app.")
    seconds = 15
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "sample.wav"
        result = subprocess.run(
            [FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", str(SAMPLE), "-t", str(seconds), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav)],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError("ffmpeg could not read the test video.")
        audio = load_audio(str(wav))

    from faster_whisper import WhisperModel  # type: ignore

    device, compute = resolve_device()
    progress and progress("Loading the model")
    loaded = time.perf_counter()
    model = WhisperModel(str(folder), device=device, compute_type=compute)
    load_seconds = time.perf_counter() - loaded
    progress and progress("Transcribing the test clip")
    started = time.perf_counter()
    segments, info = model.transcribe(audio, beam_size=1, vad_filter=False)
    text = " ".join(segment.text.strip() for segment in segments).strip()
    elapsed = time.perf_counter() - started

    progress and progress("Finding a face")
    import cv2  # type: ignore

    capture = cv2.VideoCapture(str(SAMPLE))
    capture.set(cv2.CAP_PROP_POS_MSEC, 2000)
    ok, frame = capture.read()
    capture.release()
    faces = 0
    if ok:
        height, width = frame.shape[:2]
        detector = cv2.FaceDetectorYN.create(str(MODEL_PATH), "", (width, height), 0.6, 0.3, 5000)
        _, found = detector.detect(frame)
        faces = 0 if found is None else len(found)
    return {
        "ok": bool(text) and faces > 0,
        "model": model_name,
        "device": device,
        "language": info.language,
        "languageProbability": round(float(info.language_probability), 3),
        "text": text[:160],
        "seconds": seconds,
        "loadSeconds": round(load_seconds, 2),
        "transcribeSeconds": round(elapsed, 2),
        "realtimeFactor": round(elapsed / seconds, 3),
        "faces": faces,
    }
