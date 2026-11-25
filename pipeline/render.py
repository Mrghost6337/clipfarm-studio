"""Vertical render: one ffmpeg pass per clip, 1080x1920, H.264 + AAC."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

from .config import DATA_DIR, FFMPEG, FONTS_DIR
from .face import Track, sendcmd_file, track
from .subtitles import Word, build_ass, to_srt, to_vtt


class RenderError(RuntimeError):
    pass


def _has_encoder(name: str) -> bool:
    try:
        result = subprocess.run([FFMPEG, "-hide_banner", "-encoders"], capture_output=True, text=True, timeout=30)
        return name in result.stdout
    except Exception:
        return False


def _has_nvidia() -> bool:
    import shutil

    return bool(shutil.which("nvidia-smi"))


def encoder_args() -> list[str]:
    if _has_nvidia() and _has_encoder("h264_nvenc"):
        return ["-c:v", "h264_nvenc", "-preset", "p5", "-cq", "23", "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"]


def fontconfig_file() -> str:
    """Static ffmpeg builds often have no /etc/fonts. Point fontconfig at our OFL fonts."""
    cache = DATA_DIR / "fontcache"
    cache.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / "fonts.conf"
    path.write_text(
        '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">\n'
        "<fontconfig>\n"
        f"  <dir>{FONTS_DIR}</dir>\n"
        f"  <cachedir>{cache}</cachedir>\n"
        "  <config></config>\n"
        "</fontconfig>\n",
        encoding="utf-8",
    )
    return str(path)


def _filter_path(path: str) -> str:
    """Escapes a file path for use as a filter option inside a filtergraph.

    ffmpeg parses a filtergraph twice: first the graph (where \\ ' [ ] , ;
    are special), then each filter's options (where \\ ' : are special). A
    Windows path like C:\\Users\\x has both a drive colon and backslashes,
    so: use forward slashes (Windows ffmpeg accepts them), escape for the
    option level, then escape that result for the graph level.
    """
    value = path.replace("\\", "/") if os.name == "nt" else path
    option = "".join("\\" + ch if ch in "\\':" else ch for ch in value)
    return "".join("\\" + ch if ch in "\\'[],;" else ch for ch in option)


def render_clip(
    source: str,
    output_dir: str | Path,
    clip_start: float,
    clip_end: float,
    words: list[Word],
    title: str,
    preset: str = "bold",
    has_audio: bool = True,
    layout: str = "auto",
    progress=None,
    public_path: str | None = None,
) -> dict[str, Any]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    source = str(Path(source).resolve())
    clip_id = output_dir.name
    public = public_path or clip_id
    duration = max(0.5, clip_end - clip_start)

    progress and progress("Tracking the speaker", 0.84)
    face = track(source, clip_start, clip_end)
    commands = sendcmd_file(face, str((output_dir / "crop.cmd").resolve()))

    ass_path = output_dir / "captions.ass"
    ass_path.write_text(build_ass(words, clip_start, title, preset), encoding="utf-8")
    (output_dir / "captions.srt").write_text(to_srt(words, clip_start), encoding="utf-8")
    (output_dir / "captions.vtt").write_text(to_vtt(words, clip_start), encoding="utf-8")

    use_face = layout in {"auto", "face"} and face.found and face.crop_width < face.width - 2
    portrait = face.height > face.width
    ass_filter = f"ass=captions.ass:fontsdir={_filter_path(str(FONTS_DIR))}"

    if use_face:
        graph = (
            f"[0:v]sendcmd=f={_filter_path(commands)},"
            f"crop@face=w={face.crop_width}:h={face.height}:x=0:y=0,"
            f"scale=1080:1920:flags=lanczos,setsar=1,{ass_filter}[v]"
        )
    elif portrait:
        graph = f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{ass_filter}[v]"
    else:
        graph = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:1,eq=brightness=-0.06[bg2];"
            f"[fg]scale=1080:-2:flags=lanczos[fg2];"
            f"[bg2][fg2]overlay=(W-w)/2:(H-h)/2,setsar=1,{ass_filter}[v]"
        )

    output = output_dir.resolve() / "clip.mp4"
    command = [
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{clip_start:.3f}", "-t", f"{duration:.3f}", "-i", source,
        "-filter_complex", graph,
        "-map", "[v]",
    ]
    if has_audio:
        command += ["-map", "0:a:0", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000", "-c:a", "aac", "-b:a", "192k"]
    command += [*encoder_args(), "-r", "30", "-movflags", "+faststart", "-t", f"{duration:.3f}", str(output)]

    progress and progress("Rendering 1080×1920", 0.88)
    environment = {**os.environ, "FONTCONFIG_FILE": fontconfig_file()}
    result = subprocess.run(command, cwd=str(output_dir), capture_output=True, text=True, timeout=1800, env=environment)
    if result.returncode != 0 or not output.exists() or output.stat().st_size < 10_000:
        raise RenderError(f"ffmpeg failed: {result.stderr.strip()[-500:] or 'unknown error'}")

    poster = output_dir / "poster.jpg"
    subprocess.run(
        [FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", str(output), "-frames:v", "1", "-q:v", "3", str(poster)],
        capture_output=True, text=True, timeout=120, env=environment,
    )

    meta = {
        "id": clip_id,
        "title": title,
        "start": round(clip_start, 3),
        "end": round(clip_end, 3),
        "duration": round(duration, 3),
        "layout": "face" if use_face else ("portrait" if portrait else "blurred"),
        "faceSamples": len(face.samples),
        "files": {
            "mp4": f"/files/{public}/clip.mp4",
            "srt": f"/files/{public}/captions.srt",
            "vtt": f"/files/{public}/captions.vtt",
            "ass": f"/files/{public}/captions.ass",
            "poster": f"/files/{public}/poster.jpg" if poster.exists() else None,
        },
        "paths": {
            "mp4": str(output),
            "srt": str(output_dir / "captions.srt"),
            "poster": str(poster) if poster.exists() else None,
        },
    }
    (output_dir / "clip.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    progress and progress("Clip rendered", 0.9)
    return meta


def libass_available() -> bool:
    try:
        result = subprocess.run([FFMPEG, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=30)
        return " ass " in result.stdout or "subtitles" in result.stdout
    except Exception:
        return False
