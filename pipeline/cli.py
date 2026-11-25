"""Command line entry point.

    python -m pipeline.cli serve          # local API on 127.0.0.1:8787
    python -m pipeline.cli check          # dependency report
    python -m pipeline.cli run URL        # run one video through the pipeline
    python -m pipeline.cli selftest       # end-to-end smoke test
    python -m pipeline.cli update-ytdlp
    python -m pipeline.cli auth-youtube
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from . import db, ingest, publish, worker
from .config import JOBS_DIR, ROOT


def _wait(job_id: str, timeout: float = 3600) -> dict:
    started = time.time()
    last = ""
    while True:
        job = db.get(job_id) or {}
        line = f"{job.get('stage'):<12} {job.get('progress', 0) * 100:5.1f}%  {job.get('message') or ''}"
        if line != last:
            print(line, flush=True)
            last = line
        if job.get("status") in {"done", "failed", "cancelled"}:
            return job
        if time.time() - started > timeout:
            raise TimeoutError("Job did not finish within the timeout")
        time.sleep(1.5)


def cmd_run(args: argparse.Namespace) -> int:
    db.init()
    job = db.create(args.url, "video", preset=args.preset, max_clips=args.max_clips)
    print(f"job {job['id']} queued for {args.url}")
    worker.worker.start()
    done = _wait(job["id"])
    if done["status"] != "done":
        print(f"FAILED: {done.get('error') or done.get('message')}", file=sys.stderr)
        return 1
    for clip in done["result"]["clips"]:
        print(f"\n{clip['title']}  [{clip['start']:.1f}-{clip['end']:.1f}s, score {clip['score']}]")
        print(f"  {clip['files']['mp4']}")
        print(f"  {' '.join(clip['hashtags'])}")
    print(f"\nlanguage: {done['result']['language']} ({done['result']['languageProbability']:.0%})")
    return 0


def cmd_selftest(args: argparse.Namespace) -> int:
    sample = Path(args.video) if args.video else ROOT / "pipeline" / "sample" / "sample.mp4"
    if not sample.exists():
        print(f"No sample video at {sample}. Pass --video PATH.", file=sys.stderr)
        return 2
    db.init()
    job = db.create(str(sample), "video", preset="bold", max_clips=args.max_clips or 3)
    worker.worker.start()
    print(f"smoke test job {job['id']} on {sample}")
    done = _wait(job["id"], timeout=3600)
    if done["status"] != "done":
        print(f"FAILED: {done.get('error') or done.get('message')}", file=sys.stderr)
        return 1
    result = done["result"]
    clips = result["clips"]
    failures = []
    if len(clips) < 3:
        failures.append(f"expected at least 3 clips, got {len(clips)}")
    for clip in clips:
        path = JOBS_DIR / job["id"] / "clips" / clip["id"] / "clip.mp4"
        if not path.exists():
            failures.append(f"{path} missing")
            continue
        info = ingest.probe(str(path))
        if (info["width"], info["height"]) != (1080, 1920):
            failures.append(f"{clip['id']} is {info['width']}x{info['height']}, expected 1080x1920")
        srt = path.with_name("captions.srt")
        if not srt.exists() or srt.stat().st_size < 20:
            failures.append(f"{clip['id']} has no SRT")
        if not clip.get("hashtags") or not 3 <= len(clip["hashtags"]) <= 5:
            failures.append(f"{clip['id']} hashtags: {clip.get('hashtags')}")
        if not clip.get("title"):
            failures.append(f"{clip['id']} has no hook title")
    if not result.get("language"):
        failures.append("language was not detected")
    print(json.dumps({"job": job["id"], "language": result.get("language"), "clips": len(clips), "failures": failures}, indent=2))
    if failures:
        print("SMOKE TEST FAILED", file=sys.stderr)
        return 1
    print("SMOKE TEST PASSED")
    return 0


def cmd_check(_args: argparse.Namespace) -> int:
    from .system import checks

    report = checks()
    for item in report["checks"]:
        mark = "OK  " if item["ok"] else ("FAIL" if item["required"] else "SKIP")
        print(f"[{mark}] {item['label']:<28} {item['detail']}")
    print("\nAll required dependencies present" if report["ok"] else "\nMissing required dependencies")
    return 0 if report["ok"] else 1


def cmd_setup(_args: argparse.Namespace) -> int:
    import subprocess

    scripts = ROOT / "scripts" / "setup.sh"
    return subprocess.call(["bash", str(scripts)])


def cmd_update(_args: argparse.Namespace) -> int:
    result = ingest.update_ytdlp()
    print(result["output"])
    return 0 if result["ok"] else 1


def cmd_auth(_args: argparse.Namespace) -> int:
    try:
        print(json.dumps(publish.auth_youtube(), indent=2))
        return 0
    except publish.PublishError as error:
        print(str(error), file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("serve", help="start the local API")
    sub.add_parser("check", help="check dependencies")
    sub.add_parser("setup", help="install dependencies")
    sub.add_parser("update-ytdlp", help="update yt-dlp")
    sub.add_parser("auth-youtube", help="connect YouTube upload")

    run = sub.add_parser("run", help="clip one video")
    run.add_argument("url")
    run.add_argument("--preset", default="bold")
    run.add_argument("--max-clips", type=int, default=5)

    test = sub.add_parser("selftest", help="end-to-end smoke test")
    test.add_argument("--video")
    test.add_argument("--max-clips", type=int, default=3)

    args = parser.parse_args(argv)
    if args.command == "serve":
        from .api import serve

        serve()
        return 0
    if args.command == "check":
        return cmd_check(args)
    if args.command == "setup":
        return cmd_setup(args)
    if args.command == "update-ytdlp":
        return cmd_update(args)
    if args.command == "auth-youtube":
        return cmd_auth(args)
    if args.command == "run":
        return cmd_run(args)
    if args.command == "selftest":
        return cmd_selftest(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
