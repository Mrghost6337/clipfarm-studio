# Clipfarm Studio — pipeline audit

Date: 2026-11-22

## What exists today

| Area | State | Notes |
| --- | --- | --- |
| Marketing site | Works | Home, services, case studies, toolkit, GTA VI hub. Deployed on Cloudflare Sites. |
| Accounts + D1 | Works | Email/password, sessions, plans, onboarding; Hono Worker + D1. |
| Link analysis | Partial | `POST /api/clips` resolves YouTube/Twitch metadata, reads captions or chapters, stores scored cut points and caption cues. **No media is downloaded or encoded.** |
| Caption fallback | Partial | Browser Whisper (`transformers.js` tiny) for a local file; transcript paste. |
| Auto-clipper (Studio) | Works in-browser only | MediaBunny + WebCodecs renders real 1080×1920 MP4s with face crop and burned captions, for a file the user already downloaded. |
| Face tracking (browser) | Works | MediaPipe BlazeFace from CDN, 7 samples, median/MAD outlier filter. |
| Server-side transcode | **Missing** | The Cloudflare Worker cannot run ffmpeg, yt-dlp, Python or a long job. |
| Channel listing | **Missing** | Only single links are resolved. No channel/profile video grid. |
| Download / cache | **Missing** | No `yt-dlp`, no media cache, no disk usage view. |
| Server transcription | **Missing** | No faster-whisper, language detection or word timestamps. |
| Clip selection | Partial | Transcript-only heuristic scorer, no LLM, no audio energy, no sentence-boundary snap. |
| Vertical render | **Missing** | No ffmpeg ASS karaoke, no hook title, no loudness normalisation, no server face crop. |
| Job queue | **Missing** | Requests are synchronous; no states, resume, cancel or SSE. |
| Posting | **Missing** | Nothing implemented. Download + copy caption only. |
| Setup / system check | **Missing** | README assumes `bun` only. |
| Tests | **Missing** | No pipeline smoke test. |

## Root cause

The product is deployed as a static SPA plus a Cloudflare Worker. Every heavy
step the brief asks for (yt-dlp, faster-whisper, OpenCV, libass, ffmpeg,
Ollama) needs a real machine. Cloudflare Workers cannot run them, and Sites has
no persistent filesystem, Python runtime or long-lived processes.

**Decision:** keep the Cloudflare site as the product UI, and add a **local
pipeline service** (Python + FastAPI + SQLite) that the browser talks to at
`http://127.0.0.1:8787`. The hosted site degrades honestly: it shows a setup
panel when the local service is not running. Nothing in the local pipeline
needs a paid service or an API key.

```
browser (Vite/React, hosted or local)
        │  fetch + SSE
        ▼
pipeline/api.py  (FastAPI, 127.0.0.1:8787)
        │  SQLite job queue, one worker thread
        ▼
yt-dlp → ffmpeg/ffprobe → faster-whisper → heuristics/LLM → OpenCV YuNet → ffmpeg + libass
```

## Environment facts (this VM)

- No root: `apt-get` exists but cannot install. Static ffmpeg 7.0.2 (with
  libass, `ass`, `subtitles`, `sendcmd`) is vendored in `.tools/`.
- Python 3.12 venv in `.venv/`; `yt-dlp`, `faster-whisper`,
  `opencv-python-headless`, FastAPI, Google API client installed there.
- No Ollama binary and no GPU. The LLM step is therefore **optional**, with a
  pure-heuristic fallback. Ollama and OpenAI-compatible free endpoints are
  supported through `.env` when the user has them.
- The VM is a datacenter IP. YouTube commonly answers with a bot check; the
  pipeline supports a cookies file / `YTDLP_COOKIES_FROM_BROWSER` and reports
  the failure clearly instead of pretending.

## Gaps to close, in order

1. **Ingest:** channel/profile listing and single-video metadata via yt-dlp,
   formats ≤1080p, cache, readable failures, cookies, update command.
2. **Transcription:** audio extraction, faster-whisper with VAD + word
   timestamps + language auto-detect, JSON persistence, whisper.cpp fallback.
3. **Selection:** sentence-boundary candidate windows, audio energy, heuristic
   score, optional Ollama/OpenAI-compatible JSON, overlap dedupe, top N.
4. **Render:** YuNet face sampling with EMA smoothing, 9:16 crop, blurred
   background when no face, one ffmpeg pass, loudnorm, faststart, NVENC/VAAPI
   when present.
5. **Subtitles:** word-level ASS karaoke (2–4 words), safe zone, hook title,
   style presets, SRT/VTT export, bundled OFL fonts.
6. **Posting:** download/copy/open-upload always; YouTube Shorts upload when
   credentials exist; TikTok inbox and Instagram marked optional with honest
   capability text. No login automation.
7. **Jobs + UI:** SQLite states, SSE progress, cancel, retry, resume, library,
   cache usage/clear, system check page, smoke test.

## Acceptance mapping

| # | Criterion | Where |
| --- | --- | --- |
| 1 | Channel link lists videos | `pipeline/ingest.py`, `/local` page |
| 2 | Single video → ≥3 vertical clips | `pipeline/worker.py` |
| 3 | Non-English language auto-detected | faster-whisper, verified with Dutch sample |
| 4 | Word-synced captions in safe zone | `pipeline/subtitles.py` |
| 5 | Face tracking, no jitter | `pipeline/face.py` + `render.py` |
| 6 | Hook title + 3–5 hashtags | `pipeline/detect.py` (LLM or heuristic) |
| 7 | Download/copy always, YouTube optional | `/local` UI + `pipeline/publish.py` |
| 8 | Zero paid services / keys | heuristic fallback, local everything |

## Test evidence (2026-11-22)

Environment: no root, Python 3.12 venv, static ffmpeg 7.0.2 with libass,
OpenCV 5.1 YuNet, faster-whisper 1.2.1, yt-dlp 2026.10.26. No paid service and
no API key was used.

### Ingest

| Input | Result |
| --- | --- |
| `youtube.com/@MrBeast` | 5 real videos, titles, 1080p thumbnails, durations, approximate upload dates (2026-11-15, …) |
| `twitch.tv/shroud/videos` | 4 VODs with titles, thumbnails and durations (3h–7h) |
| `tiktok.com/@khaby.lame` | 4 videos with titles, thumbnails, durations and dates |
| local `pipeline/sample/sample.mp4` | accepted for the smoke test |

YouTube channel roots are normalised to `/videos`; without that yt-dlp returns
the channel's tabs instead of videos. Bot checks are mapped to a message that
names `YTDLP_COOKIES` / `YTDLP_COOKIES_FROM_BROWSER`.

### End-to-end smoke test

`pipeline/sample/sample.mp4` is a 43-second Dutch talking-head clip (Piper TTS,
CC0 generated image, slow horizontal pan so the crop has to follow the face).

```
.venv/bin/python -m pipeline.cli selftest
language: nl (99.9%)
clips: 3
SMOKE TEST PASSED
```

Each clip: 1080×1920, 30 fps, H.264 + AAC, 11.7–13.7 s, captions.ass +
captions.srt + captions.vtt, poster, hook title and 5 hashtags
(`#shorts #nederlands #nederland #clips #viral`). Face detection on the rendered
clips puts the face centre at x=0.49–0.55 of the frame across the cut, so the
tracking follows the moving source without jitter.

Screenshots: `artifacts/local-page-final.png` (the `/local` UI with three
finished clips), `artifacts/clip-title.jpg` (hook title + first caption),
`artifacts/clip-caption-final.jpg` (safe-zone karaoke caption).

Final demo job `2234dd29d171` re-ran on `medium` (98% Dutch):

| # | Cut | Hook title | Score |
| --- | --- | --- | --- |
| 01 | 0.0–14.6 s | Ik probeerde te ontsnappen met een | 100 |
| 02 | 14.3–28.8 s | De achtervolging werd alleen maar erger | 75 |
| 03 | 28.8–43.2 s | Rende ik weg klopdikte en ik | 38 |

All three are 1080×1920 H.264/AAC, face-layout, with `.ass`, `.srt`, `.vtt`
and a poster. A second `selftest` after the final detection/subtitle changes
also returned `SMOKE TEST PASSED`.

### UI

`bun run typecheck` and `bun run build` pass. The `/local` page reports every
required dependency green, shows disk usage, streams job progress over SSE and
renders the three clips with MP4/SRT/VTT/Caption/TikTok actions. In development
Vite proxies `/pipeline-api` to the service; the production build falls back to
`http://127.0.0.1:8787` and shows setup instructions when it is offline.

### Still open

- Whisper `small` mishears parts of the synthetic Piper voice (real human Dutch
  is better). `WHISPER_MODEL=medium` fixed almost all of it in the demo job;
  short videos also fall back to equal word-aligned windows so they still
  produce three clips.
- YouTube downloads from this datacenter IP can still hit a bot check; cookies
  are supported and the error is human-readable.
- YouTube Shorts upload is implemented but could not be exercised without OAuth
  credentials. TikTok/Instagram direct post need approved developer apps, so the
  UI always offers download + copy caption + the official upload page.
- Long-VOD audio-first download is implemented (`duration > 30 min`), but the
  test sample is 43 s, so that branch is untested here.
