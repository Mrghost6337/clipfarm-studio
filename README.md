# Clipfarm Studio

A site for the fictional "Clipfarm Studio", an AI clip-farming studio for
Twitch, YouTube and TikTok channels: send a VOD, get vertical clips back. The
home page keeps the template's warm off-white column grid: a floating white pill
nav with a Services dropdown, an avatar badge over a two-line headline, a dark
"Start free" pill with a hand-drawn "It's free!" arrow, creator avatars and
stars, a marquee of outcome pills and three check statements over an apricot
glow, then a "Clipping for" marquee of real creator chips (channel picture,
then name), services, the
pipeline, stats, a toolkit marquee, case studies, a creator quote, an FAQ and a
closing CTA. Behind it:

- **Accounts** (`/signup`, `/login`): email/password accounts, or Google when it
  is configured. Everything below requires being signed in.
- **Setup** (`/onboarding`): two steps — channel, platform, audience size and
  cadence, then clip focus and caption style. Skippable, and editable later from
  Settings.
- **Choose a plan** (`/plans`): Starter ($19/mo, 20 clips), Creator ($49/mo,
  60 clips) and Network ($129/mo, 200 clips), monthly or quarterly (20% off).
  Prices are stored in USD and shown in the visitor's detected or chosen
  currency. Picking one lands you on the dashboard.
- **Region & billing settings** (`/dashboard/settings`): country, language and
  currency are auto-detected from the browser (locale plus time zone) and can be
  overridden; the plan card shows the price, billing period and renewal in that
  currency. The page also shows and reopens the cookie choice.
- **Dashboard** (`/dashboard`): its own app shell — sidebar navigation, account
  menu and logout, no marketing header or footer. Five pages:
  - **Overview**: KPI cards, a 30-day chart, recent clips, sources, activity,
    plan usage and (for the admin account) a studio overview.
  - **Clips**: every clip with search, status and platform filters, copy
    caption, SRT download, posted/archived state and delete.
  - **Sources**: submit a link, watch its status, retry, paste a transcript,
    delete a source.
  - **Studio**: the pipeline stage by stage with the open-source tool each one
    uses, the real counts it produced for your workspace, an export bench that
    downloads SRT, WebVTT, styled ASS, EDL, MLT, an Editly spec, an ffmpeg
    script or the raw clip JSON, a **browser cutter** that trims your local VOD
    into a real MP4, a free **Whisper transcriber** for files without captions,
    and an **agent console** that runs four checks on the selected clip.
  - **Analytics**: clips per day, platform split, hook-score bands, top clips.
  - **Settings**: channel setup, region/language/currency, plan and billing,
    cookie preferences, account, logout.
- **GTA VI launch** (`/gta-6`): the launch hub, with the GTA VI mark and banners,
  a creator list that links to their GTA VI uploads, the six moments every
  Leonida VOD has, and the analyzer for signed-in accounts. GTA vocabulary
  ("wanted level", "busted", "heist", "Vice City") scores higher in detection.
  The hero uses Rockstar's official Trailer 2 (embedded from their channel) and
  its key art from YouTube's CDN; no invented GTA artwork ships in this repo.
  The page opens with a cinematic hero (live badge, hero stats, glowing trailer
  card and a facts marquee), then an on-page anchor rail, the three-step
  pipeline, the creator grid, a scroll-snap board of six 9:16 moment posters
  with example captions, and a detection panel that shows a sample transcript
  window, its highlighted signals and a score breakdown. Both the moment board
  and the detection panel are labelled as illustrative examples, not real VODs.
- **Clip share page** (`/clip/:id`): a public page per clip with the source
  embedded at the cut, the transcript excerpt, its caption cues, an SRT download
  and a copyable share link. Opening it records a real view.
- **Services** (`/services`, `#highlights` etc.): six clip-pipeline services
  with outcomes and deliverables, the three monthly clip packages and a
  comparison table.
- **The pipeline** (`/pipeline`): pick your channel size to see the focus, tick
  off every step (saved on the device), with a sticky progress bar.
- **Toolkit** (`/toolkit`): the 22 open-source projects in the stack, grouped by
  job and linked to GitHub.
- **Case studies** (`/case-studies`, `/case-studies/:slug`), **About**
  (`/about`), a 404 and a live style guide at `/styleguide`.

## Run it

```sh
bun install
bun run dev        # http://localhost:3000 (Vite + the Worker in workerd)
bun run build      # dist/client (assets) + dist/clipfarm_studio/index.js (Worker)
bun run typecheck
```

## Local clipping pipeline (free, runs on your machine)

The hosted site is a Cloudflare Worker: it cannot run ffmpeg, yt-dlp, Whisper or
OpenCV. The real end-to-end pipeline is a **local Python service** in
`pipeline/`, and the page at **`/local`** drives it. Nothing needs a paid
service or an API key.

```sh
bash scripts/setup.sh                 # venv, static ffmpeg + libass, YuNet, fonts
.venv/bin/python -m pipeline.cli serve    # http://127.0.0.1:8787
bun run dev --port 3000                   # open http://localhost:3000/local
```

The page works on the hosted deployment too: it reports the service as offline
and shows these commands, because a browser on your machine is the only place
the heavy work can run.

**Pipeline stages** (`pipeline/`):

| Stage | Module | Free tool |
| --- | --- | --- |
| List a channel/profile or read a video | `ingest.py` | yt-dlp (`extract_flat`, paginated) |
| Download up to 1080p, cached by video id | `ingest.py` | yt-dlp + ffmpeg merge; audio-first for 30 min+ VODs |
| Transcribe, word timestamps, language auto-detect | `transcribe.py` | faster-whisper + VAD, 16 kHz WAV |
| Find 15–60 s moments on sentence boundaries | `detect.py` | silence/gap windows, signal words, loudness; optional Ollama or any OpenAI-compatible free tier |
| Face tracking and 9:16 crop | `face.py`, `render.py` | OpenCV YuNet, 5 fps samples, EMA + dead zone + pan speed |
| 1080×1920 render, loudness, faststart | `render.py` | one ffmpeg pass, libx264 (NVENC when present), loudnorm −14 LUFS |
| Word-by-word karaoke captions + hook title | `subtitles.py` | ASS/libass, 2–3 words per phrase, safe zone, SRT/VTT exports |
| Optional YouTube Shorts upload | `publish.py` | official Data API v3 `videos.insert` (private until the project is audited) |

Every job is a row in SQLite (`pipeline/data/pipeline.sqlite3`) with
`queued → downloading → transcribing → analyzing → rendering → done/failed`.
One worker thread does the heavy work, progress streams over SSE, jobs survive a
restart, and cancel/retry/delete are in the UI. Downloaded sources are cached,
rendered clips and captions stay in the library, and **Clear media cache**
removes only the sources.

### CLI

```sh
.venv/bin/python -m pipeline.cli check        # dependency report
.venv/bin/python -m pipeline.cli run URL      # full pipeline in the terminal
.venv/bin/python -m pipeline.cli selftest     # 49 s Dutch sample → 3 clips, asserts 1080×1920 + captions
.venv/bin/python -m pipeline.cli update-ytdlp # yt-dlp breaks when old
.venv/bin/python -m pipeline.cli auth-youtube # optional upload scope
```

The bundled sample (`pipeline/sample/sample.mp4`) is a 49-second Dutch
talking-head clip: it exercises language detection, face tracking, sentence
boundaries and karaoke captions without touching YouTube. Customise with
`.env` (copy `.env.example`): Whisper model/device, clip lengths, caption
preset, LLM provider, cookies for YouTube bot checks, YouTube OAuth paths.

### Honest limits

- YouTube from a datacenter IP often gets a bot check. Set `YTDLP_COOKIES` or
  `YTDLP_COOKIES_FROM_BROWSER` in `.env`; the error message says so.
- TikTok/Instagram direct posting require approved developer apps and a public
  video URL. The UI always gives Download + Copy caption + the official upload
  page; YouTube upload works once OAuth is configured. No login automation.
- Caption editing before render is a caption **preset** choice at queue time;
  the SRT/VTT/ASS are exported for edits in an editor.
- CJK/RTL captions use the bundled Noto Sans fallback; a full Noto CJK face is
  not shipped (it is ~16 MB) — install one and point fontconfig at it if needed.

### API

`GET /health`, `GET /system`, `GET /config`, `POST /ingest`, `POST /jobs`,
`GET /jobs`, `GET /jobs/:id`, `GET /jobs/:id/events` (SSE), `POST
/jobs/:id/cancel`, `POST /jobs/:id/retry`, `DELETE /jobs/:id`, `GET|DELETE
/cache`, `POST /ytdlp/update`, `GET /posting/status`, `POST /publish/youtube`.
Files are served from `/files/<job>/clips/<n>/`.

## Consent and popups

A cookie banner appears on the first visit and stores the choice in
`localStorage` (`clipfarm.consent`). "Essential only" keeps just the sign-in
cookie and saved preferences; "Accept all" also lets the one-time GTA VI launch
card appear on marketing pages. Settings → Privacy shows the choice and reopens
the banner (`clipfarm:cookies`). The launch card waits 12 seconds, closes on Escape, can be silenced for good and never appears on dashboard pages or on the GTA VI hub it promotes.

## Real clips, no demo numbers

The dashboard shows **only rows the pipeline wrote**. A fresh account sees zeros
and empty states until it submits a VOD; there is no generated dataset, no
`sample` flag and nothing to seed.

`POST /api/clips` with a YouTube, Twitch VOD or Twitch clip link:

1. **Resolve** the link (`src/worker/clips.ts`). Every common YouTube shape
   works — `watch?v=`, `youtu.be`, `/shorts/`, `/live/`, `/embed/`, `/v/`,
   `m.`/`music.` hosts, share text with quotes and encoded links. Metadata comes
   from YouTube's oEmbed endpoint and the watch page; Twitch gives the clip/VOD
   page metadata. Playlists and channel links get a clear message instead of a
   fake result.
2. **Read the timed text.** Captions are fetched when the platform serves them.
   YouTube now gates its caption files behind a proof-of-origin token for
   server-side clients, so when the watch page has no usable track the worker
   asks public Piped transcript instances for the signed captions, falling back
   to the creator's chapter stamps from the description. If neither exists, the
   source is saved as `needs_transcript` and the UI offers the free on-device
   Whisper transcriber (which fills the transcript and runs detection) or a
   pasted transcript — never a generic “could not be analyzed” error.
3. **Detect** (`src/shared/clips.ts`). Transcript windows of ~14–52 seconds are
   scored on laughter/applause markers, shock and claim words, exclamations,
   questions and speech density; the strongest non-overlapping windows become
   clips. With chapters, each chapter is scored on its title and length.
4. **Store** the source and its clips in D1. Every clip gets a title from the
   words that were actually spoken, a hook score, its exact start/end and its
   caption cues.

If a video has neither captions nor chapter markers, the source is kept as
`needs_transcript` and the same detector runs on a transcript you paste (VTT,
SRT or `0:12 text` lines) or generate with Whisper. On YouTube: open the video →
**…more** → **Show transcript** → copy.

The Piped fallback is a public community service, so its availability is not
under our control. When it is down, the link still resolves and is saved with
its real title and thumbnail; the transcriber/paste path takes over.

**Exports** (`src/shared/exports.ts`, `GET /api/clips/:id/export/:format`) are
real files generated from the clip's own cut and cues: SRT, WebVTT, styled ASS,
a CMX3600 EDL, an MLT project for Shotcut/Kdenlive, an Editly JSON spec, an
ffmpeg script that downloads with yt-dlp and crops to 9:16, and the clip as
JSON. Every download is counted in `clip_events`.

**Real cutting in the browser** (`src/lib/clipRender.ts`): the Studio's cutter
uses [MediaBunny](https://github.com/Vanilagy/mediabunny) and the browser's
WebCodecs to trim a local copy of the VOD between the clip's exact start and
end. A framed render re-encodes to 1080×1920 (TikTok/Reels/Shorts), 1080×1080
(feed) or 1920×1080 (YouTube), with the clip's captions burned into the pixels
and, when a speaker is found, a face-aware crop instead of a blind centre crop.
Three caption styles ship — **Bold block**, **Lime highlight** and **Clean
outline** — each with top/bottom placement, a safe lower-third and a soft scrim
where it helps readability. Every render also captures a poster frame so the
queue shows a real thumbnail. The result is a normal MP4 you can download; the
file never leaves the tab. This needs a browser with WebCodecs (Chrome, Edge,
recent Safari) and an MP4/MOV/WebM source. There is no upload, no server-side
ffmpeg and no fake render.

**Face-aware framing** (`src/lib/faceTrack.ts`): seven frames from the selected
cut are drawn to a canvas and passed to MediaPipe's BlazeFace model, loaded
lazily from jsDelivr (the wasm binary is ~15 MB, cached by the browser; the
model itself is ~230 KB). The largest face in each frame is weighted by its
area and detector score, then a median + MAD filter drops cutaway shots before
the crop centre is averaged — so a 16:9 podcast is framed on the speaker instead
of the middle of the desk, and a reaction shot cannot drag the frame sideways.
If the CDN or model is unavailable, or no face is found, the render falls back
to the centre crop and says so in the result. Frames are never uploaded.

**Auto-clipper / clipping desk** (`src/components/AutoClipper.tsx`): drop a
downloaded VOD or livestream, transcribe it with the local Whisper worker, then
run the same `detectFromTranscript` scorer used by link analysis. The desk lists
up to eight non-overlapping moments with title, timestamp, score and excerpt.
Each moment has a **live preview** (the source video played between its exact
in/out points with a DOM caption overlay that mirrors the chosen style), an
editable **trim** (start/end in seconds), and a **Render** action. **Render all**
runs the queue sequentially with per-clip progress, a poster thumbnail, a size
and duration, and a time estimate; **ZIP** bundles every finished clip into one
download (a dependency-free writer in `src/lib/zip.ts`). Output can be 9:16, 1:1,
16:9 or the untouched source, with Bold / Highlight / Clean captions at the top
or bottom. Settings are remembered on the device, and the transcript is
browsable in full and downloadable as SRT. A 44-second talking test clip
transcribed and ranked in ~12 seconds and its 22-second top moment rendered in
~2.4 seconds on the test machine. A silent gameplay VOD has no speech for the
scorer, and a long stream takes on-device Whisper time — the UI says so before
you start.

**Free transcription** (`src/workers/whisper.worker.ts`, `src/lib/transcribe.ts`):
Whisper tiny (MIT) runs through transformers.js in a Web Worker. The audio is
decoded locally with MediaBunny, mixed to 16 kHz mono and transcribed in
30-second slices, so a long VOD never has to fit in memory. Model weights
(~75 MB) download once from Hugging Face and are cached by the browser; there
is no API key, account or upload. Pick the spoken language (English by
default); the result is timestamped, downloadable as SRT or `0:12 text`, and
can be pasted straight into the analyzer for a source without captions. A word
can occasionally fall on a 30-second boundary, and a one-hour VOD takes a few
minutes of on-device work.

**Agents** (`src/shared/agents.ts`): the Studio's four agents are deterministic
code over the stored clip — QA (cut length, cue order, cues inside the cut,
coverage, words, score), Caption (timed lines, line length, density, formats),
Hook (opening line, filler start, reaction signal) and Packaging (caption
files, editor project, ffmpeg script, source link). They run instantly on the
client and show their actual findings; no model is called and nothing is
invented.

**Limits of a Worker-only pipeline:** it cannot download video/audio, so
server-side clips are cut points plus captions. The share page plays the source
at the exact cut (YouTube embed), and the SRT is a real file you can drop into
an editor. Face tracking, audio stems and batch rendering still need the
desktop pipeline; that pipeline now exists in `pipeline/` and runs the whole
flow locally (see "Local clipping pipeline" above). Transcription also runs on
the device in the Studio's browser worker.

Plans are enforced: analyzing stops at the monthly clip limit (`PLANS` in
`src/shared/account.ts`), and the check counts real clips in the current month.

## Edit it

- **`CLAUDE.md` is the UI/theme handoff for Claude Code**: product map, exact
  design tokens, every component and screen, the API contracts and the notes for
  building the Windows app. Screenshots live in `docs/ui/`.
- **`src/content.ts` holds every marketing string and all seed data**: `SITE`,
  `NAV`, `HERO`, `CLIENTS`, `HOME`, `SERVICES`, `ENGAGEMENTS`, `PLAN_PAGE`,
  `CASES`, `FAQS`, `ABOUT`, `GTA`, `TOOLS`, `TOOLKIT`, `FOOTER`. Plan names, prices and
  limits come from `PLANS` in `src/shared/account.ts`.
- **Photos go through `IMAGES` in `src/content.ts`.** The founder and creator
  avatars are real licensed portraits (Unsplash), and the GTA VI creator list
  uses freely licensed Wikimedia Commons portraits or the creators' own channel
  pictures, credited on `/gta-6`. Case-study photos are still generated
  placeholders; swap them for your own photography and update the `alt` text.
- **Channel marks** for the fictional case studies are invented SVG marks in
  `src/components/ClientLogos.tsx`. The home page's "Clipping for" marquee and
  the "Channels that stopped editing at 2am" cards use real creators from
  `CREATORS` in `src/content.ts`: their name, channel handle, platform, channel
  description and tags. Their profile pictures live in
  `public/images/creators/pfp-*.jpg` (downloaded from each creator's public
  channel avatar, not hotlinked). Every card links to the creator's channel and
  the section carries a short note that Clipfarm is not affiliated with them.
- Design tokens (colours, fonts, radii, shadows, motion) are in
  `src/styles.css` under `@theme`; components in `src/components/`, marketing
  pages in `src/pages/`, dashboard pages in `src/pages/app/`. Fonts: Inter Tight
  and Caveat from Google Fonts.
- Tune detection in `src/shared/clips.ts` (`SIGNALS`, `GTA_SIGNALS`, window sizes,
  `MAX_CLIPS`).

## Accounts, plans and data

Users, sessions, onboarding profiles and plans live in D1 (binding `DB`), next
to the pipeline's `sources`, `clips` and `clip_events` tables. Passwords are
PBKDF2-SHA256 with a per-user salt, session tokens are stored hashed and kept in
an HttpOnly, SameSite=Lax cookie. The Worker creates and migrates its tables on
the first request, so local dev needs no migration step.

The admin account is the one whose email matches `ADMIN_EMAIL` in
`src/worker/auth.ts` — by default `snelle.edward@gmail.com`. Sign up with that
address (or change the constant to yours) and Overview adds the studio overview:
accounts, paid plans, MRR, clips, sources and the newest sign-ups. Everyone else
sees only their own rows.

Google sign-in stays available but inactive until you set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` on the Worker. Register
`http://localhost:3000/api/auth/google/callback` and your deployed
`https://<domain>/api/auth/google/callback` as authorised redirect URIs. Until
then the Google button explains what is missing and email accounts work.

| Route | Does |
| --- | --- |
| `GET /api/auth/me` | the signed-in user, or `null` |
| `POST /api/auth/signup` | 201 with a user and a session cookie; 400/409 on bad or taken email |
| `POST /api/auth/login` | 200 with a user and a session cookie; 401 on a bad password |
| `POST /api/auth/logout` | clears the session and the cookie |
| `POST /api/auth/profile` | saves onboarding; `{ "skip": true }` marks it done |
| `POST /api/auth/plan` | `{ planId, billing }`; 400 on an unknown plan |
| `GET /api/auth/google`, `/api/auth/google/callback` | OAuth when credentials are set |
| `GET /api/dashboard` | real totals, 30-day series, platforms, recent clips/sources, activity, admin block |
| `POST /api/clips` | `{ url, transcript? }` → source + clips; 422 `needsTranscript` when there is no timed text |
| `GET /api/clips` | the account's clips with view/download counts |
| `GET /api/clips/sources` | submitted VODs and their status |
| `POST /api/clips/sources/:id/transcript` | runs detection on a pasted transcript |
| `POST /api/clips/sources/:id/retry` | re-reads the link and detects again |
| `DELETE /api/clips/sources/:id` | removes a source, its clips and their events |
| `GET /api/clips/:id` | public clip payload for a share page |
| `POST /api/clips/:id/view` | records a real clip-page view |
| `GET /api/clips/:id/captions.srt` | downloads captions and records the download |
| `PATCH /api/clips/:id` | `{ status: "ready" \| "posted" \| "archived" }` |
| `DELETE /api/clips/:id` | removes one clip |

Deploying with accounts needs a real D1 database: replace the placeholder
`database_id` in `wrangler.jsonc` with the one you provisioned.

## State and the Worker

Visitor state stays in `localStorage` (`clipfarm.*` keys): pipeline ticks and
stage, billing period and the newsletter sign-up. The Worker
(`src/worker/index.ts`) mounts `/api/auth`, `/api/dashboard`, `/api/clips` and
the newsletter:

| Route | Does |
| --- | --- |
| `GET /api/health` | `{ ok: true }` |
| `POST /api/subscribe` | 201 or 400 (validated, not stored) |

Unknown `/api/*` routes return a JSON 404.

Every tool on `/toolkit` is open source and keeps its own licence. Check the
licence before you ship a project commercially.
