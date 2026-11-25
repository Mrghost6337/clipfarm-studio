"""SQLite job store. No Redis, no broker, resumes after a restart."""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from .config import DATA_DIR

DB_PATH = DATA_DIR / "pipeline.sqlite3"

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'video',
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT NOT NULL DEFAULT 'queued',
  progress REAL NOT NULL DEFAULT 0,
  message TEXT,
  title TEXT,
  thumbnail TEXT,
  duration REAL,
  platform TEXT,
  source_id TEXT,
  preset TEXT,
  max_clips INTEGER,
  result TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status, created_at);
"""

STAGES = [
    "queued",
    "downloading",
    "transcribing",
    "analyzing",
    "rendering",
    "done",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """One short-lived connection: commits on success, rolls back on error and
    always closes, so a long-running service does not leak file handles."""
    connection = sqlite3.connect(DB_PATH, timeout=30)
    try:
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=30000")
        with connection:
            yield connection
    finally:
        connection.close()


def init() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as connection:
        connection.executescript(SCHEMA)
        columns = {row[1] for row in connection.execute("PRAGMA table_info(jobs)")}
        for name, kind in (("preset", "TEXT"), ("max_clips", "INTEGER")):
            if name not in columns:
                connection.execute(f"ALTER TABLE jobs ADD COLUMN {name} {kind}")
        # A job left running when the process died goes back into the queue.
        connection.execute(
            "UPDATE jobs SET status='queued', stage='queued', message='Resuming after restart', updated_at=? WHERE status='running'",
            (_now(),),
        )


def create(
    url: str,
    kind: str,
    title: str | None = None,
    thumbnail: str | None = None,
    platform: str | None = None,
    preset: str | None = None,
    max_clips: int | None = None,
) -> dict[str, Any]:
    job_id = uuid.uuid4().hex[:12]
    now = _now()
    with connect() as connection:
        connection.execute(
            "INSERT INTO jobs (id, url, kind, status, stage, progress, title, thumbnail, platform, preset, max_clips, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (job_id, url, kind, "queued", "queued", 0, title, thumbnail, platform, preset, max_clips, now, now),
        )
    return get(job_id)  # type: ignore[return-value]


def get(job_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    return _row(row) if row else None


def list_jobs(limit: int = 50) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [_row(row) for row in rows]


def next_queued() -> dict[str, Any] | None:
    """Atomically claims one queued job, even with several worker processes."""
    with connect() as connection:
        row = connection.execute("SELECT id FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone()
        if not row:
            return None
        claimed = connection.execute(
            "UPDATE jobs SET status='running', updated_at=? WHERE id=? AND status='queued'",
            (_now(), row["id"]),
        )
        if claimed.rowcount == 0:
            return None
    return get(row["id"])


def update(job_id: str, **fields: Any) -> None:
    allowed = {"status", "stage", "progress", "message", "title", "thumbnail", "duration", "platform", "source_id", "result", "error"}
    values = {key: value for key, value in fields.items() if key in allowed}
    if not values:
        return
    if "result" in values and not isinstance(values["result"], str):
        values["result"] = json.dumps(values["result"], ensure_ascii=False)
    values["updated_at"] = _now()
    assignments = ", ".join(f"{key}=?" for key in values)
    with connect() as connection:
        connection.execute(f"UPDATE jobs SET {assignments} WHERE id=?", (*values.values(), job_id))


def cancel(job_id: str) -> bool:
    job = get(job_id)
    if not job or job["status"] in {"done", "failed"}:
        return False
    # The worker checks for the cancel flag between stages.
    update(job_id, status="cancelled", message="Cancelled by the user", stage="cancelled")
    return True


def retry(job_id: str) -> bool:
    job = get(job_id)
    if not job:
        return False
    update(job_id, status="queued", stage="queued", progress=0, error=None, message="Queued again")
    return True


def delete(job_id: str) -> bool:
    with connect() as connection:
        cursor = connection.execute("DELETE FROM jobs WHERE id=?", (job_id,))
    return cursor.rowcount > 0


def clear_finished() -> int:
    with connect() as connection:
        cursor = connection.execute("DELETE FROM jobs WHERE status IN ('done','failed','cancelled')")
    return cursor.rowcount


def _row(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    if item.get("result"):
        try:
            item["result"] = json.loads(item["result"])
        except json.JSONDecodeError:
            item["result"] = None
    return item


def data_usage() -> dict[str, int]:
    total = 0
    files = 0
    for path in DATA_DIR.rglob("*"):
        if path.is_file():
            total += path.stat().st_size
            files += 1
    return {"bytes": total, "files": files}


def clear_cache() -> dict[str, int]:
    """Removes downloaded media but keeps finished job indexes and clip files."""
    import shutil

    from .config import CACHE_DIR

    removed = 0
    if CACHE_DIR.exists():
        for path in CACHE_DIR.iterdir():
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
                removed += 1
            elif path.suffix in {".mp4", ".webm", ".mkv", ".m4a", ".wav", ".part"}:
                path.unlink(missing_ok=True)
                removed += 1
    return {"removed": removed, "usage": data_usage()}


__all__ = [
    "init",
    "create",
    "get",
    "list_jobs",
    "next_queued",
    "update",
    "cancel",
    "retry",
    "delete",
    "clear_finished",
    "data_usage",
    "clear_cache",
    "STAGES",
    "Path",
]
