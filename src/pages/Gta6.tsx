import { ArrowRight, ArrowUpRight, Captions, Check, Clapperboard, Link2, Play, Scissors, Sparkles } from 'lucide-react'

import { Accordion } from '../components/Accordion'
import { AnalyzeForm } from '../components/AnalyzeForm'
import { ArrowLink, ButtonLink } from '../components/Button'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { Marquee } from '../components/Marquee'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { GTA, IMAGES } from '../content'
import { useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/title'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const youtubeSearch = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

const TONES: Record<string, string> = {
  pink: 'from-[#ff2d8a] via-[#8f1148] to-[#1b0710]',
  orange: 'from-[#ff8a3d] via-[#a8390f] to-[#1b0b06]',
  gold: 'from-[#ffd166] via-[#9b6a14] to-[#1b1405]',
  teal: 'from-[#2dd4bf] via-[#0d615c] to-[#041716]',
  violet: 'from-[#a78bfa] via-[#523aa0] to-[#100a1f]',
  red: 'from-[#ff4d4d] via-[#8f1414] to-[#1b0505]',
}

function DarkEyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex h-8 w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-[0.8125rem] font-semibold text-white/80 backdrop-blur-sm">
      <span aria-hidden className="round size-2 rounded-full bg-[#ff2d8a]" />
      {children}
    </span>
  )
}

function Hero() {
  const { user } = useAuth()
  return (
    <section className="relative -mt-[84px] overflow-hidden bg-ink pb-14 text-white sm:-mt-[100px] sm:pb-16">
      <img src={IMAGES.gtaTrailer2.src} alt="" fetchPriority="high" width={1280} height={720} className="absolute inset-0 size-full object-cover opacity-45" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink via-ink/92 to-ink/25" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
      <div aria-hidden className="absolute -top-32 right-0 size-[420px] rounded-full bg-[#ff2d8a]/25 blur-[110px]" />
      <div aria-hidden className="absolute bottom-0 left-1/3 h-[280px] w-[380px] rounded-full bg-[#ff9a3d]/20 blur-[110px]" />

      <Container wide className="relative grid gap-12 pt-[124px] sm:pt-[160px] lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-14 items-center rounded-[18px] border border-white/20 bg-white/10 px-4 text-[1.3rem] font-black tracking-[-0.05em] backdrop-blur-sm">GTA VI</span>
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 text-[0.75rem] font-bold tracking-[0.14em] uppercase backdrop-blur-sm">
              <span aria-hidden className="round size-2 animate-pulse rounded-full bg-[#ff2d8a]" />
              {GTA.badge}
            </span>
            <span className="text-[0.85rem] font-medium text-white/65">{GTA.launched}</span>
          </div>

          <h1 className="mt-7 text-[2.7rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-[3.6rem] lg:text-[4.05rem]">
            {GTA.title[0]}{' '}
            <span className="block bg-gradient-to-r from-[#ff7ab2] via-[#ff9a5a] to-[#ffd08a] bg-clip-text text-transparent">{GTA.title[1]}</span>
          </h1>
          <p className="mt-6 max-w-[600px] text-[1.0625rem] leading-[1.65] text-pretty text-white/80">{GTA.text}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ArrowLink to={user ? '/dashboard/sources' : '/signup'} tone="light" size="lg">
              {GTA.heroCta}
            </ArrowLink>
            <a
              href="#moments"
              className="inline-flex h-[68px] items-center gap-2 rounded-full border border-white/25 px-7 text-[1rem] font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-white"
            >
              {GTA.secondary}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </div>
          <p className="mt-4 text-[0.85rem] font-medium text-white/55">{GTA.bannerNote}</p>

          <dl className="mt-9 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6">
            {GTA.heroStats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="text-[1.35rem] leading-none font-semibold tracking-[-0.04em] text-white tabular-nums">{stat.value}</dt>
                <dd className="text-[0.72rem] leading-snug text-white/55">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Reveal className="relative w-full">
          <div aria-hidden className="absolute -inset-4 rounded-[calc(var(--radius-xl)+16px)] bg-gradient-to-br from-[#ff2d8a]/35 via-[#ff9a3d]/20 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-white/15 bg-black/60 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.95)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.14em] text-white/70 uppercase">
                <span aria-hidden className="round size-1.5 animate-pulse rounded-full bg-[#ff2d8a]" />
                Official trailer
              </span>
              <span className="text-[0.7rem] text-white/45">Rockstar Games</span>
            </div>
            <iframe
              src={`https://www.youtube.com/embed/${GTA.trailer.id}?rel=0`}
              title={GTA.trailer.title}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 p-4">
              <div>
                <p className="text-[0.82rem] font-semibold">{GTA.trailer.title}</p>
                <p className="text-[0.72rem] text-white/55">{GTA.trailer.channel} · official trailer</p>
              </div>
              <a href={GTA.trailer.watch} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[0.75rem] font-semibold hover:bg-white/20">
                Watch on YouTube
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      </Container>

      <Container wide className="relative mt-12">
        <Marquee className="[--gap:10px]" label="What the GTA VI pipeline does">
          {GTA.pills.map((pill) => (
            <span key={pill} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[0.85rem] font-medium whitespace-nowrap text-white/85 backdrop-blur-sm">
              <span aria-hidden className="round size-1.5 rounded-full bg-[#ffb03a]" />
              {pill}
            </span>
          ))}
        </Marquee>
      </Container>
    </section>
  )
}

function AnchorRail() {
  return (
    <nav aria-label="On this page" className="border-b border-line bg-page">
      <Container wide className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GTA.anchors.map((anchor) => (
          <a
            key={anchor.id}
            href={`#${anchor.id}`}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-line-strong bg-paper px-4 text-[0.82rem] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            {anchor.label}
          </a>
        ))}
        <a href="#analyzer" className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.82rem] font-semibold text-white">
          Clip a VOD <ArrowRight aria-hidden className="size-3.5" />
        </a>
      </Container>
    </nav>
  )
}

const STEP_ICONS = [Link2, Captions, Scissors]

function Steps() {
  return (
    <section id="steps" className="scroll-mt-28 py-20 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="How it works" title={GTA.stepsTitle} text={GTA.stepsText} />
        </Reveal>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {GTA.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Link2
            return (
              <Reveal as="li" key={step.title} delay={index * 0.06} className="flex">
                <div className="group relative flex h-full w-full flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-paper p-6 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-[var(--duration-base)] hover:-translate-y-1 hover:shadow-[var(--shadow-raise)]">
                  <span aria-hidden className="absolute -top-10 -right-10 size-28 rounded-full bg-peach/60 blur-2xl transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center justify-between">
                    <span aria-hidden className="round grid size-10 place-items-center rounded-full bg-ink text-[0.95rem] font-semibold text-white tabular-nums">
                      {index + 1}
                    </span>
                    <span aria-hidden className="grid size-10 place-items-center rounded-full bg-sand text-accent-ink">
                      <Icon className="size-4.5" />
                    </span>
                  </div>
                  <div className="relative flex flex-col gap-2">
                    <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">{step.title}</h3>
                    <p className="text-[0.95rem] leading-relaxed text-body">{step.text}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </ol>
      </Container>
    </section>
  )
}

function Creators() {
  return (
    <section id="creators" className="scroll-mt-28 py-20 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Creators"
            title={GTA.creatorsTitle}
            text={GTA.creatorsText}
            action={
              <a
                href={youtubeSearch('GTA 6 gameplay')}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-paper px-5 text-[0.9rem] font-semibold transition-colors hover:border-ink focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-ink"
              >
                Trending GTA VI videos
                <ArrowUpRight aria-hidden className="size-4" />
              </a>
            }
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GTA.creators.map((creator, index) => (
            <Reveal key={creator.name} delay={(index % 4) * 0.05}>
              <a
                href={youtubeSearch(creator.query)}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-ink/25 hover:shadow-[var(--shadow-raise)] focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-ink"
              >
                <div className="flex items-start justify-between gap-2">
                  <span aria-hidden className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff2d8a] to-[#ffb03a] p-[2px] text-[0.85rem] font-bold text-white">
                    <span className="grid size-full place-items-center rounded-full bg-ink/40">{initials(creator.name)}</span>
                    <img
                      src={creator.avatar}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                      className="absolute inset-0 size-full rounded-full object-cover ring-2 ring-paper transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:scale-105"
                    />
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 text-muted transition-[transform,color] duration-[var(--duration-base)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-[1.1rem] font-semibold tracking-[-0.02em]">{creator.name}</h3>
                  <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">{creator.platform}</p>
                </div>
                <p className="text-[0.9rem] leading-relaxed text-body">{creator.why}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-[0.8rem] font-semibold text-accent-ink">
                  Open their GTA VI videos
                  <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-[0.8rem] leading-relaxed text-muted">{GTA.creatorsNote}</p>
        <details className="mt-3 max-w-2xl rounded-[var(--radius-md)] bg-sand px-4 py-2 text-[0.78rem] text-muted">
          <summary className="cursor-pointer font-semibold text-ink-2">Photo credits</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {GTA.creatorCredits.map((credit) => (
              <li key={credit}>{credit}</li>
            ))}
          </ul>
        </details>
      </Container>
    </section>
  )
}

function Moments() {
  return (
    <section id="moments" className="relative scroll-mt-28 overflow-hidden bg-ink py-20 text-white sm:py-24">
      <div aria-hidden className="absolute -top-40 left-1/4 size-[520px] rounded-full bg-[#ff2d8a]/15 blur-[140px]" />
      <div aria-hidden className="absolute right-0 bottom-0 size-[420px] rounded-full bg-[#ff9a3d]/15 blur-[130px]" />
      <Container wide className="relative">
        <Reveal>
          <div className="flex flex-col gap-4">
            <DarkEyebrow>What clips</DarkEyebrow>
            <h2 className="max-w-[760px] text-[2.1rem] leading-[1.06] font-semibold tracking-[-0.04em] text-balance sm:text-[2.9rem]">{GTA.formatsTitle}</h2>
            <p className="max-w-[620px] text-[1.0625rem] leading-[1.6] text-pretty text-white/70">{GTA.formatsText}</p>
          </div>
        </Reveal>

        <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 [scrollbar-width:thin]">
          {GTA.formats.map((format, index) => (
            <article
              key={format.title}
              className="group relative flex aspect-[9/16] w-[240px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-white/15 p-4 shadow-[0_20px_50px_-25px_rgb(0_0_0/0.9)] sm:w-[258px]"
            >
              <div aria-hidden className={`absolute inset-0 bg-gradient-to-br ${TONES[format.tone] ?? TONES.pink}`} />
              <div aria-hidden className="absolute -top-12 -right-12 size-44 rounded-full border border-white/25" />
              <div aria-hidden className="absolute top-6 -left-16 size-56 rounded-full border border-white/10" />
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgb(255_255_255/0.22),transparent_55%)]" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="relative flex items-start justify-between gap-2">
                <span className="inline-flex h-7 items-center rounded-full bg-black/30 px-2.5 text-[0.7rem] font-bold tracking-[0.08em] text-white/85 backdrop-blur-sm tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="inline-flex h-7 items-center rounded-full border border-white/25 bg-white/10 px-2.5 text-[0.66rem] font-semibold text-white/85 backdrop-blur-sm tabular-nums">
                  {format.stamp}
                </span>
              </div>

              <div className="relative flex flex-col gap-2">
                <h3 className="text-[1.12rem] leading-tight font-semibold tracking-[-0.025em]">{format.title}</h3>
                <p className="line-clamp-4 text-[0.8rem] leading-relaxed text-white/75">{format.text}</p>
                <div className="mt-1 rounded-[10px] bg-black/45 px-2.5 py-2 backdrop-blur-sm">
                  <p className="text-[0.8rem] leading-tight font-extrabold tracking-[-0.01em] text-white">{format.line}</p>
                  <span aria-hidden className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#d7ff3e]" />
                </div>
                <span className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-white/65 transition-colors group-hover:text-white">
                  <Play aria-hidden className="size-3" /> clip this beat
                </span>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-2 max-w-2xl text-[0.78rem] leading-relaxed text-white/45">{GTA.formatsNote}</p>
      </Container>
    </section>
  )
}

const HOT = /(no way|five stars|cops|heist|busted|unbelievable|worst)/gi

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(HOT).map((part, index) =>
        index % 2 ? (
          <mark key={index} className="rounded-[3px] bg-[#ff2d8a]/30 px-0.5 text-white">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function Detection() {
  return (
    <section id="detection" className="scroll-mt-28 py-20 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Detection" title={GTA.detectTitle} text={GTA.detectText} />
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-ink text-white shadow-[var(--shadow-raise)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
                <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.12em] text-white/65 uppercase">
                  <span aria-hidden className="round size-2 rounded-full bg-[#ff2d8a]" />
                  {GTA.detectionDemo.label}
                </span>
                <span className="inline-flex h-7 items-center rounded-full border border-white/20 bg-white/10 px-2.5 text-[0.7rem] font-semibold text-white/80 tabular-nums">
                  {GTA.detectionDemo.window}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 px-5 py-5 font-mono text-[0.8rem] leading-relaxed">
                {GTA.detectionDemo.lines.map((line) => (
                  <p key={line.time} className="flex gap-3">
                    <span className="shrink-0 text-white/35 tabular-nums">{line.time}</span>
                    <span className="text-white/85">
                      <Highlighted text={line.text} />
                    </span>
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
                <span className="inline-flex items-center gap-2 text-[0.78rem] font-semibold text-white/70">
                  <Sparkles aria-hidden className="size-3.5 text-[#ff9a3d]" /> Hook score
                </span>
                <span className="inline-flex items-baseline gap-1">
                  <span className="text-[1.6rem] leading-none font-semibold tracking-[-0.04em] text-white tabular-nums">{GTA.detectionDemo.score}</span>
                  <span className="text-[0.78rem] text-white/45">/ 100</span>
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="flex h-full flex-col gap-5 rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-1">
                <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em]">What pushed this window up</h3>
                <p className="text-[0.85rem] leading-relaxed text-muted">The same scorer as every other VOD, with GTA vocabulary weighted on top.</p>
              </div>
              <ul className="flex flex-col gap-4">
                {GTA.detectionDemo.signals.map((signal) => (
                  <li key={signal.label} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.85rem] font-semibold text-ink-2">{signal.label}</span>
                      <span className="text-[0.78rem] font-semibold text-muted tabular-nums">{signal.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sand">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ff2d8a] to-[#ffb03a]" style={{ width: `${signal.value}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <ul className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
                {GTA.detect.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[0.82rem] leading-relaxed text-body">
                    <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[0.74rem] leading-relaxed text-muted">{GTA.detectionDemo.note}</p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

function Analyzer() {
  const { user, loading } = useAuth()
  return (
    <section id="analyzer" className="relative scroll-mt-28 overflow-hidden py-20 sm:py-24">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#fff4e6] via-[#fde7cb] to-page" />
      <div aria-hidden className="absolute -top-24 right-1/4 size-[360px] rounded-full bg-apricot/30 blur-[100px]" />
      <Container className="relative">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <Reveal>
            <div className="flex flex-col gap-4">
              <span className="inline-flex h-8 w-fit items-center gap-2 rounded-full border border-[#d9c6ad] bg-white/50 px-3.5 text-[0.8125rem] font-semibold text-accent-ink">
                <Clapperboard aria-hidden className="size-3.5" /> Try it
              </span>
              <h2 className="text-[2.1rem] leading-[1.06] font-semibold tracking-[-0.04em] text-balance sm:text-[2.7rem]">{GTA.analyzerTitle}</h2>
              <p className="max-w-[520px] text-[1rem] leading-[1.6] text-body">{GTA.analyzerText}</p>
              <ul className="mt-1 flex flex-col gap-2">
                {['Paste a public YouTube video or Twitch VOD or clip', 'Captions or chapter marks are read server-side, never downloaded', 'Clips, caption cues and an SRT land in your dashboard'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[0.88rem] leading-relaxed text-ink-2">
                    <span aria-hidden className="round mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-ink text-white">
                      <Check className="size-2.5" strokeWidth={3.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-raise)] sm:p-8">
              {loading ? (
                <p className="text-[0.9rem] text-muted">Checking your session…</p>
              ) : user?.planId ? (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">Paste the link</h3>
                    <p className="text-[0.85rem] leading-relaxed text-muted">The shortlist is written to your dashboard in minutes.</p>
                  </div>
                  <AnalyzeForm />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">Clip your first Leonida VOD free</h3>
                    <p className="text-[0.88rem] leading-relaxed text-body">{GTA.analyzerSignedOut}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink to={user ? '/plans' : '/signup'}>{user ? 'Choose a plan' : 'Create account'}</ButtonLink>
                    <ButtonLink to="/login" variant="secondary">
                      Log in
                    </ButtonLink>
                  </div>
                  <p className="text-[0.76rem] leading-relaxed text-muted">No card for the first VOD pass. Cancel any time.</p>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <div className="flex flex-col gap-4">
            <SectionHeading eyebrow="FAQ" title={GTA.faqTitle} />
            <a href="#analyzer" className="inline-flex w-fit items-center gap-2 text-[0.9rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4 hover:decoration-ink">
              Back to the analyzer <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </Reveal>
        <Accordion items={GTA.faq} />
      </Container>
    </section>
  )
}

export function Gta6() {
  usePageTitle('GTA VI launch')
  return (
    <>
      <Hero />
      <AnchorRail />
      <Steps />
      <Creators />
      <Moments />
      <Detection />
      <Analyzer />
      <Faq />
      <Container>
        <div className="mt-6 flex flex-col gap-2 border-t border-line py-8">
          <p className="text-[0.8rem] leading-relaxed text-muted">{GTA.artCredit}</p>
          <p className="text-[0.8rem] leading-relaxed text-muted">{GTA.disclaimer}</p>
        </div>
      </Container>
      <CtaBand title={GTA.cta.title} text={GTA.cta.text} button={GTA.cta.button} />
    </>
  )
}
