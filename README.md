# Fractional HR

A site for the fictional "Peoplefirst Partners", a fractional Head of People
for startups and scaleups. The home page sits on a warm off-white column grid:
a floating white pill nav with a Services dropdown, an avatar badge over a
two-line headline, a dark "Book Free HR Audit" pill with a hand-drawn "It's
free!" arrow, founder avatars and stars, a marquee of outcome pills and three
check statements over an apricot glow, then a "Trusted by" strip of invented
client marks, services, the 90-day plan, stats, case studies, a founder quote,
an FAQ and a closing CTA. Behind it:

- **Services** (`/services`, `#fractional-head` etc.): six service areas with
  outcomes and deliverables, three engagement plans with a monthly/quarterly
  toggle (remembered), and a comparison table.
- **90-day plan** (`/90-day-plan`): pick your stage to see its focus, tick off
  every deliverable across Listen, Build and Scale (saved on the device), with a
  sticky progress bar and a confirm-to-reset dialog.
- **Case studies** (`/case-studies`, `/case-studies/:slug`): search plus topic
  and stage filters kept in the URL, an empty state, and detail pages with
  metrics, challenge, approach, result and quote.
- **Free HR audit** (`/audit`, `?plan=partner`): a three-step booking form
  (company, focus areas, day and time from the Worker's demo calendar) with
  inline errors, a draft that survives a reload, a confirmation with an `.ics`
  download, change time and cancel.
- **About** (`/about`): founder story, values, timeline and associates.
- A 404 and a live style guide at [`/styleguide`](http://localhost:5357/styleguide),
  linked from the footer.

## Run it

```sh
bun install
bun run dev        # http://localhost:5357 (Vite + the Worker in workerd)
bun run build      # dist/client (assets) + dist/fractional_hr/index.js (Worker)
bun run typecheck
```

## Edit it

- **`src/content.ts` holds every string and all seed data**: `SITE`, `NAV`,
  `HERO`, `CLIENTS`, `HOME`, `SERVICES`, `ENGAGEMENTS`, `PLAN_PAGE`, `CASES`,
  `FAQS`, `ABOUT`, `AUDIT`, `FOOTER`.
- **Photos go through one constant, `IMAGES`, in `src/content.ts`.** The files
  in `public/images/` are generated placeholders of fictional people (about
  0.7 MB of `.webp`); replace them with your own photography and update the
  `alt` text.
- **Client logos are invented** SVG marks in `src/components/ClientLogos.tsx`.
  Swap in real logos only with your clients' permission.
- Booking rules and the demo availability live in `src/shared/audit.ts`,
  shared by the browser and the Worker. Replace `slotsFor` with your calendar's
  free/busy API.
- Design tokens (colours, fonts, radii, shadows, motion) are in
  `src/styles.css` under `@theme`; components in `src/components/`, pages in
  `src/pages/`. Fonts: Inter Tight and Caveat from Google Fonts.

## State and the Worker

Visitor state stays in `localStorage` (`pfp.*` keys): the audit draft and
booking, plan ticks and stage, billing period and the newsletter sign-up. The
Worker (`src/worker/index.ts`) validates and stores nothing:

| Route | Does |
| --- | --- |
| `GET /api/health` | `{ ok: true }` |
| `GET /api/slots` | bookable weekdays in the next 21 days |
| `GET /api/slots?date=YYYY-MM-DD` | free start times that day; 400 on a bad or out-of-window date |
| `POST /api/audit` | 201 with a reference; 400 with field errors; 409 when the time is taken |
| `POST /api/subscribe` | 201 or 400 |

Unknown `/api/*` routes return a JSON 404. Wire the handlers to your calendar,
CRM or email tool when you go live.
