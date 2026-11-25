"""Local HTTP API for the Clipfarm pipeline.

Run with `python -m pipeline.cli serve` (127.0.0.1:8787). The hosted SPA calls
this API; nothing here needs a paid service or an API key.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db, detect, ingest, publish, render, security
from .config import API_HOST, API_PORT, API_PORT_RANGE, CACHE_DIR, CAPTION_PRESET, JOBS_DIR, MAX_CLIPS, MIN_CLIP_SECONDS, MAX_CLIP_SECONDS, UPLOAD_DIR, WHISPER_MODEL
from .subtitles import PRESETS
from .system import checks as system_checks
from .worker import worker

STATIC = Path(JOBS_DIR)
STATIC.mkdir(parents=True, exist_ok=True)


VERSION = "1.1"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init()
    security.init()
    worker.start()
    yield
    worker.stop()


app = FastAPI(title="Clipfarm local pipeline", version=VERSION, lifespan=lifespan)

CORS_METHODS = "GET, POST, PATCH, DELETE, OPTIONS"
CORS_HEADERS = "authorization, content-type, x-pair-secret"


def _cors(response: Response, origin: str | None) -> Response:
    """CORS for allowlisted origins only. No `*`, no credentials (tokens travel in headers)."""
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = CORS_METHODS
        response.headers["Access-Control-Allow-Headers"] = CORS_HEADERS
        response.headers["Access-Control-Max-Age"] = "600"
        # Chrome's private/local network access preflight.
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["Vary"] = "Origin"
    return response


def _deny(status: int, detail: str, origin: str | None = None) -> Response:
    return _cors(JSONResponse({"detail": detail}, status_code=status), origin)


@app.middleware("http")
async def guard(request: Request, call_next):
    origin = request.headers.get("origin")
    if not security.host_allowed(request.headers.get("host")):
        return JSONResponse({"detail": "This service only answers on 127.0.0.1 or localhost."}, status_code=421)
    if not security.origin_allowed(origin):
        return JSONResponse({"detail": "This website is not allowed to use the Clipfarm pipeline."}, status_code=403)
    if request.method == "OPTIONS":
        return _cors(Response(status_code=204), origin)

    kind = security.route_class(request.method, request.url.path)
    principal = None
    if kind != "public":
        principal = security.from_bearer(request.headers.get("authorization"))
        if principal is None and kind == "ticket":
            principal = security.from_ticket(request.query_params.get("ticket"))
        if principal is None:
            return _deny(401, "Connect this browser to the Clipfarm pipeline first.", origin)
        if kind == "launch" and principal.kind != "launch":
            return _deny(403, "Only the Clipfarm app on this computer can manage pairings.", origin)
    request.state.principal = principal
    response = await call_next(request)
    return _cors(response, origin)


app.mount("/files", StaticFiles(directory=str(STATIC)), name="files")


class IngestRequest(BaseModel):
    url: str
    limit: int = Field(default=24, ge=1, le=60)
    offset: int = Field(default=0, ge=0)


class JobRequest(BaseModel):
    url: str
    title: str | None = Field(default=None, max_length=200)
    preset: str | None = None
    maxClips: int | None = Field(default=None, ge=1, le=10)


class PublishRequest(BaseModel):
    jobId: str
    clipId: str
    privacy: str = "private"


class JobPatchRequest(BaseModel):
    title: str | None = None


class ClipRenderRequest(BaseModel):
    preset: str | None = None
    layout: str = "auto"
    title: str | None = None
    start: float | None = None
    end: float | None = None
    hook: bool = True


class PairRequest(BaseModel):
    name: str = Field(default="Browser", max_length=120)


class PairDecision(BaseModel):
    code: str = Field(max_length=16)


@app.get("/health")
def health() -> dict[str, Any]:
    # Public: the browser Studio uses it to find the service on 127.0.0.1.
    host = "desktop" if os.environ.get("PIPELINE_HOST_APP") == "desktop" else "cli"
    return {"ok": True, "service": "clipfarm-pipeline", "version": VERSION, "instanceId": security.state().instance_id, "host": host, "time": time.time()}


@app.post("/pair/request")
def pair_request(body: PairRequest, request: Request) -> dict[str, Any]:
    try:
        return security.request_pairing(request.headers.get("origin"), body.name)
    except security.PairingError as error:
        raise HTTPException(status_code=error.status, detail=error.detail) from error


@app.get("/pair/request/{request_id}")
def pair_poll(request_id: str, request: Request) -> dict[str, Any]:
    try:
        return security.poll_pairing(request_id, request.headers.get("x-pair-secret"))
    except security.PairingError as error:
        raise HTTPException(status_code=error.status, detail=error.detail) from error


@app.get("/pair/requests")
def pair_requests() -> list[dict[str, Any]]:
    return security.list_requests()


@app.post("/pair/requests/approve")
def pair_approve(body: PairDecision) -> dict[str, Any]:
    try:
        return security.decide(body.code, True)
    except security.PairingError as error:
        raise HTTPException(status_code=error.status, detail=error.detail) from error


@app.post("/pair/requests/deny")
def pair_deny(body: PairDecision) -> dict[str, Any]:
    try:
        return security.decide(body.code, False)
    except security.PairingError as error:
        raise HTTPException(status_code=error.status, detail=error.detail) from error


@app.get("/pairings")
def pairings() -> list[dict[str, Any]]:
    return security.list_pairings()


@app.delete("/pairings/{pairing_id}")
def pairing_revoke(pairing_id: str) -> dict[str, Any]:
    if not security.revoke(pairing_id):
        raise HTTPException(status_code=404, detail="Pairing not found")
    return {"ok": True}


@app.delete("/pairing")
def pairing_forget(request: Request) -> dict[str, Any]:
    """A paired browser disconnects itself."""
    principal = request.state.principal
    if principal.kind == "pairing" and principal.pairing_id:
        security.revoke(principal.pairing_id)
    return {"ok": True}


@app.post("/auth/ticket")
def auth_ticket(request: Request) -> dict[str, Any]:
    return security.make_ticket(request.state.principal)


@app.get("/system")
def system() -> dict[str, Any]:
    return system_checks()


@app.get("/config")
def config() -> dict[str, Any]:
    return {
        "presets": list(PRESETS.keys()),
        "defaultPreset": CAPTION_PRESET,
        "maxClips": MAX_CLIPS,
        "minSeconds": MIN_CLIP_SECONDS,
        "maxSeconds": MAX_CLIP_SECONDS,
        "whisperModel": WHISPER_MODEL,
        "usage": db.data_usage(),
    }


@app.post("/ingest")
def ingest_urls(request: IngestRequest) -> dict[str, Any]:
    try:
        return ingest.resolve(request.url, limit=request.limit, offset=request.offset)
    except ingest.IngestError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/upload")
async def upload_source(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "upload.mp4").suffix.lower()
    if suffix not in {".mp4", ".mov", ".mkv", ".webm", ".m4v"}:
        raise HTTPException(status_code=415, detail="Upload an MP4, MOV, MKV or WebM file.")
    target = UPLOAD_DIR / f"{uuid.uuid4().hex[:12]}{suffix}"
    with target.open("wb") as handle:
        while chunk := await file.read(1024 * 1024):
            handle.write(chunk)
    try:
        info = ingest.probe(str(target))
    except Exception as error:  # noqa: BLE001
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"That file is not a readable video ({error}).") from error
    return {"path": str(target), "name": file.filename, "duration": info["duration"], "width": info["width"], "height": info["height"]}


@app.post("/jobs")
def create_job(request: JobRequest) -> dict[str, Any]:
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=422, detail="Paste a video link first.")
    preset = request.preset if request.preset in PRESETS else CAPTION_PRESET
    title = (request.title or "").strip() or None
    job = db.create(url, "video", title=title, preset=preset, max_clips=request.maxClips)
    return job


@app.get("/jobs")
def list_jobs(limit: int = 50) -> list[dict[str, Any]]:
    return db.list_jobs(limit)


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    job = db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.patch("/jobs/{job_id}")
def patch_job(job_id: str, request: JobPatchRequest) -> dict[str, Any]:
    if not db.get(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    if request.title is not None:
        db.update(job_id, title=request.title.strip()[:200] or None)
    return db.get(job_id) or {}


@app.get("/jobs/{job_id}/events")
def job_events(job_id: str) -> StreamingResponse:
    def stream():
        last = ""
        while True:
            job = db.get(job_id)
            if not job:
                yield "event: error\ndata: {\"detail\":\"Job not found\"}\n\n"
                return
            payload = json.dumps(job, ensure_ascii=False)
            if payload != last:
                yield f"data: {payload}\n\n"
                last = payload
            if job["status"] in {"done", "failed", "cancelled"}:
                return
            time.sleep(0.5)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"cache-control": "no-cache", "x-accel-buffering": "no", "connection": "keep-alive"},
    )


@app.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str) -> dict[str, Any]:
    if not db.cancel(job_id):
        raise HTTPException(status_code=409, detail="This job cannot be cancelled")
    return {"ok": True}


@app.post("/jobs/{job_id}/retry")
def retry_job(job_id: str) -> dict[str, Any]:
    if not db.retry(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return db.get(job_id) or {}


@app.delete("/jobs/{job_id}")
def delete_job(job_id: str) -> dict[str, Any]:
    job = db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == "running":
        raise HTTPException(status_code=409, detail="Cancel the job before deleting it.")
    import shutil

    shutil.rmtree(JOBS_DIR / job_id, ignore_errors=True)
    db.delete(job_id)
    return {"ok": True, "usage": db.data_usage()}


@app.get("/cache")
def cache() -> dict[str, Any]:
    return db.data_usage()


@app.delete("/cache")
def clear_cache() -> dict[str, Any]:
    return db.clear_cache()


@app.post("/ytdlp/update")
def update_ytdlp() -> dict[str, Any]:
    return ingest.update_ytdlp()


@app.post("/jobs/{job_id}/clips/{clip_id}/render")
def render_job_clip(job_id: str, clip_id: str, request: ClipRenderRequest) -> dict[str, Any]:
    job = db.get(job_id)
    if not job or not job.get("result"):
        raise HTTPException(status_code=404, detail="Finished job not found")
    result = job["result"]
    clip = next((item for item in result["clips"] if item["id"] == clip_id), None)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    transcript_file = JOBS_DIR / job_id / "transcript.json"
    if not transcript_file.exists():
        raise HTTPException(status_code=409, detail="The transcript for this job is no longer on disk.")
    payload = json.loads(transcript_file.read_text(encoding="utf-8"))
    from .transcribe import words_from_payload

    words = words_from_payload(payload)
    start = float(request.start if request.start is not None else clip["start"])
    end = float(request.end if request.end is not None else clip["end"])
    if end - start < 3:
        raise HTTPException(status_code=422, detail="A clip must be at least 3 seconds long.")
    title = (request.title if request.title is not None else clip["title"]) if request.hook else ""

    source = result["video"].get("sourcePath") or result["video"].get("url")
    if not source or not Path(source).exists():
        candidates = list((CACHE_DIR / (result["video"].get("platform") or "").lower() / (result["video"].get("id") or "")).glob("source.*"))
        if not candidates:
            raise HTTPException(status_code=409, detail="The source video is no longer cached. Re-run the analysis or keep the media cache.")
        source = str(candidates[0])
    try:
        meta = render.render_clip(
            source,
            JOBS_DIR / job_id / "clips" / clip_id,
            start,
            end,
            [word for word in words if word.start >= start - 0.5 and word.end <= end + 0.5],
            title,
            preset=request.preset or CAPTION_PRESET,
            layout=request.layout,
            has_audio=True,
            public_path=f"{job_id}/clips/{clip_id}",
        )
    except render.RenderError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    updated = {
        **clip,
        **{key: meta[key] for key in ("title", "start", "end", "duration", "layout", "files")},
        "preset": request.preset or CAPTION_PRESET,
        "hook": request.hook,
    }
    result["clips"] = [updated if item["id"] == clip_id else item for item in result["clips"]]
    db.update(job_id, result=result, message=f"{clip_id} re-rendered")
    return updated


class ModelTestRequest(BaseModel):
    model: str = Field(pattern=r"^[a-z0-9.-]{1,40}$")


@app.get("/bench")
def run_benchmark() -> StreamingResponse:
    """Server-sent progress of the real PC benchmark (encode + CPU)."""
    from . import bench

    def stream():
        try:
            for event in bench.benchmark():
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as error:  # noqa: BLE001
            yield f"event: error\ndata: {json.dumps({'detail': str(error)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"cache-control": "no-cache", "x-accel-buffering": "no"})


@app.post("/models/test")
def test_model(request: ModelTestRequest) -> dict[str, Any]:
    """Transcribes 15 s of the bundled sample and finds a face: proves a model works on this PC."""
    from . import bench

    try:
        return bench.model_test(request.model)
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/posting/status")
def posting_status() -> dict[str, Any]:
    return publish.status()


@app.post("/publish/youtube")
def publish_youtube(request: PublishRequest) -> dict[str, Any]:
    job = db.get(request.jobId)
    if not job or not job.get("result"):
        raise HTTPException(status_code=404, detail="Finished job not found")
    clip = next((item for item in job["result"]["clips"] if item["id"] == request.clipId), None)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    video_path = JOBS_DIR / request.jobId / "clips" / request.clipId / "clip.mp4"
    try:
        return publish.upload_short(
            str(video_path),
            clip["title"],
            f"{clip['title']}\n\n{clip.get('reason', '')}".strip(),
            clip.get("hashtags", []),
            privacy=request.privacy if request.privacy in {"private", "unlisted", "public"} else "private",
        )
    except publish.PublishError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


def _free_port(host: str) -> int:
    import socket

    for port in range(API_PORT, API_PORT + API_PORT_RANGE):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            try:
                probe.bind((host, port))
                return port
            except OSError:
                continue
    raise SystemExit(f"Ports {API_PORT}-{API_PORT + API_PORT_RANGE - 1} are all in use. Close the other program or set PIPELINE_PORT.")


def serve() -> None:
    import ipaddress

    import uvicorn

    if not ipaddress.ip_address(API_HOST).is_loopback:
        raise SystemExit("PIPELINE_HOST must be a loopback address such as 127.0.0.1. The pipeline never listens on the network.")
    port = _free_port(API_HOST)
    security.publish_runtime(port)
    print(f"Clipfarm pipeline on http://{API_HOST}:{port}", flush=True)
    uvicorn.run(app, host=API_HOST, port=port, log_level="info")


__all__ = ["app", "serve", "render", "detect"]
