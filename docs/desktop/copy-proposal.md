# Copy changes: honesty pass

Status: **proposal, not applied** (except part A). Nothing in part B changes
until it is approved. Every "Now" line was checked against the code on
2026-11-25.

Ground rule used: a sentence stays only if the product does it today, the data
exists, or it is clearly labelled as coming soon.

---

## A. Already applied in this step (needed for the plan and Studio fixes)

| Where | Before | After |
| --- | --- | --- |
| Studio setup, Cloud option | "Clip Farm processes your videos on our servers. Nothing to install." (selectable) | "Processing on Clipfarm servers, nothing to install." + **Coming soon**, not selectable |
| Studio setup, Both option | "Use the cloud for long jobs and the desktop app when you want local control." | "Cloud for long jobs, this computer for everything else." + **Coming soon**, not selectable |
| Studio setup, Local option | "Everything runs on this computer. Your source files never leave it." | "Runs in the Clipfarm pipeline on this computer. Your videos stay on it." |
| Studio setup, title/description | "Welcome to the new Studio" / "The Studio is new in this update." | "Welcome to the Studio" / "Everything from a long video to a captioned vertical clip, in one place." |
| Studio setup, step 2 | Free: "Download the Clip Farm app first … The Studio stays locked on the Free plan until you have been through the download step." (unlocked by clicking a link to a page with no download) | Removed. Everyone gets "Choose how Clipfarm runs" with Local only. |
| Studio gate (`StudioEntry`) | "Your {plan} plan includes cloud processing." / "The Studio is locked" | "Choose how Clipfarm runs before you enter the Studio." |
| Feature list | "AI finds the moments" | "Find the moments" |
| Plans page eyebrow/title | "Setup · step 2 of 2" / "Choose the plan that fits your channel" | "Plans" / "Plans for every channel size" |
| Plans page intro | "Every plan starts with one free VOD. Change or cancel any time; quarterly billing saves 20%." | "Paid plans open when checkout launches. Until then your account is on Free: 3 clips a month, nothing to pay." |
| Plans page buttons | "Choose Starter/Creator/Network" (upgraded for free) | "Checkout coming soon" (disabled) + "Continue on Free" |
| Plans page tag | "Most chosen" (nobody has paid) | Removed; "Current plan" only for a verified plan |
| Plans page footer | "Prices shown in {currency}, charged in USD at checkout. Your first VOD pass is free, so you can see the clips before you pay." | "Prices shown in {currency}. Paid plans will be charged in USD." |
| Plans page, account that picked a plan earlier | (showed as paid) | "You picked {plan} earlier. It is not active and nothing was charged, because checkout is not available yet. You are on the Free plan." |
| Sidebar plan card | "No plan yet" / "20 to 200 clips a month" / "Choose a plan" | "Free" / "3 clips a month" / "See plans" |
| Dashboard usage card | "No plan" / "Choose a plan to start clipping." | "Free" / "3 clips a month on the Free plan." |
| Settings, plan & billing | "No plan selected." / "Switch to quarterly and save 20%." | "Free: 3 clips a month, nothing to pay." / "Paid plans open when checkout launches." |
| Limit reached (API) | "…this month. Upgrade to keep clipping." | "…this month. The allowance resets on the 1st." |
| Plan route (API) | upgraded the account | 402: "Paid plans open when checkout launches. Your account stays on the Free plan until then." |
| Admin card | "Paid", "MRR" (counted every plan pick) | "Paid (verified)", "MRR from verified payments", plus a separate "Plans picked without payment" list marked "not paid" |
| Onboarding eyebrow | "Setup · step 1 of 2" | "Channel setup" |
| GTA VI analyzer | "Choose a plan" / "No card for the first VOD pass. Cancel any time." | "Create account" / "Free accounts get 3 clips a month. No card needed." |
| Pipeline offline card | "…then open http://localhost:3000/studio" (wrong port) | Removed the wrong URL; added pairing, blocked and offline states |

Free = 3 clips a month because `/pricing` already published that number. It
now lives in `FREE_PLAN` in `src/shared/account.ts`. **Decision for you:** keep
3, or pick another number.

---

## B. Proposed, waiting for approval

### B1. Things that say Clipfarm is fictional or a template

| Where | Now | Proposed |
| --- | --- | --- |
| `FOOTER.legal` (every page) | "Clipfarm Studio is a fictional company for this template. Clip only what you have the rights to." | "Clip only what you have the rights to." |
| `content.ts` line 2 (comment) | "Clipfarm Studio and all channels, people and numbers are fictional." | Remove, once B2–B4 are done |
| `SITE.email` (Legal pages, Contact) | `hello@clipfarm.example` (not a real address) | **Need a real address from you** |

### B2. Invented social proof and numbers (remove)

| Where | Now | Proposed |
| --- | --- | --- |
| `HERO.proof`, `CtaBand` default | "Trusted by 400+ creators" + 5 stars + 4 stock avatars captioned "A creator on a Clipfarm retainer" | Remove the stars, avatars and line. Replace with: "Runs on your computer. No API keys, no upload." |
| `HOME.stats` | "18.4k clips cut…", "214M views earned by client clips", "24 h from VOD drop…", "42 channels on a monthly retainer" | Replace with product facts: "1080×1920 · H.264 + AAC exports", "SRT, VTT and ASS caption files with every clip", "0 · API keys or paid services needed" |
| `HOME.quote` | Quote from "Kai Mercer, Streamer, NightOwl" | Remove the section |
| `HOME.trusted` + creator marquee | "Clipping for:" + MrBeast, IShowSpeed, Kai Cenat… | Remove. "Clipping for" says they are clients. |
| Creator cards section (home) | 10 real creators with avatars and bios | Remove until there is permission (same rule as the welcome wall) |
| Case studies (`/case-studies`, `CASES`, `CLIENTS` logos) | 6 invented clients (NovaPlays, LoudHouse…) with metrics like "7.4M views in 90 days" and quotes | Remove the pages, nav and footer links; redirect `/case-studies*` to `/` |
| About (`ABOUT`) | Founder "Maya Lindqvist", 2015–2026 timeline, "42 channels, 18,000 clips", 4 named editors, "1.4B views clipped" | Replace with a short product About (below). **If you want a real founder story, send it.** |
| `/about` photos `founder.jpg`, `avatar-*.jpg` | Stock portraits named as people | Remove from use |

Proposed About text:

> **About Clipfarm Studio**
> Clipfarm Studio turns long streams and videos into vertical, captioned clips.
> The heavy work, from download and transcription to face tracking and
> rendering, runs on your own computer with open-source tools, so your footage
> stays with you and there is no API key to buy.
>
> How we build it: **Rights first.** Clip only what you own or are cleared to
> use. **You decide what ships.** Detection suggests moments; you review every
> clip. **Local by default.** Your videos are processed on your machine.
> **Open tools.** Every step uses a project you can inspect.

### B3. Agency promises the product does not deliver

The site sells a done-for-you service ("we watch", "human editor", turnaround
times). The product is a self-serve tool.

| Where | Now | Proposed |
| --- | --- | --- |
| `HERO.text` | "Send us a six-hour stream. We find the moment, cut it, punch in on the reaction, caption it, and ship vertical clips built to earn views — and money." | "Paste a stream link or drop a file. Clipfarm finds the moments, follows the face, captions every word and renders vertical clips on your computer." |
| `HERO.pills` | "Word-perfect captions in 30+ languages", "A punch-in on every reaction and payoff", "Revenue share or a flat monthly rate" | "Word-level captions, language detected automatically", "Face tracking keeps the speaker in frame", remove revenue share. (Punch-ins are not implemented.) |
| `HERO.points` | "get clips back in 24 hours", "Every clip passes a human editor before it ships", "rights checked first" | "Runs on your own computer: no upload, no API key", "You review every clip before it is posted", "Clip only footage you own or are cleared to use" |
| `HOME.cta` | "…choose a plan. Your first VOD pass is free, so you see the clips before you pay." | "Create an account and clip on the Free plan: 3 clips a month, no card." |
| Home pipeline card (Home.tsx) | "Send one VOD and get ten clips back in 48 hours. The first pass is free." | "Paste a link and get clips back when your computer finishes rendering. Free plan, no card." |
| `SERVICES` | 6 agency services incl. "Audio cleanup and stems", "Delivery to Drive, Dropbox or S3", "A/B tests", "Weekly performance report", "revenue share" | Keep 4 that exist: Highlight finding, Face tracking, Captions (SRT/VTT/ASS + burned-in), Vertical export (1080×1920, loudness normalised). Show "Audio cleanup" and "Posting and analytics" as **Coming soon**. |
| `SERVICES_PAGE.compare` | Turnaround "24 to 48 hours", "Rights checked before we cut: Always", "Cost per clip from $0.65" | Remove the table |
| `ENGAGEMENTS` | "Start with one free VOD… Cancel any time with 30 days' notice." | "Start on Free. Paid plans open when checkout launches." |
| `FAQS` | "We do it by hand…", "We check before we cut", "A free VOD pass is 48 hours", "On Creator and Network plans we also schedule and post", "revenue share", "one revision round" | Rewrite as tool FAQs: what clip farming is, rights, how fast (depends on your computer and the video length), what you need (a link or a file), who posts (you; YouTube Shorts upload with your own credentials), cost (Free now, paid plans when checkout opens) |
| `PLAN_PAGE` (`/pipeline`) | "First 2 hours / Hours 2–4", "Pull the VOD and its chat log", "Post to Shorts, Reels and TikTok", "Test two hooks per clip", CTA "Get 10 free clips" | Real stages: Download → Transcribe → Find moments → Track and crop → Caption and render → Export. CTA "Start free". (Chat logs are not read.) |
| `TOOLKIT` | "Everything we run is open source. Twenty-two tools…" — the pipeline uses about 8 of them | Two groups: **In the pipeline** (yt-dlp, faster-whisper, whisper.cpp fallback, OpenCV YuNet, ffmpeg + libass, MediaBunny, transformers.js) and **Works with your exports** (Kdenlive, Shotcut via MLT; Editly JSON). Remove the rest. CTA "Send a recent VOD and we will run the whole stack on it for free" → "Run it on your own VOD." |
| `GTA.heroStats` | "24 h from link to clips on a retainer" | Remove |
| `GTA.analyzerSignedOut`, `GTA.cta.text` | "…pick a plan…" | "Create an account and the analyzer is the first thing on your dashboard." / "Sign up and paste your first GTA VI link." |
| Onboarding text | "This is what every editor works from…" | "Tell us about your channel. You can change it any time." |

### B4. Plans and pricing

| Where | Now | Proposed |
| --- | --- | --- |
| `PLANS.features` (`account.ts`) | "48-hour turnaround", "24-hour turnaround", "Dedicated editor on Slack", "Weekly performance report", "Revenue-share option", "Audio cleanup", "One/Three/Unlimited VODs a week" (none enforced) | Only what is real: the clip allowance, plus the same local features on every plan. **Business decision for you:** today the only difference between plans is the clip count. |
| `/pricing` (`Pricing.tsx`) | Its own hardcoded tiers (Free, Creator, Network; no Starter), yearly prices $39/$103, "5 team seats", "Priority render queue", "Email support", source length limits (not enforced), "Change plan or cancel from Billing" (no billing page), "taxes calculated at checkout" | Build it from `PLANS` + `FREE_PLAN` (the project rule: no hardcoded prices), quarterly not yearly, remove features that do not exist, "Checkout coming soon" buttons |
| Resources FAQ | "Free is 15 minutes, Creator 90 minutes, Network 4 hours." | Remove until enforced |
| `RATES_NOTE` | "…your bank converts at checkout." | "Indicative rates, updated November 2026. Plans are priced in USD." |

### B5. Naming

"Clip Farm" (two words) appears in the Download page and old Studio copy;
everywhere else it is "Clipfarm". Proposed: "Clipfarm" everywhere.

### B6. Needs your decision, not changed

- **GTA VI clip rail and GTA creator grid.** Six YouTube thumbnails, creator
  avatars and Wikimedia portraits (credited CC BY / CC BY-SA). The licensed
  portraits are legally usable with credit; the thumbnails and channel avatars
  have no permission record. Same rule as the welcome wall? Recommendation:
  keep the links to the original videos, drop the stored thumbnails and
  avatars until permission is recorded.
- **Free allowance number** (3 clips a month), see part A.
