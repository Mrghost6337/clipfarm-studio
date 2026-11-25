"""yt-dlp ingest: channel/profile listing, single-video metadata, cached download."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import (
    CACHE_DIR,
    FFMPEG,
    MAX_SOURCE_HEIGHT,
    YTDLP,
    YTDLP_COOKIES,
    YTDLP_COOKIES_FROM_BROWSER,
)

PLATFORM_PATTERNS = {
    "YouTube": r"(youtube\.com|youtu\.be)",
    "Twitch": r"twitch\.tv",
    "TikTok": r"tiktok\.com",
}


class IngestError(RuntimeError):
    """A failure with a message that is safe to show in the UI."""


def platform_of(url: str) -> str:
    for name, pattern in PLATFORM_PATTERNS.items():
        if re.search(pattern, url, re.I):
            return name
    return "Other"


def is_channel_url(url: str) -> bool:
    platform = platform_of(url)
    path = re.sub(r"^https?://", "", url).split("?")[0]
    if platform == "YouTube":
        return bool(
            re.search(r"/(@[^/]+|channel/[^/]+|c/[^/]+|user/[^/]+)(/(videos|shorts|streams|playlists))?/?$", path)
        ) and not re.search(r"/(watch|embed)", path)
    if platform == "Twitch":
        # twitch.tv/<channel> or /<channel>/videos are channels; /videos/<id> is a VOD.
        return bool(re.search(r"twitch\.tv/[^/]+/?(videos)?/?$", path)) and not re.search(r"twitch\.tv/(videos|clip)", path)
    if platform == "TikTok":
        return bool(re.search(r"tiktok\.com/@[^/]+/?$", path))
    return False


def _cookies_opts() -> dict[str, Any]:
    options: dict[str, Any] = {}
    if YTDLP_COOKIES:
        cookie_path = Path(YTDLP_COOKIES)
        if cookie_path.exists():
            options["cookiefile"] = str(cookie_path)
    if YTDLP_COOKIES_FROM_BROWSER:
        options["cookiesfrombrowser"] = (YTDLP_COOKIES_FROM_BROWSER,)
    return options


def _base_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "ffmpeg_location": str(Path(FFMPEG).parent),
        "socket_timeout": 30,
        "retries": 2,
        "extractor_retries": 2,
        **_cookies_opts(),
    }


def friendly_error(raw: str) -> str:
    text = raw.replace("\n", " ").strip()
    lowered = text.lower()
    if "confirm you" in lowered and "bot" in lowered:
        return "YouTube asked for a sign-in check (datacenter IPs get this a lot). Set YTDLP_COOKIES to a cookies.txt export or YTDLP_COOKIES_FROM_BROWSER=chrome in .env, then retry."
    if "private video" in lowered or "this video is private" in lowered:
        return "That video is private. Use a public link, or add cookies from an account that can see it."
    if "age" in lowered and ("restrict" in lowered or "confirm" in lowered):
        return "That video is age-restricted. Add cookies from a signed-in account in .env."
    if "not available in your country" in lowered or "geo" in lowered and "block" in lowered:
        return "That video is geo-blocked from this machine. Try a VOD that is available in your region."
    if "429" in lowered or "too many requests" in lowered or "rate limit" in lowered:
        return "The platform is rate-limiting this machine. Wait a few minutes, or use cookies, and retry."
    if "unsupported url" in lowered:
        return "That link is not a video, channel or profile yt-dlp can read."
    if "unable to download webpage" in lowered or "timed out" in lowered:
        return "Could not reach the platform. Check the connection and retry."
    return text[:400] or "yt-dlp failed for an unknown reason."


def _import_ytdlp():
    try:
        import yt_dlp  # type: ignore
    except ImportError as error:  # pragma: no cover - setup problem
        raise IngestError("yt-dlp is not installed. Run `python -m pipeline.cli setup`.") from error
    return yt_dlp


def _thumbnail(entry: dict[str, Any]) -> str | None:
    if entry.get("thumbnail"):
        return entry["thumbnail"]
    thumbs = entry.get("thumbnails") or []
    if thumbs:
        return thumbs[-1].get("url")
    return None


def _date(entry: dict[str, Any]) -> str | None:
    stamp = entry.get("upload_date") or entry.get("release_date")
    if isinstance(stamp, str) and re.fullmatch(r"\d{8}", stamp):
        return f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:]}"
    timestamp = entry.get("timestamp") or entry.get("release_timestamp")
    if isinstance(timestamp, (int, float)):
        return datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat()
    return None


def _video_url(entry: dict[str, Any], platform: str) -> str:
    url = entry.get("webpage_url") or entry.get("original_url") or ""
    if url.startswith("http"):
        return url
    raw = entry.get("url") or entry.get("id") or ""
    if raw.startswith("http"):
        return raw
    if platform == "YouTube" and raw:
        return f"https://www.youtube.com/watch?v={raw}"
    if platform == "TikTok" and raw:
        return f"https://www.tiktok.com/@/video/{raw}"
    return raw


def normalize(entry: dict[str, Any], platform: str) -> dict[str, Any]:
    return {
        "id": str(entry.get("id") or entry.get("url") or ""),
        "title": entry.get("title") or "Untitled",
        "thumbnail": _thumbnail(entry),
        "duration": float(entry["duration"]) if entry.get("duration") else None,
        "url": _video_url(entry, platform),
        "platform": platform,
        "uploadDate": _date(entry),
        "channel": entry.get("channel") or entry.get("uploader") or entry.get("creator"),
    }


def local_path(url: str) -> Path | None:
    candidate = Path(url[7:] if url.startswith("file://") else url)
    return candidate if candidate.exists() and candidate.is_file() else None


def resolve(url: str, limit: int = 24, offset: int = 0) -> dict[str, Any]:
    """Returns either `{kind:'channel', items:[…]}` or `{kind:'video', video:{…}}`."""
    url = url.strip()
    local = local_path(url)
    if local:
        info = probe(str(local))
        video = {
            "id": local.stem,
            "title": local.stem.replace("_", " ").replace("-", " ").title(),
            "thumbnail": None,
            "duration": info["duration"],
            "url": str(local),
            "platform": "Local",
            "uploadDate": None,
        }
        return {"kind": "video", "platform": "Local", "video": video, "items": [video]}
    if not re.match(r"^https?://", url):
        raise IngestError("Paste a full http(s) link to a video, channel or profile.")
    yt_dlp = _import_ytdlp()
    platform = platform_of(url)
    channel = is_channel_url(url)
    if channel and platform == "YouTube":
        base = url.split("?")[0].rstrip("/")
        if not re.search(r"/(videos|shorts|streams|playlists)$", base):
            base += "/videos"
        url = base

    options = _base_opts()
    if channel:
        options.update({"extract_flat": "in_playlist", "playliststart": offset + 1, "playlistend": offset + limit, "skip_download": True, "noplaylist": False})
        if platform == "YouTube":
            # Flat channel entries have no date unless yt-dlp approximates it.
            options["extractor_args"] = {"youtubetab": {"approximate_date": ["1"]}}
    else:
        options.update({"skip_download": True, "noplaylist": True})

    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=False)
    except Exception as error:  # yt-dlp raises many subclasses
        raise IngestError(friendly_error(str(error))) from error

    if not info:
        raise IngestError("yt-dlp returned nothing for that link.")

    if info.get("_type") in {"playlist", "multi_video"} or info.get("entries"):
        entries = [entry for entry in (info.get("entries") or []) if entry]
        items = [normalize(entry, platform) for entry in entries]
        return {
            "kind": "channel",
            "platform": platform,
            "title": info.get("title") or "Channel",
            "thumbnail": _thumbnail(info),
            "count": len(items),
            "offset": offset,
            "items": items,
            "hasMore": len(items) == limit,
        }

    video = normalize(info, platform)
    return {"kind": "video", "platform": platform, "video": video, "items": [video]}


def download(url: str, video_id: str, platform: str, progress=None) -> dict[str, Any]:
    """Downloads up to 1080p into the cache and returns the media path + metadata."""
    local = local_path(url)
    if local:
        info = probe(str(local))
        return {"path": str(local), "info": {"id": local.stem, "title": local.stem, "duration": info["duration"]}, "cached": True, "dir": str(local.parent)}
    target_dir = CACHE_DIR / platform.lower() / re.sub(r"[^A-Za-z0-9_-]", "_", video_id or "video")
    target_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(target_dir.glob("source.*"))
    existing = [path for path in existing if path.suffix in {".mp4", ".mkv", ".webm"} and path.stat().st_size > 0]
    if existing:
        info_file = target_dir / "info.json"
        info = json.loads(info_file.read_text("utf-8")) if info_file.exists() else {}
        return {"path": str(existing[0]), "info": info, "cached": True, "dir": str(target_dir)}

    yt_dlp = _import_ytdlp()
    options = {
        **_base_opts(),
        "format": (
            f"bestvideo[height<={MAX_SOURCE_HEIGHT}][ext=mp4]+bestaudio[ext=m4a]/"
            f"bestvideo[height<={MAX_SOURCE_HEIGHT}]+bestaudio/best[height<={MAX_SOURCE_HEIGHT}]/best"
        ),
        "merge_output_format": "mp4",
        "outtmpl": str(target_dir / "source.%(ext)s"),
        "noplaylist": True,
        "writethumbnail": False,
        "progress_hooks": [
            lambda data: progress(
                f"Downloading · {int(data.get('_percent_str', '0%').strip().rstrip('%') or 0)}%",
                min(0.24, 0.05 + 0.19 * float(data.get('downloaded_bytes', 0)) / max(1.0, float(data.get('total_bytes') or data.get('total_bytes_estimate') or 1))),
            )
            if progress and data.get("status") == "downloading"
            else None
        ],
    }
    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=True) or {}
    except Exception as error:
        raise IngestError(friendly_error(str(error))) from error

    (target_dir / "info.json").write_text(json.dumps(info, ensure_ascii=False), encoding="utf-8")
    files = sorted(target_dir.glob("source.*"))
    media = [path for path in files if path.suffix in {".mp4", ".mkv", ".webm"} and path.stat().st_size > 0]
    if not media:
        raise IngestError("yt-dlp finished but produced no playable video file.")
    return {"path": str(media[0]), "info": info, "cached": False, "dir": str(target_dir)}


def download_audio(url: str, video_id: str, platform: str, progress=None) -> dict[str, Any]:
    """Audio-only download for long VODs, so transcription starts quickly."""
    local = local_path(url)
    if local:
        return {"path": str(local), "cached": True}
    target_dir = CACHE_DIR / platform.lower() / re.sub(r"[^A-Za-z0-9_-]", "_", video_id or "video")
    target_dir.mkdir(parents=True, exist_ok=True)
    existing = [path for path in sorted(target_dir.glob("audio.*")) if path.stat().st_size > 0]
    if existing:
        return {"path": str(existing[0]), "cached": True}
    yt_dlp = _import_ytdlp()
    options = {
        **_base_opts(),
        "format": "bestaudio/best",
        "outtmpl": str(target_dir / "audio.%(ext)s"),
        "noplaylist": True,
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "m4a", "preferredquality": "128"}],
    }
    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            downloader.extract_info(url, download=True)
    except Exception as error:
        raise IngestError(friendly_error(str(error))) from error
    files = [path for path in sorted(target_dir.glob("audio.*")) if path.stat().st_size > 0]
    if not files:
        raise IngestError("Could not download the audio track for this video.")
    progress and progress("Audio downloaded", 0.24)
    return {"path": str(files[0]), "cached": False}


def probe(path: str) -> dict[str, Any]:
    result = subprocess.run(
        [str(Path(FFMPEG).with_name("ffprobe")), "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise IngestError("ffprobe could not read the downloaded file.")
    data = json.loads(result.stdout)
    video = next((stream for stream in data.get("streams", []) if stream.get("codec_type") == "video"), {})
    return {
        "duration": float(data.get("format", {}).get("duration") or 0),
        "width": int(video.get("width") or 0),
        "height": int(video.get("height") or 0),
        "fps": float(video.get("avg_frame_rate", "0/1").split("/")[0] or 0) / max(1, float(video.get("avg_frame_rate", "1/1").split("/")[-1] or 1)),
        "hasAudio": any(stream.get("codec_type") == "audio" for stream in data.get("streams", [])),
    }


def update_ytdlp() -> dict[str, Any]:
    from .config import MANAGED

    if MANAGED:
        # The desktop app ships a verified runtime; changing it in place would
        # break that check. yt-dlp updates arrive with app updates.
        return {"ok": False, "output": "yt-dlp is updated together with the Clipfarm app. Check for app updates in Settings."}
    result = subprocess.run([sys.executable, "-m", "pip", "install", "-U", "yt-dlp"], capture_output=True, text=True, timeout=300)
    return {"ok": result.returncode == 0, "output": (result.stdout + result.stderr)[-2000:]}


def ytdlp_version() -> str | None:
    """Version of the yt-dlp package this Python runs (the same one used for downloads)."""
    try:
        from yt_dlp.version import __version__  # type: ignore

        return str(__version__)
    except Exception:
        try:
            result = subprocess.run([YTDLP, "--version"], capture_output=True, text=True, timeout=20)
            return result.stdout.strip() if result.returncode == 0 else None
        except Exception:
            return None
