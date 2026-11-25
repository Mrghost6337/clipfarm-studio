"""Background worker: one thread, SQLite queue, resumable states."""

from __future__ import annotations

import json
import threading
import time
import traceback
from pathlib import Path
from typing import Any

from . import db, detect, ingest, render, transcribe
from .config import CAPTION_PRESET, JOBS_DIR, MAX_CLIPS
from .transcribe import words_from_payload

LONG_VIDEO_SECONDS = 1800


class Cancelled(Exception):
    pass


class Worker:
    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self.current: str | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        db.init()
        self._thread = threading.Thread(target=self._loop, name="clipfarm-worker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            job = db.next_queued()
            if not job:
                time.sleep(1.2)
                continue
            self.current = job["id"]
            try:
                self._process(job)
            except Cancelled:
                db.update(job["id"], status="cancelled", stage="cancelled", message="Cancelled")
            except Exception as error:  # noqa: BLE001 - the message is shown in the UI
                traceback.print_exc()
                db.update(job["id"], status="failed", stage="failed", error=str(error)[:600], message=str(error)[:300])
            finally:
                self.current = None

    def _check(self, job_id: str) -> None:
        job = db.get(job_id)
        if not job or job["status"] == "cancelled":
            raise Cancelled()

    def _process(self, job: dict[str, Any]) -> None:
        job_id = job["id"]
        job_dir = JOBS_DIR / job_id
        clips_dir = job_dir / "clips"
        job_dir.mkdir(parents=True, exist_ok=True)
        clips_dir.mkdir(parents=True, exist_ok=True)

        db.update(job_id, status="running", stage="downloading", progress=0.02, message="Reading the link")
        self._check(job_id)

        listing = ingest.resolve(job["url"], limit=1)
        if listing.get("kind") != "video":
            raise RuntimeError("That link is a channel. Pick a single video from the channel list first.")
        video = listing["video"]
        db.update(
            job_id,
            title=video.get("title"),
            thumbnail=video.get("thumbnail"),
            duration=video.get("duration"),
            platform=video.get("platform"),
            source_id=video.get("id"),
            message="Preparing the video",
            progress=0.04,
        )
        self._check(job_id)

        metadata = video
        duration = float(video.get("duration") or 0)
        media_path: str | None = None
        wav: str | None = None

        def progress(message: str, fraction: float) -> None:
            current = db.get(job_id)
            if current and current["status"] == "cancelled":
                raise Cancelled()
            db.update(job_id, message=message, progress=min(0.99, max(0.0, fraction)))

        if duration and duration > LONG_VIDEO_SECONDS:
            db.update(job_id, message="Long video: downloading audio first", progress=0.05)
            audio = ingest.download_audio(job["url"], video["id"], video["platform"], progress=progress)
            self._check(job_id)
            db.update(job_id, stage="transcribing", message="Transcribing the audio", progress=0.26)
            transcript = transcribe.transcribe(audio, job_dir, progress=lambda msg, frac: progress(msg, 0.26 + frac * 0.45))
        else:
            db.update(job_id, stage="downloading", message="Downloading up to 1080p", progress=0.05)
            downloaded = ingest.download(job["url"], video["id"], video["platform"], progress=progress)
            media_path = downloaded["path"]
            if downloaded.get("info"):
                metadata = {**video, **{key: downloaded["info"].get(key) for key in ("title", "duration", "thumbnail") if downloaded["info"].get(key)}}
                duration = float(metadata.get("duration") or duration)
            probe = ingest.probe(media_path)
            duration = probe["duration"] or duration
            db.update(job_id, title=metadata.get("title"), duration=duration, progress=0.28)
            self._check(job_id)
            db.update(job_id, stage="transcribing", message="Extracting audio and transcribing", progress=0.3)
            transcript = transcribe.transcribe(media_path, job_dir, progress=lambda msg, frac: progress(msg, 0.3 + frac * 0.42))
            wav = str(job_dir / "audio.wav")

        self._check(job_id)
        db.update(job_id, stage="analyzing", message="Finding the best moments", progress=0.76)
        words = words_from_payload(transcript)
        clips = detect.detect(
            words,
            duration=max(duration, transcript.get("duration", 0)),
            language=transcript.get("language"),
            wav=wav or str(job_dir / "audio.wav"),
            max_clips=int(job.get("max_clips") or MAX_CLIPS),
            progress=progress,
        )

        if media_path is None:
            db.update(job_id, stage="downloading", message="Downloading the video for rendering", progress=0.8)
            downloaded = ingest.download(job["url"], video["id"], video["platform"], progress=progress)
            media_path = downloaded["path"]
            probe = ingest.probe(media_path)
        else:
            probe = ingest.probe(media_path)

        db.update(job_id, stage="rendering", message=f"Rendering {len(clips)} vertical clips", progress=0.82)
        rendered: list[dict[str, Any]] = []
        for index, candidate in enumerate(clips, start=1):
            self._check(job_id)
            clip_dir = clips_dir / f"{index:02d}"
            public = f"{job_id}/clips/{index:02d}"
            meta = render.render_clip(
                media_path,
                clip_dir,
                candidate.start,
                max(candidate.start + 1, min(candidate.end, candidate.start + 60)),
                [word for word in words if word.start >= candidate.start - 0.5 and word.end <= candidate.end + 0.5],
                candidate.title,
                preset=job.get("preset") or CAPTION_PRESET,
                has_audio=probe.get("hasAudio", True),
                progress=lambda msg, frac, i=index: progress(f"Clip {i}/{len(clips)} · {msg}", 0.82 + 0.16 * (i - 1) / len(clips)),
                public_path=public,
            )
            rendered.append(
                {
                    **{key: meta[key] for key in ("id", "title", "start", "end", "duration", "layout", "files")},
                    "score": round(candidate.score),
                    "reason": candidate.reason,
                    "hashtags": candidate.hashtags,
                    "caption": f"{candidate.title}\n\n{' '.join(candidate.hashtags)}",
                }
            )

        result = {
            "jobId": job_id,
            "video": {
                "id": video.get("id"),
                "url": job["url"],
                "title": metadata.get("title") or video.get("title"),
                "thumbnail": metadata.get("thumbnail") or video.get("thumbnail"),
                "duration": duration,
                "platform": video.get("platform"),
                "width": probe.get("width"),
                "height": probe.get("height"),
                "sourcePath": media_path,
            },
            "language": transcript.get("language"),
            "languageProbability": transcript.get("languageProbability"),
            "transcript": {
                "segments": transcript.get("segments", []),
                "words": transcript.get("words", []),
            },
            "posting": {"youtube": False, "tiktok": False, "instagram": False},
            "clips": rendered,
        }
        (job_dir / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        db.update(
            job_id,
            status="done",
            stage="done",
            progress=1,
            message=f"{len(rendered)} clips ready",
            result=result,
            title=result["video"]["title"],
            thumbnail=result["video"]["thumbnail"],
            duration=duration,
        )


worker = Worker()
