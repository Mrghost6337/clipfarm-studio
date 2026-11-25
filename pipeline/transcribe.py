"""faster-whisper transcription with VAD, word timestamps and auto language."""

from __future__ import annotations

import json
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Any, Callable

from .config import FFMPEG, MODELS_DIR, WHISPER_COMPUTE, WHISPER_DEVICE, WHISPER_MODEL
from .subtitles import Word

Progress = Callable[[str, float], None]


class TranscribeError(RuntimeError):
    pass


def extract_audio(video_path: str, wav_path: str) -> str:
    Path(wav_path).parent.mkdir(parents=True, exist_ok=True)
    command = [
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", video_path,
        "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
        wav_path,
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=900)
    if result.returncode != 0 or not Path(wav_path).exists():
        raise TranscribeError("ffmpeg could not extract audio from the downloaded video.")
    return wav_path


def load_audio(wav_path: str) -> "object":
    """Reads our own 16 kHz mono PCM WAV into float32, so PyAV is not needed."""
    import numpy as np

    with wave.open(wav_path, "rb") as handle:
        if handle.getnchannels() != 1 or handle.getframerate() != 16000 or handle.getsampwidth() != 2:
            raise TranscribeError("The extracted audio is not 16 kHz mono PCM.")
        frames = handle.readframes(handle.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0


def resolve_device() -> tuple[str, str]:
    if WHISPER_DEVICE in {"cpu", "cuda"}:
        device = WHISPER_DEVICE
    else:
        device = "cuda" if shutil.which("nvidia-smi") else "cpu"
    compute = WHISPER_COMPUTE
    if device == "cuda" and compute == "int8":
        compute = "float16"
    if device == "cpu" and compute == "float16":
        compute = "int8"
    return device, compute


def whisper_cpp_fallback(wav_path: str, model_path: str | None = None) -> list[dict[str, Any]]:
    binary = shutil.which("whisper-cli") or shutil.which("whisper.cpp")
    if not binary:
        raise TranscribeError(
            "faster-whisper could not run and whisper.cpp is not installed. Install whisper.cpp and set WHISPER_CPP_PATH, or fix the Python install."
        )
    model = model_path or "models/ggml-small.bin"
    result = subprocess.run(
        [binary, "-m", model, "-f", wav_path, "-oj", "-of", str(Path(wav_path).with_suffix(""))],
        capture_output=True, text=True, timeout=3600,
    )
    if result.returncode != 0:
        raise TranscribeError("whisper.cpp failed to transcribe this audio.")
    data = json.loads(Path(str(Path(wav_path).with_suffix("")) + ".json").read_text("utf-8"))
    return data.get("transcription", [])


def transcribe(
    video_path: str,
    job_dir: str | Path,
    model_name: str | None = None,
    progress: Progress | None = None,
) -> dict[str, Any]:
    job_dir = Path(job_dir)
    wav = str(job_dir / "audio.wav")
    progress and progress("Extracting 16 kHz mono audio", 0.02)
    extract_audio(video_path, wav)
    progress and progress("Loading Whisper", 0.08)

    device, compute = resolve_device()
    model_name = model_name or WHISPER_MODEL
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except Exception as error:  # pragma: no cover - setup problem
        raise TranscribeError(f"faster-whisper is not available ({error}). Run `python -m pipeline.cli setup`.") from error

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute, download_root=str(MODELS_DIR / "whisper"))
    except Exception as error:
        raise TranscribeError(f"Could not load Whisper model `{model_name}`: {error}") from error

    progress and progress(f"Transcribing with {model_name} on {device}", 0.12)
    segments_iter, info = model.transcribe(
        audio=load_audio(wav),
        language=None,
        task="transcribe",
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 350},
        word_timestamps=True,
        beam_size=5,
        condition_on_previous_text=False,
    )

    segments: list[dict[str, Any]] = []
    words: list[dict[str, Any]] = []
    duration = float(getattr(info, "duration", 0) or 0)
    for segment in segments_iter:
        if segment.text.strip():
            segments.append({"start": float(segment.start), "end": float(segment.end), "text": segment.text.strip()})
            for word in segment.words or []:
                text = (word.word or "").strip()
                if text:
                    words.append(
                        {
                            "start": float(word.start),
                            "end": float(word.end),
                            "text": text,
                            "probability": float(getattr(word, "probability", 1.0) or 1.0),
                        }
                    )
        if duration:
            progress and progress(f"Transcribing · {min(100, int(segment.end / duration * 100))}%", 0.12 + 0.6 * min(1, segment.end / duration))

    if not words and not segments:
        raise TranscribeError("Whisper found no speech in this video. Is there an audio track?")

    payload = {
        "language": getattr(info, "language", None),
        "languageProbability": float(getattr(info, "language_probability", 0) or 0),
        "duration": duration or (segments[-1]["end"] if segments else 0),
        "model": model_name,
        "device": device,
        "segments": segments,
        "words": words,
    }
    (job_dir / "transcript.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (job_dir / "transcript.txt").write_text("\n".join(segment["text"] for segment in segments), encoding="utf-8")
    progress and progress(f"Transcript ready · {len(words)} words · {payload['language']}", 0.75)
    return payload


def words_from_payload(payload: dict[str, Any]) -> list[Word]:
    return [Word(float(item["start"]), float(item["end"]), item["text"], float(item.get("probability", 1))) for item in payload.get("words", [])]
