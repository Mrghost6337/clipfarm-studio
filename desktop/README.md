# Clipfarm Studio for Windows

The desktop app is Electron 45 (Chromium 156). It reuses the website's React UI and
`src/styles.css` tokens without changes, and it bundles the local Python pipeline as a
sidecar. Clips are made on this PC. The account (sign-in, clip details, share pages)
lives on the website's Worker.

> Status: built and tested on Windows Server 2025 (GitHub Actions) and on Linux.
> It has **not** been tested on a consumer Windows 10/11 PC yet. The installer is
> **unsigned** until there is a code-signing certificate.

## Architecture

```
Clipfarm Studio.exe (Electron main, desktop/src/main)
├─ app://clipfarm            privileged protocol (protocol.ts)
│   ├─ /…                    bundled renderer (dist/renderer, from src/desktop + src/pages)
│   ├─ /api/*                proxy to the Worker; adds the Bearer token, strips cookies,
│   │                        caches /api/auth/me for offline starts
│   ├─ /pipeline-api/*       proxy to the sidecar; adds the per-launch token
│   └─ /models/web/, /vendor bundled MediaPipe, ONNX Runtime, fonts, sounds
├─ preload (contextBridge)   typed IPC only (src/shared/ipc.ts validates every call)
├─ sidecar.ts                starts python -m pipeline.cli serve on 127.0.0.1:8787–8791,
│                            health checks it, restarts it after a crash, stops it on quit
├─ auth.ts + vault.ts        browser sign-in (PKCE S256 + state, clipfarm:// or loopback),
│                            token encrypted with safeStorage (DPAPI), sliding 30-day renewal
├─ models.ts                 Whisper downloads: pinned revision, SHA-256 per file, Range
│                            resume, disk check, atomic install, test transcription
├─ pccheck.ts                hardware report, benchmark, model recommendation
├─ jobs.ts                   keeps the PC awake during jobs, notifications, clip-detail
│                            sync to the account, browser pairing prompts
└─ updater.ts                electron-updater against the public releases repository
```

Security: `contextIsolation`, `sandbox`, no `nodeIntegration`, a strict CSP on every
response, navigation and `window.open` locked to the app origin (external links go to the
system browser), single-instance lock, minimum window 1200×760. The pipeline only binds
127.0.0.1, checks the Host header, allows only listed origins and needs a token on every
route except `GET /health` and the pairing handshake (see `pipeline/security.py`).

## Where data lives

All under `%LOCALAPPDATA%\Clipfarm` (never the install folder). `CLIPFARM_DATA_DIR`
overrides it for tests.

| Folder | Contents |
| --- | --- |
| `app\` | Chromium profile (no account cookies are used) |
| `vault\` | Account token, encrypted with Windows DPAPI via safeStorage |
| `pipeline\` | Jobs database, downloads, rendered clips |
| `models\` | Whisper models chosen during setup |
| `downloads\` | Partial model downloads (resumable) |
| `logs\` | `main.log`, `pipeline.log` (tokens are redacted) |
| `state.json` | First-run step, choices, sound settings, accepted terms versions |

Uninstalling keeps this folder, so a reinstall keeps clips and models. Settings → Storage
can delete it.

**Stays on this PC:** videos, rendered clips, transcripts, models.
**Synced to the account:** clip titles, times, scores, short transcript excerpts and caption
cues (for share pages), profile picture, work mode, accepted terms versions, device name.

## Develop

From the repo root, after `bun install` and `bash scripts/setup.sh`:

```bash
cd desktop && bun install && bun run build && bun run start
```

The app talks to `CLIPFARM_SITE_ORIGIN` (default: the live site). For a local Worker:

```bash
CLIPFARM_SITE_ORIGIN=http://localhost:5357 bun run start
```

## Tests

```bash
cd desktop && bun run typecheck && bun test src
```

```bash
python -m unittest discover -s pipeline/tests -t . -v
```

End-to-end tests drive the real app with Playwright (`bun run dev` must run for the site):

| Test | Covers |
| --- | --- |
| `tests/phase1.e2e.cjs` | Window, CSP, IPC rejection, sidecar start/crash restart/stop, ports |
| `tests/phase2.e2e.cjs` | Browser sign-in, PKCE, state, replay, encrypted token, revoke, offline start |
| `tests/phase3.e2e.cjs` | First-run screens, PC check, model download pause/resume/verify, terms |
| `tests/phase5.e2e.cjs` | Home, Studio with a real job, notifications, sync, browser pairing |
| `tests/lowdisk.e2e.cjs` | Model download refused when the disk is too full |
| `tests/offline-download.e2e.cjs` | Download goes offline, keeps its bytes, resumes after a restart |
| `tests/website-parity.e2e.cjs` | Website checklist from CLAUDE.md §8 |

CI (`.github/workflows/desktop.yml`) runs on every pull request: website checks on Ubuntu,
then on `windows-2025` it builds the sidecar and installer, installs silently, runs
`--smoke-test`, the phase 1 e2e test against the installed app and a real clip render, and
uninstalls. The installer is uploaded as a workflow artifact. A run uses about 15 minutes
of wall time; on a private repository Windows minutes bill at 2×, so expect roughly
30–40 billed minutes per run.

## Release

1. Create the **public** repository `Mrghost6337/clipfarm-studio-releases` (empty is
   fine). The installed app reads updates from it. It never holds a GitHub token.
2. Add the repository secret `RELEASES_TOKEN` to this repo: a fine-grained token with
   *Contents: read and write* on the releases repository only.
3. Run the **Desktop release** workflow by hand with a higher `version` (e.g. 0.1.1),
   the release `notes` and `publish`. It builds, signs (if a certificate is set), and
   uploads the installer, `latest.yml` and blockmap as a release.
5. Put the installer URL in `src/shared/downloads.ts` (`DESKTOP_DOWNLOADS.windows`) and
   deploy the site. `/download` enables the Windows button only when that URL is set.

## How updates reach users

Every installed app checks the releases repository 10 seconds after it starts and then
every 30 minutes. A new version downloads in the background (only the changed blocks
when possible). Then the app shows **Update ready** with the release notes and two
buttons, plus a Windows notification:

- **Install now**: the app closes, the update installs silently and the app reopens.
- **Later**: the prompt hides; the update installs silently the next time the app closes.

Settings → Updates shows the same state and an *Install now* button. CI tests the whole
path on Windows: it installs 0.1.0, serves a 0.1.1 build as the update feed, and checks
that *Install now* replaces the app with 0.1.1 and reopens it.

## Code signing

Unsigned installers trigger Windows SmartScreen warnings. Either:

- **Certificate (.pfx):** add `CSC_LINK` (base64 of the .pfx) and `CSC_KEY_PASSWORD` as
  repository secrets. electron-builder signs the app, the uninstaller and the installer.
- **Azure Trusted Signing:** add an `azureSignOptions` block under `win:` in
  `electron-builder.yml` and the `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`,
  `AZURE_CLIENT_SECRET` secrets.

Never commit a certificate or key.

## Bundled third-party pieces

`scripts/build-sidecar.mjs` assembles `build/sidecar`: CPython 3.12, pinned wheels from
`requirements-desktop.txt`, ffmpeg/ffprobe (BtbN builds), Deno 2.5.6 (for yt-dlp),
YuNet face model, fonts and their licences, plus a `manifest.json` with the SHA-256 of every
file (checked at startup). `scripts/vendor.mjs` copies Inter Tight, Caveat, MediaPipe
tasks-vision with BlazeFace, and ONNX Runtime Web. The sounds in `assets/sounds` are
original, generated by `scripts/make-sounds.py` and released under CC0.
