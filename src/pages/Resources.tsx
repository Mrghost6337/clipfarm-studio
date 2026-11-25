import { ArrowUpRight, BookOpen, CalendarClock, CheckCircle2, HelpCircle, History, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'

import { ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { Eyebrow } from '../components/Pill'
import { usePageTitle } from '../lib/title'

const GUIDES = [
  {
    slug: 'first-clip',
    title: 'Your first clip in ten minutes',
    summary: 'Connect a channel, pick a short video, run the pipeline and download the MP4 with captions.',
    time: '10 min',
    level: 'Beginner',
    steps: [
      'Start the local pipeline with `python -m pipeline.cli serve`, then open Studio → Sources → Link.',
      'Paste a public YouTube, Twitch or TikTok video you own. The channel tab lists videos if you paste a channel URL.',
      'Press Clip it. Downloading, transcription, analysis and rendering run in order; the top bar shows the live stage.',
      'When the job is Ready, choose a clip with the highest score, check the first two seconds and press Export.',
      'Download the MP4 and the SRT. Post it, or use Publish to send it to YouTube Shorts with your own OAuth credentials.',
    ],
  },
  {
    slug: 'captions',
    title: 'Caption styles that survive the feed',
    summary: 'Safe zones, line length, highlight colour and when to use the box preset.',
    time: '6 min',
    level: 'Intermediate',
    steps: [
      'Keep captions between 65% and 75% of the frame height. The bottom 20% is covered by TikTok and Reels controls.',
      'Two to four words per line reads best at thumb speed. The pipeline groups phrases automatically and highlights the active word.',
      'Bold is the default: Anton, white text, thick outline, lime active word. Clean (Bebas) is narrower; Box (Noto Sans) is better for long words and non-Latin scripts.',
      'Edit the hook title before rendering. It appears for the first three seconds at the top of the frame.',
      'Export the ASS file if you want to restyle in an editor; SRT and VTT are included for platform uploads.',
    ],
  },
  {
    slug: 'publishing',
    title: 'Publishing without getting banned',
    summary: 'What each platform actually allows, what needs an approved app, and the safe default.',
    time: '8 min',
    level: 'Intermediate',
    steps: [
      'Always available: download the MP4, copy the caption and hashtags, and open the platform upload page. This never needs a developer app.',
      'YouTube Shorts: create a Google Cloud project, enable YouTube Data API v3, download an OAuth desktop client and run `python -m pipeline.cli auth-youtube`. Uploads from an unaudited project are private.',
      'TikTok: the Content Posting API needs an approved app. Unapproved apps can only post privately or to the inbox. Clipfarm opens the official upload page until an app is approved.',
      'Instagram Reels: requires a Business or Creator account, a linked Facebook Page, a Meta app and a public video URL. Treat it as advanced and optional.',
      'Never automate a login with a browser bot. It violates platform terms and gets accounts banned.',
    ],
  },
]

const CHANGELOG = [
  {
    date: '22 Nov 2026',
    title: 'Studio redesign and local pipeline',
    items: ['Three-panel Studio with Sources, editor and inspector', 'Word-synced ASS captions, hook titles and three presets', 'Face tracking with YuNet and stable crop smoothing', 'SQLite job queue with SSE progress, cancel and retry', 'Channel listing for YouTube, Twitch and TikTok'],
  },
  {
    date: '20 Nov 2026',
    title: 'Pricing, product and legal pages',
    items: ['Free / Creator / Network pricing with an honest comparison table', 'How-it-works page with the real pipeline stages', 'Privacy, terms and content-rights pages', 'New five-item navigation and consistent footer'],
  },
  {
    date: '18 Nov 2026',
    title: 'Browser clipping desk',
    items: ['MediaBunny + WebCodecs render in the browser', 'Four frame formats and three caption styles', 'Face-aware crop with MediaPipe BlazeFace', 'Batch render with ZIP download'],
  },
]

export function ResourcesHub() {
  usePageTitle('Resources')
  return (
    <>
      <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
        <div aria-hidden className="page-grid absolute inset-0" />
        <Container className="relative flex flex-col gap-5">
          <Eyebrow>Resources</Eyebrow>
          <h1 className="max-w-3xl text-[2.5rem] leading-[1.03] font-semibold tracking-[-0.045em] sm:text-[3.4rem]">Everything you need to ship the next clip</h1>
          <p className="max-w-2xl text-[1.02rem] leading-relaxed text-body">Practical guides, the questions we actually get, and a changelog that is not marketing. No lorem ipsum.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ButtonLink to="/resources/guides">Read the guides</ButtonLink>
            <ButtonLink to="/resources/faq" variant="secondary">Browse the FAQ</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="pb-16">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              { icon: BookOpen, title: 'Guides', text: 'Step-by-step workflows for the first clip, captions and publishing.', to: '/resources/guides', label: '3 guides' },
              { icon: HelpCircle, title: 'FAQ', text: 'Limits, supported platforms, rights and what happens to your files.', to: '/resources/faq', label: '12 answers' },
              { icon: History, title: 'Changelog', text: 'What shipped, when, and what changed for your workflow.', to: '/resources/changelog', label: 'Newest first' },
            ].map((item) => (
              <Link key={item.title} to={item.to} className="group">
                <Card className="flex h-full flex-col gap-4 transition-colors group-hover:border-ink">
                  <div className="flex items-center justify-between">
                    <span aria-hidden className="grid size-10 place-items-center rounded-[12px] bg-sand text-accent-ink">
                      <item.icon className="size-5" />
                    </span>
                    <ArrowUpRight aria-hidden className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <div>
                    <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">{item.title}</h2>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-body">{item.text}</p>
                  </div>
                  <span className="mt-auto text-[0.78rem] font-semibold text-muted">{item.label}</span>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="flex flex-col gap-3 border-t border-line pt-10">
            <Eyebrow>Popular guides</Eyebrow>
            <ul className="grid gap-3 sm:grid-cols-3">
              {GUIDES.map((guide) => (
                <li key={guide.slug}>
                  <Link to={`/resources/guides#${guide.slug}`} className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-paper p-4 shadow-[var(--shadow-card)] hover:ring-1 hover:ring-line-strong">
                    <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">{guide.level} · {guide.time}</span>
                    <span className="text-[0.95rem] font-semibold">{guide.title}</span>
                    <span className="text-[0.82rem] text-muted">{guide.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  )
}

export function GuidesPage() {
  usePageTitle('Guides')
  return (
    <section className="pt-16 pb-20 sm:pt-20">
      <Container className="max-w-4xl">
        <Eyebrow>Guides</Eyebrow>
        <h1 className="mt-4 text-[2.3rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[3rem]">Workflows that match the pipeline</h1>
        <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-body">Short, specific and based on what the app actually does today. Every step is something you can run.</p>
        <div className="mt-10 flex flex-col gap-6">
          {GUIDES.map((guide) => (
            <article key={guide.slug} id={guide.slug} className="scroll-mt-28 rounded-[var(--radius-lg)] border border-line bg-paper p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold text-muted">
                <span className="rounded-full bg-sand px-2.5 py-1">{guide.level}</span>
                <span className="inline-flex items-center gap-1"><CalendarClock aria-hidden className="size-3.5" /> {guide.time}</span>
              </div>
              <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.03em]">{guide.title}</h2>
              <p className="mt-1 text-[0.95rem] text-body">{guide.summary}</p>
              <ol className="mt-5 flex flex-col gap-3">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-[0.92rem] leading-relaxed text-ink-2">
                    <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[0.72rem] font-bold text-white tabular-nums">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-md)] bg-peach/60 p-4 text-[0.88rem] leading-relaxed text-accent-ink">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          Only clip videos you own or have written permission to use. Guides explain the workflow, not a licence.
        </div>
      </Container>
    </section>
  )
}

export function FaqPage() {
  usePageTitle('FAQ')
  const groups = [
    {
      title: 'Getting started',
      items: [
        { q: 'Do I need an account to use the local pipeline?', a: 'No. The pipeline runs on your machine and the Studio talks to it directly. An account is only needed for the hosted plans, billing and team features.' },
        { q: 'Which browsers work?', a: 'Chrome, Edge and recent versions of Safari and Firefox. Clip preview uses normal MP4 playback, so no WebCodecs requirement for the Studio.' },
        { q: 'Do I need a GPU?', a: 'No. Whisper runs on CPU with int8, and ffmpeg uses libx264 when there is no NVENC. A GPU makes transcription faster but is optional.' },
      ],
    },
    {
      title: 'Sources and limits',
      items: [
        { q: 'Which links are supported?', a: 'YouTube channels, videos and Shorts; Twitch channels, VODs and clips; TikTok profiles and videos. Other links return a clear unsupported message.' },
        { q: 'Why does YouTube ask for a sign-in check?', a: 'YouTube rate-limits datacenter IPs. Add a cookies.txt export or set YTDLP_COOKIES_FROM_BROWSER in .env; the error message names the setting.' },
        { q: 'How long can a source video be?', a: 'Free is 15 minutes, Creator 90 minutes, Network 4 hours. The local pipeline itself has no hard limit, but transcription time grows with length.' },
        { q: 'What happens to downloads?', a: 'They are cached under pipeline/data/cache by video ID. Clear media cache removes them; rendered clips and captions stay.' },
      ],
    },
    {
      title: 'Captions, rights and publishing',
      items: [
        { q: 'Can I edit the captions?', a: 'Yes. Export the SRT, VTT or ASS and edit it in any editor, or change the caption preset and hook title in the Studio before re-rendering a clip.' },
        { q: 'Does it support other languages?', a: 'Whisper detects the spoken language automatically. Caption fonts include Latin coverage; for CJK or RTL, install a Noto font and point fontconfig at it.' },
        { q: 'Who owns the clips?', a: 'You do, subject to the rights you have in the source video. Clipfarm claims no ownership and does not support reposting content you do not have rights to.' },
        { q: 'Is automatic posting allowed?', a: 'Only through official APIs. Clipfarm never automates a login. TikTok and Instagram direct posting need approved developer apps; otherwise the Studio opens their upload page.' },
      ],
    },
  ]
  return (
    <section className="pt-16 pb-20 sm:pt-20">
      <Container className="max-w-4xl">
        <Eyebrow>FAQ</Eyebrow>
        <h1 className="mt-4 text-[2.3rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[3rem]">Answers, not asterisks</h1>
        <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-body">If something here is still unclear, the Contact page reaches a human.</p>
        <div className="mt-10 flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 text-[0.78rem] font-semibold tracking-[0.08em] text-muted uppercase">{group.title}</h2>
              <div className="flex flex-col divide-y divide-line border-y border-line">
                {group.items.map((item) => (
                  <details key={item.q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.98rem] font-semibold">
                      {item.q}
                      <span aria-hidden className="text-[1.2rem] leading-none text-muted transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-body">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function ChangelogPage() {
  usePageTitle('Changelog')
  return (
    <section className="pt-16 pb-20 sm:pt-20">
      <Container className="max-w-3xl">
        <Eyebrow>Changelog</Eyebrow>
        <h1 className="mt-4 text-[2.3rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[3rem]">What shipped</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-body">Newest first. Only changes you can use.</p>
        <ol className="mt-10 flex flex-col gap-6">
          {CHANGELOG.map((entry) => (
            <li key={entry.date} className="relative border-l-2 border-line-strong pl-6">
              <span aria-hidden className="round absolute -left-[7px] top-1.5 size-3 rounded-full bg-accent" />
              <p className="text-[0.78rem] font-semibold tracking-[0.06em] text-muted uppercase">{entry.date}</p>
              <h2 className="mt-1 text-[1.25rem] font-semibold tracking-[-0.02em]">{entry.title}</h2>
              <ul className="mt-2 flex flex-col gap-1.5">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[0.9rem] text-body">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
