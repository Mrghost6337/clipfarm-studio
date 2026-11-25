# Clipfarm Studio — Claude Code handoff

This repository is the **Clipfarm Studio** website and web app: a marketing site
plus a signed-in workspace where streamers send a VOD and get vertical,
captioned clips back. It is a real product demo: the dashboard only shows rows
the pipeline actually wrote, there is no seeded or generated data.

The next milestone is a **Windows desktop app**. This file exists so Claude Code
can see the whole UI: the theme, the GUI components, every screen, the data and
API contracts, and which parts are browser-only and must be replaced or bundled
in a desktop shell. Read it before changing anything.

```

```

- **UI language: English.** All user-facing copy is English, sentence case,
  no lorem ipsum, no fake numbers.
- **Source of truth for design tokens:** `src/styles.css` (`@theme` block).
- **Living visual reference:** the `/styleguide` page (`src/pages/Styleguide.tsx`)
  renders every colour, type step, spacing value, radius, shadow and motion
  token, plus every component in every state.
- **Screenshots of the current build:** `docs/ui/` (see the index at the end).

---

## 1. Stack

| Layer | What |
| --- | --- |
| UI | React 19 + TypeScript, Vite 8, `react-router` 8, `motion` (Framer Motion), `lucide-react` icons |
| Styling | Tailwind CSS v4 with a CSS-first `@theme` token block in `src/styles.css` |
| Site/API | Cloudflare Worker (Hono) in `src/worker/`, D1 database (`DB` binding), static assets |
| Auth | Email/password (PBKDF2 + HttpOnly session cookie) and optional Google OAuth |
| Heavy pipeline | **Local Python service** in `pipeline/`: FastAPI + SQLite + yt-dlp + ffmpeg/libass + faster-whisper + OpenCV YuNet |
| In-browser extras | MediaBunny + WebCodecs cutter, MediaPipe BlazeFace face crop, Whisper via transformers.js |

Commands (Bun, lockfile is `bun.lock`):

```sh
bun install
bun run dev        # Vite + the Worker in workerd, http://localhost:3000
bun run build      # dist/client + dist/clipfarm_studio/index.js
bun run typecheck

bash scripts/setup.sh                     # Python venv, ffmpeg, YuNet, fonts
.venv/bin/python -m pipeline.cli serve    # pipeline API on 127.0.0.1:8787
```

In dev, Vite proxies `/pipeline-api` → `http://127.0.0.1:8787` (see
`vite.config.ts`). A production build calls `http://127.0.0.1:8787` directly
(`src/lib/pipeline.ts`).

---

## 2. Where things live

| Path | Contents |
| --- | --- |
| `src/styles.css` | **All design tokens**: colours, fonts, radii, shadows, durations/easings, keyframes, `corner-shape: squircle`, base layer, utilities `page-grid`, `hero-glow`, `fade-x`, `text-balance`, `text-pretty` |
| `src/content.ts` | Every marketing string and seed list: `SITE`, `NAV`, `HERO`, `CLIENTS`, `HOME`, `SERVICES`, `ENGAGEMENTS`, `PLAN_PAGE`, `CASES`, `FAQS`, `ABOUT`, `GTA`, `TOOLS`, `TOOLKIT`, `FOOTER`, `CREATORS`, `IMAGES` |
| `src/components/` | UI primitives + composite blocks (table in §5) |
| `src/pages/` | Marketing and auth pages |
| `src/pages/app/` | Signed-in app pages: `Overview`, `ClipsPage`, `SourcesPage`, `StudioPage`, `Analytics`, `SettingsPage`, `StudioEntry`, `ClipPage` |
| `src/pages/Studio.tsx` | The Studio UI itself (three-pane editor, ~1,000 lines) |
| `src/components/AppShell.tsx` | Dashboard frame: 248 px sidebar, plan card, account row, mobile header + drawer |
| `src/lib/` | `auth.tsx`, `region.tsx`, `pipeline.ts`, `clipRender.ts`, `faceTrack.ts`, `transcribe.ts`, `storage.ts`, `cx.ts`, `title.ts` |
| `src/shared/` | Code shared with the Worker: `account.ts` (plans, onboarding, types), `clips.ts` (detector), `exports.ts`, `agents.ts` |
| `src/worker/` | Hono routes: `index.ts`, `auth.ts`, `clips.ts` |
| `pipeline/` | Python pipeline: `api.py`, `worker.py`, `ingest.py`, `transcribe.py`, `detect.py`, `face.py`, `render.py`, `subtitles.py`, `publish.py`, `db.py`, `config.py`, `cli.py` |
| `public/images/` | Photos and creator avatars (real, credited); `public/images/gta-clips/` holds real GTA VI thumbnails |
| `docs/ui/` | Screenshots of the current UI (index at the end) |

Routing (`src/App.tsx`): marketing pages keep the site header/footer; `/dashboard`
and `/clip/:id` and `/studio` use their own shells. `/studio` renders
`StudioEntry` (auth-aware gate + one-time setup modal) and then the Studio.

---

## 3. Colour tokens

Defined once in `src/styles.css` as Tailwind theme variables, used as
`bg-*`, `text-*`, `border-*`:

| Token | Hex | Use |
| --- | --- | --- |
| `--color-page` | `#f2f2f0` | Page background (warm off-white) |
| `--color-paper` | `#ffffff` | Cards, nav, inputs |
| `--color-sand` | `#f7f3ec` | Inset panels, dashboard background |
| `--color-ink` | `#1c1a14` | Primary text, primary buttons, dark cards |
| `--color-ink-2` | `#2b2820` | Secondary text, hover state |
| `--color-body` | `#4a463e` | Paragraphs |
| `--color-muted` | `#625d53` | Captions, hints, meta |
| `--color-line` | `#e3e0da` | Hairlines, dividers |
| `--color-line-strong` | `#cfcac1` | Control borders |
| `--color-disc` | `#57534b` | Chevron disc inside arrow buttons |
| `--color-peach` | `#fbe4c6` | Soft tint fills |
| `--color-apricot` | `#f5b765` | Hero glow |
| `--color-apricot-deep` | `#ee9f3e` | Deep glow stop |
| `--color-accent` | `#f0a24b` | Check dots, focus glow, fills — **not** for text |
| `--color-accent-ink` | `#94510b` | Accent text/links on light backgrounds |
| `--color-success` / `--color-success-soft` | `#1f7a4a` / `#e5f3ea` | Success text / fill |
| `--color-danger` / `--color-danger-soft` / `--color-danger-soft-strong` | `#b4232f` / `#fbe9ea` / `#f5d7d9` | Errors, destructive actions |
| `--color-star` | `#f5b324` | Rating stars |

Rules: no pure greys (the neutrals all carry a warm/brown cast), `accent` never
carries body text, focus glow is `rgb(240 162 75 / 0.35)`, selection is the same
apricot at 35 %.

## 4. Typography, shape, motion

Fonts (Google Fonts in `index.html`, bundle them locally for the desktop app):

- **Inter Tight** — everything (`--font-sans`), weights 400–800.
- **Caveat** — hand-written accents only (`--font-hand`, class `font-hand`),
  e.g. the "It's free!" arrow note.
- Body letter-spacing is `-0.004em`; headings get tighter tracking
  (`-0.04em` on H1/H2, `-0.03em` on section titles).

Type scale (exact classes used in `Styleguide.tsx`):

| Step | Classes | Size / weight |
| --- | --- | --- |
| Display | `text-[4.15rem] leading-[1.13] font-semibold tracking-[-0.022em]` | 66 / 600 |
| H1 | `text-[3.5rem] leading-[1.04] font-semibold tracking-[-0.04em]` | 56 / 600 |
| H2 | `text-[2.9rem] leading-[1.06] font-semibold tracking-[-0.04em]` | 46 / 600 |
| H3 | `text-[1.3rem] font-semibold tracking-[-0.025em]` | 21 / 600 |
| Statement | `text-[1.1875rem] leading-[1.32] font-medium tracking-[-0.018em]` | 19 / 500 |
| Body | `text-[1.0625rem] leading-[1.6] text-body` | 17 / 400 |
| Small | `text-[0.875rem] text-muted` | 14 / 400 |

Radii — everything is a **squircle** (`corner-shape: squircle` on `*`), pills opt
out with `.rounded-full` / `.round`:

`--radius-sm: 12px` · `--radius-md: 18px` · `--radius-lg: 26px` ·
`--radius-xl: 34px` · `--radius-nav: 44px`

Shadows:

- `--shadow-nav`: hairline + soft 30 px drop (floating nav)
- `--shadow-card`: 1 px + 32 px soft (cards)
- `--shadow-raise`: 50 px lift (modals, drawers)
- `--shadow-button`: inner top highlight + 24 px drop (dark pills)

Motion:

- Durations `--duration-fast: 160ms`, `--duration-base: 280ms`,
  `--duration-slow: 600ms`
- Easings `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)`,
  `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
- Buttons press to `scale(0.97)`; cards lift 2–4 px on hover; page transitions
  fade 180 ms; modals enter `opacity + y: 28 → 0 + scale 0.98 → 1`.
- `prefers-reduced-motion` collapses all animation to ~0 ms (base layer).
- Keyframes available: `marquee`, `glow`, `draw`, `wiggle`.

Backgrounds/utilities:

- `page-grid` — faint 8-column vertical grid + 132 px horizontal lines
  (marketing pages).
- `hero-glow` — radial apricot glow rising from the bottom of the hero.
- `fade-x` — horizontal mask for marquees.
- `text-balance` / `text-pretty` for headings and paragraphs.

Accessibility baseline: 2.5 px `ink` focus ring with 3 px offset (apricot on dark
surfaces), 44 px minimum touch targets on nav/icon buttons, labelled controls
with `aria-describedby` for hint/error, dialogs trap focus and close on Escape.

---

## 5. Component inventory (`src/components/`)

Primitives:

| Component | API / notes |
| --- | --- |
| `Button`, `ButtonLink` | `variant: primary \| secondary \| ghost \| light \| destructive \| danger-ghost`, `size: sm \| md \| lg`, `loading`, `icon`, `force` (pins hover/focus/pressed for the style guide). Pill shape, dark primary. |
| `ArrowLink`, `ArrowButton` | The dark pill with a grey chevron disc (`size md \| lg`, `tone dark \| light`) used for hero CTAs. |
| `IconButton` | 44 px round, `tone: soft \| ghost \| dark`, requires `aria-label`. |
| `Card`, `Stat` | `tone: paper \| sand \| ink \| peach`; radius `lg`, padding 24/32. `Stat` = big tabular number + label. |
| `TextField`, `TextArea`, `SelectField`, `Notice` | Label + hint/error shell, 48 px controls, apricot focus glow; `Notice` tones `error \| success \| info`. |
| `Modal`, `Drawer`, `useFocusTrap` | Portal + `motion` enter/exit, focus trap, Escape, scroll lock, `shadow-raise`. |
| `Segmented` | Pill radio group with sliding `motion` indicator and arrow-key support. |
| `CheckPill`, `Badge`, `Eyebrow`, `Chip`, `Tag` | Outline pill with apricot check; italic grey badge over the hero; eyebrow label above sections; toggle chip; small static tag (`line \| peach \| ink`). |
| `Toast` / `useToast` | Bottom toast stack with success/error tones. |
| `Accordion`, `Checkbox`, `Stepper`, `Segmented` | Form and FAQ primitives. |

Layout and marketing blocks: `Container` (max-width wrapper), `Header` (floating
white pill nav + Services dropdown + auth state), `Footer` (dark ink), `PageHero`,
`SectionHeading`, `Marquee`, `Reveal` (scroll-in animation), `Scribble` (hand-drawn
arrow), `Proof` (`Stars`, `SocialProof`), `CreatorCard`, `Cards`
(`ServiceCard`, `CaseCard`, `QuoteBlock`), `CtaBand`, `ClientLogos`, `Logo`
(squircle-with-play mark), `GtaClipRail` (six real GTA VI clips, horizontal
scroll rail with arrows, counter and progress bar), `LaunchPopup`,
`CookieConsent`.

Feature components: `AnalyzeForm`, `ClipList`, `ClipExports`, `ClipCutter`
(MediaBunny/WebCodecs), `AutoClipper` (transcribe + rank + render queue + ZIP),
`TranscribeAgent` (Whisper in a Web Worker), `AgentConsole` (QA/caption/hook/
packaging checks), `StudioOnboarding` (two-step setup modal).

Page pattern for marketing sections: `Container` → optional `Eyebrow` →
`SectionHeading` → content grid of `Card`s, generous vertical rhythm
(`py-14 sm:py-20`, 24–64 px gaps), soft borders instead of heavy shadows.

---

## 6. Screens

Marketing (site header + footer, `Header`/`Footer`):

| Route | What it shows |
| --- | --- |
| `/` | Hero with avatar badge, two-tone headline, dark "Start free" arrow pill, hand-drawn note, creator avatars + stars, outcome-pill marquee, three check statements over `hero-glow`; GTA VI banner with parallax; **GTA VI launch-week clip rail** (six real creator uploads, each card opens the original YouTube video); "Clipping for" creator marquee; services grid; pipeline; stats; toolkit marquee; creator cards; quote; FAQ; closing CTA. Scroll reading-progress bar at the top. |
| `/gta-6` | GTA VI hub: cinematic hero with Rockstar's Trailer 2 embed, anchor rail, three-step pipeline, creator grid, six 9:16 moment posters, detection panel. |
| `/services`, `/product`, `/pricing`, `/plans` | Offer, feature detail, plan comparison (Starter $19 / Creator $49 / Network $129, monthly or quarterly −20 %). |
| `/resources`, `/resources/guides`, `/resources/faq`, `/resources/changelog` | Hub, guides, FAQ, changelog. |
| `/case-studies`, `/case-studies/:slug`, `/about`, `/toolkit`, `/contact` | Social proof, about, 22 open-source tools, contact. |
| `/download` | Desktop download page: macOS + Windows cards, both disabled with a "Coming soon" tag and the note "Desktop apps are coming soon. We'll notify you when they're available." |
| `/local` | Local pipeline console: dependency report, disk usage, job list, SSE progress, rendered clips. |
| `/login`, `/signup`, `/onboarding` | Auth forms, then the two-step channel setup. |
| `/app-login` | Standalone browser sign-in for the desktop app (see §7). No site chrome; login + sign-up, then a one-time-code handoff to `clipfarm://auth`. |
| `/privacy`, `/terms`, `/styleguide`, `*` | Legal, live design system, 404. |

Signed-in app (`src/components/AppShell.tsx`; background `sand`, 248 px white
sidebar with logo, "New clip" pill, Workspace nav, plan card, account row;
mobile gets a sticky header + drawer):

| Route | Contents |
| --- | --- |
| `/dashboard` | Overview: greeting, four KPI cards (views, clips, watch time, growth), 7/30/90-day chart, recent clips, sources, activity, plan usage; admin accounts also get a studio overview (accounts, paid plans, MRR, newest sign-ups). |
| `/studio` (`StudioEntry` → `Studio`) | Auth gate; first visit opens the two-step setup modal (welcome/features → Cloud/Local/Both for paid plans, download step for Free). Completing it stores `clipfarm.studio.onboarding.<userId>` in `localStorage` and renders the Studio. |
| `/studio` (Studio) | Three-pane editor: 300 px source rail (Channels / Link / Upload tabs, project list), centre 9:16 preview with timeline and transcript, 340 px inspector (Clips / Style / Layout / Publish). Top bar: stepper Source → Analyze → Review clips → Edit → Publish, status chip (Ready / Pipeline offline), Export + Publish buttons. Keyboard: Space/K play, J/L ±5 s. Below `md` the whole Studio is replaced by "Open the Studio on a wider screen". |
| `/dashboard/clips`, `/dashboard/sources`, `/dashboard/analytics`, `/dashboard/settings` | Library, channels, analytics, settings (channel, region/language/currency, plan, cookies, account). |
| `/clip/:id` | Public clip share page: source embedded at the cut, transcript excerpt, caption cues, SRT download; opening it records a view. |

Screenshots (all 1440 px wide unless noted): `docs/ui/home-hero.png`,
`docs/ui/home-clip-rail.png`, `docs/ui/dashboard.png`, `docs/ui/studio.png`,
`docs/ui/studio-onboarding.png`, `docs/ui/download.png`, `docs/ui/gta-hub.png`.

---

## 7. Data and APIs

Accounts and clip data live in D1 (binding `DB`); passwords are PBKDF2-SHA256,
sessions are hashed tokens in an HttpOnly, SameSite=Lax cookie
(`clipfarm_session`). Plans and onboarding rules are shared code in
`src/shared/account.ts` (`PLANS`, `isPlanId`, `validateProfile`).

Worker API (all JSON, cookie auth unless noted):

| Route | Purpose |
| --- | --- |
| `GET /api/health` | `{ ok: true }` |
| `GET /api/auth/me` | signed-in user or `null` |
| `POST /api/auth/signup` / `login` / `logout` | session lifecycle (201 / 200 / 200) |
| `POST /api/auth/app/authorize` | cookie session → one-time desktop-app code (5 minutes; only its SHA-256 is stored) |
| `POST /api/auth/app/token` | `{ code, verifier }` → 30-day bearer session for the desktop app (PKCE S256) |
| `POST /api/auth/profile` | save onboarding; `{ skip: true }` marks it done |
| `POST /api/auth/plan` | `{ planId, billing }` |
| `GET /api/auth/google`, `/api/auth/google/callback` | OAuth when configured |
| `GET /api/dashboard` | real totals, 30-day series, platforms, recent clips/sources, activity, admin block |
| `POST /api/clips` | `{ url, transcript? }` → source + scored clips; 422 `needsTranscript` |
| `GET /api/clips`, `GET /api/clips/sources` | library and sources |
| `POST /api/clips/sources/:id/transcript` / `retry`, `DELETE .../sources/:id` | transcript paste, re-resolve, delete |
| `GET /api/clips/:id`, `POST /api/clips/:id/view` | public clip payload, view counter |
| `GET /api/clips/:id/captions.srt`, `GET /api/clips/:id/export/:format` | real files (SRT, VTT, ASS, EDL, MLT, Editly JSON, ffmpeg script, JSON) |
| `PATCH /api/clips/:id`, `DELETE /api/clips/:id` | status (`ready`/`posted`/`archived`), delete |

### Desktop app sign-in (`/app-login`)

The desktop app never sees the account password. It opens the hosted page in the
system browser and receives a one-time code back:

1. The app generates a random `verifier` (43–128 chars) and
   `challenge = base64url(SHA-256(verifier))`, plus a random `state`
   (`A-Za-z0-9_-`, 8–128 chars). The verifier stays in the app.
2. It opens
   `https://<origin>/app-login?state=<state>&challenge=<challenge>&redirect=clipfarm://auth`.
   `redirect` defaults to `clipfarm://auth`; the only other accepted target is
   an explicit loopback callback (`http://127.0.0.1:<port>/…` or
   `http://localhost:<port>/…`). Everything else is rejected as an open redirect.
3. The user logs in or signs up on that page (email + password, same D1
   accounts as the website). The page calls `POST /api/auth/app/authorize` with
   the HttpOnly web session and gets `{ code, expiresAt }`. The code works once,
   expires in 5 minutes and the Worker stores only its SHA-256 hash.
4. The page navigates to `clipfarm://auth?code=<code>&state=<state>` and tells
   the user to open the app and close the page. If the deep link does not fire,
   the same URL is one click away on the page.
5. The app checks that `state` matches, then calls `POST /api/auth/app/token`
   with `{ code, verifier }`. The Worker verifies the PKCE challenge, burns the
   code and returns `{ token, user }`. Send the token as
   `Authorization: Bearer <token>`; it is an ordinary 30-day session row, so
   logout/revocation deletes it. `GET /api/auth/me` accepts the bearer token too.

The page is deliberately standalone: `SHELL_ROUTES` in `src/App.tsx` hides the
marketing header and footer for `/app-login`. It refuses incomplete links,
unknown redirect targets and expired or reused codes. Never put the long-lived
token or the password in a URL, in `localStorage`, or in a web page.

Local pipeline API (`pipeline/api.py`, `http://127.0.0.1:8787`, CORS `*`):

`GET /health`, `GET /system` (dependency report), `GET /config`,
`POST /ingest` (channel/profile/video), `POST /upload` (multipart video),
`POST /jobs` `{ url, preset, maxClips }`, `GET /jobs`, `GET /jobs/:id`,
`GET /jobs/:id/events` (SSE), `POST /jobs/:id/cancel`, `POST /jobs/:id/retry`,
`DELETE /jobs/:id`, `GET|DELETE /cache`, `POST /ytdlp/update`,
`POST /jobs/:id/clips/:clipId/render`, `GET /posting/status`,
`POST /publish/youtube`. Files are served from `/files/<job>/clips/<n>/`.

Job states: `queued → downloading → transcribing → analyzing → rendering →
done | failed`; `result` holds the video metadata, transcript words/segments and
clips (title, start, end, layout, score, hashtags, caption and file paths).
Client types and the `pipelineApi()` helper are in `src/lib/pipeline.ts`.

Visitor state stays in `localStorage`: `clipfarm.*`, cookie choice
(`clipfarm.consent`), Studio onboarding setup per user id.

---

## 8. Building the Windows app

The web app is the product UI to port. Recommended shape: **Electron** (bundled
Chromium = best parity with WebCodecs and the existing CSS) or **Tauri** with
WebView2 (smaller, still Chromium). Either way:

1. **Reuse the UI as-is.** Import the same React components, pages and
   `src/styles.css`. Keep the token block untouched so the desktop app matches
   the site pixel for pixel. Do not re-implement the theme.
2. **Bundle the local pipeline.** Ship `pipeline/` with a Python runtime (or a
   frozen sidecar exe), plus the static `ffmpeg`/`ffprobe` from `.tools/`, the
   YuNet model and the fonts from `assets/fonts/`. Spawn
   `python -m pipeline.api` (or `pipeline.cli serve`) on `127.0.0.1:8787` when
   the app starts and point the UI at it (`VITE_PIPELINE_API`, or the production
   fallback in `src/lib/pipeline.ts`). The pipeline is CPU-only, needs no API key
   and stores jobs in `pipeline/data/pipeline.sqlite3`.
3. **Auth.** Use the browser handoff above: open `/app-login` with a PKCE
   challenge, receive `code` on the `clipfarm://auth` deep link (or on a
   loopback `http://127.0.0.1:<port>/callback`), exchange it at
   `/api/auth/app/token` and keep the returned bearer token in the OS credential
   store (Windows Credential Manager / macOS Keychain). Register the `clipfarm`
   protocol in the installer and send `Authorization: Bearer <token>` with API
   calls; do not copy a web cookie or session into `localStorage`.
4. **Bundle what the browser fetched from CDNs:** Inter Tight + Caveat,
   `public/images/`, the MediaPipe BlazeFace wasm/model (currently lazily loaded
   from jsDelivr in `src/lib/faceTrack.ts`), the transformers.js WASM runtime and
   the Whisper weights (currently downloaded from Hugging Face once and cached by
   the browser).
5. **Windows specifics:** paths in `pipeline/config.py` are relative to the repo
   root — resolve them against the install directory; use `ffmpeg.exe`; allow
   loopback traffic; handle single-instance and auto-update; code-sign the
   installer. Long jobs need the app not to sleep mid-render.
6. **Keep these behaviours:** the Studio blocks the workspace with a "Pipeline
   offline" card when `/health` fails, and the offline copy tells the user how to
   start the service. In a desktop build you should start it for them, then keep
   the same card as the failure state.

Parity checklist when the shell runs: home hero + clip rail, `/login` →
`/dashboard`, `/app-login` login + sign-up handoff, Studio onboarding modal,
Studio three-pane editor with a real job (preview, clips, transcript, export),
`/download`, `/styleguide`.

---

## 9. Conventions and guardrails

- English UI copy, sentence case; numbers and claims must be real (no seeded
  clips, no invented stats).
- Add no new dependency for something a component or the design tokens already
  solve; the bundle is already large (client chunk ≈ 1.5 MB).
- Use the token classes (`bg-paper`, `text-muted`, `rounded-[var(--radius-lg)]`,
  `shadow-[var(--shadow-card)]`) instead of raw hex values or arbitrary shadows.
- Every new interactive element needs an accessible name, a visible focus state
  and a 44 px touch target; respect `prefers-reduced-motion`.
- Marketing pages keep `Header`/`Footer`; `/dashboard`, `/studio`, `/app-login`
  and `/clip/:id` use their own shells.
- Plan, price and limit data comes from `src/shared/account.ts` — never hardcode
  prices in a page.
- Detection tuning lives in `src/shared/clips.ts`; export formats in
  `src/shared/exports.ts`.

## 10. Known limits

- The Cloudflare Worker cannot download video, run ffmpeg/Whisper or keep a
  process: all heavy work is the local Python pipeline, and the hosted UI shows
  the offline card without it.
- YouTube from a datacenter IP often hits a bot check; `YTDLP_COOKIES` /
  `YTDLP_COOKIES_FROM_BROWSER` in `.env` are the supported fix.
- The browser cutter needs WebCodecs and a local MP4/MOV/WebM; the Whisper
  worker needs a one-time model download; face tracking needs the MediaPipe CDN
  (or a bundled copy).
- `/download` builds are placeholders ("Coming soon") until the Windows app
  ships.
