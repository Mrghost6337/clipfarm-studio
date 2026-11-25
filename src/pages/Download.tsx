import { ArrowLeft, Captions, Check, Cpu, Download, Laptop, Monitor, ScanFace, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { Eyebrow, Tag } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { usePageTitle } from '../lib/title'
import { DESKTOP_DOWNLOADS } from '../shared/downloads'

const RELEASES_API = 'https://api.github.com/repos/Mrghost6337/clipfarm-studio-releases/releases/latest'

type GitHubRelease = {
  assets?: Array<{ name?: string; browser_download_url?: string }>
}

/**
 * The URL setting wins. When it is empty, use the latest public release asset.
 * A private CI artifact is never used: without a public release the page says
 * "Coming soon".
 */
function useLatestWindowsInstaller() {
  const configured = DESKTOP_DOWNLOADS.windows
  const [href, setHref] = useState<string | null>(configured)
  const [checking, setChecking] = useState(!configured)

  useEffect(() => {
    if (configured) {
      setHref(configured)
      setChecking(false)
      return
    }

    const controller = new AbortController()
    fetch(RELEASES_API, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((response) => (response.ok ? (response.json() as Promise<GitHubRelease>) : null))
      .then((release) => {
        if (controller.signal.aborted) return
        const asset = release?.assets?.find((item) => item.name && /\.exe$/i.test(item.name) && !/\.blockmap$/i.test(item.name))
        setHref(asset?.browser_download_url ?? null)
      })
      .catch(() => {
        if (!controller.signal.aborted) setHref(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false)
      })

    return () => controller.abort()
  }, [configured])

  return { href, checking }
}

const WINDOWS_POINTS = ['Runs on your computer', 'Captions, face tracking and exports', 'One sign-in, no API key']

function WindowsCard({ href, checking }: { href: string | null; checking: boolean }) {
  return (
    <Card tone="ink" className="relative flex h-full flex-col overflow-hidden p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative flex flex-1 flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-white/10 text-white ring-1 ring-white/10">
            <Monitor className="size-6" strokeWidth={2} />
          </span>
          <Tag tone="peach">Windows 10 &amp; 11</Tag>
        </div>

        <div>
          <h2 className="text-[1.55rem] leading-tight font-semibold tracking-[-0.03em] text-white sm:text-[1.8rem]">Clipfarm Studio for Windows</h2>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-white/70">
            The full Studio and the local pipeline in one app. Your videos stay on your PC.
          </p>
        </div>

        <ul className="grid gap-2 text-[0.9rem] text-white/80">
          {WINDOWS_POINTS.map((line) => (
            <li key={line} className="flex items-center gap-2.5">
              <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/20 text-accent">
                <Check className="size-3" strokeWidth={3.5} />
              </span>
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          {href ? (
            <a
              href={href}
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-paper px-6 text-[1rem] font-semibold text-ink shadow-[var(--shadow-card)] transition-[background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] hover:bg-sand focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-white active:scale-[0.98]"
            >
              <Download aria-hidden className="size-5" />
              Download for Windows
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-busy={checking || undefined}
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-6 text-[1rem] font-semibold text-white/55 disabled:cursor-not-allowed"
            >
              <Download aria-hidden className="size-5" />
              {checking ? 'Checking the latest build…' : 'Coming soon'}
            </button>
          )}
          <p className="mt-3 text-center text-[0.78rem] leading-relaxed text-white/55">
            {href
              ? 'The installer comes from the official GitHub release. It is not code-signed yet.'
              : checking
                ? 'Looking for the latest public build.'
                : 'No public Windows build is available yet.'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function MacCard() {
  return (
    <Card tone="sand" className="flex h-full flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <span aria-hidden className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-paper text-ink shadow-[var(--shadow-card)]">
          <Laptop className="size-6" strokeWidth={2} />
        </span>
        <Tag tone="peach">Coming soon</Tag>
      </div>

      <div>
        <h2 className="text-[1.55rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[1.8rem]">Clipfarm Studio for macOS</h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-body">Apple silicon and Intel.</p>
      </div>

      <div className="mt-auto pt-2">
        <button
          type="button"
          disabled
          className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-line-strong bg-paper/60 px-6 text-[1rem] font-semibold text-muted disabled:cursor-not-allowed"
        >
          <Laptop aria-hidden className="size-5" />
          Coming soon
        </button>
        <p className="mt-3 text-center text-[0.78rem] leading-relaxed text-muted">The macOS app is not available yet.</p>
      </div>
    </Card>
  )
}

const FEATURES = [
  {
    icon: Cpu,
    title: 'Runs on your PC',
    text: 'Download, transcription, face tracking and rendering happen on your computer. Your source video is not uploaded.',
  },
  {
    icon: Captions,
    title: 'Captions that ship',
    text: 'Word-level captions burned into the video, plus SRT, VTT and ASS files you can edit afterwards.',
  },
  {
    icon: ScanFace,
    title: 'The face stays in frame',
    text: 'A smoothed vertical crop follows the speaker, with a blurred layout when no face is found.',
  },
]

const STEPS = [
  {
    title: 'Download the installer',
    text: 'Use the Windows button above. The file is the official Clipfarm Studio installer from the public release.',
  },
  {
    title: 'Run it and allow Windows',
    text: 'Open the file. Windows may show “Windows protected your PC” because this build is not signed yet: choose More info, then Run anyway.',
  },
  {
    title: 'Sign in and finish setup',
    text: 'Open Clipfarm Studio, sign in in the browser window that opens, and follow the short first-run setup.',
  },
]

export function DownloadPage() {
  usePageTitle('Download Clipfarm')
  const { href: windowsHref, checking } = useLatestWindowsInstaller()

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="page-grid absolute inset-0" />
        <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[55%] opacity-55" />
        <Container className="relative max-w-5xl pt-12 pb-10 sm:pt-16 sm:pb-14">
          <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-[0.85rem] font-semibold text-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" />
            Back to home
          </Link>

          <div className="mt-9 max-w-3xl">
            <Eyebrow>Desktop app</Eyebrow>
            <h1 className="mt-5 text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.045em] text-balance sm:text-[3.8rem]">
              The whole Studio, on your computer.
            </h1>
            <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-body sm:text-[1.125rem]">
              Clipfarm Studio downloads, transcribes and renders on your PC. No upload, no API key, and every clip stays yours.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {['Windows 10 & 11', 'Runs locally', 'No upload'].map((item) => (
              <span key={item} className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-paper/70 px-3.5 text-[0.82rem] font-medium text-ink-2">
                <span aria-hidden className="round size-1.5 rounded-full bg-accent" />
                {item}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-12 sm:pb-16">
        <Container className="max-w-5xl">
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <Reveal>
              <WindowsCard href={windowsHref} checking={checking} />
            </Reveal>
            <Reveal delay={0.08}>
              <MacCard />
            </Reveal>
          </div>

          {!checking && !windowsHref && (
            <p className="mt-4 rounded-[var(--radius-md)] border border-line bg-paper px-4 py-3 text-[0.9rem] leading-relaxed text-body">
              The Windows installer is not public yet. This page links to it as soon as the first public GitHub release is published.
            </p>
          )}
        </Container>
      </section>

      <section className="pb-12 sm:pb-16">
        <Container className="max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2.3rem]">Built for the way you clip</h2>
            <p className="mt-3 text-[1rem] leading-relaxed text-body">The same pipeline as the website, running on the machine that holds your footage.</p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.06}>
                <Card className="flex h-full flex-col gap-4 p-6">
                  <span aria-hidden className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-sand text-accent-ink">
                    <feature.icon className="size-5" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em]">{feature.title}</h3>
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-body">{feature.text}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-14 sm:pb-20">
        <Container className="max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2.3rem]">Install on Windows 10 or 11</h2>
            <p className="mt-3 text-[1rem] leading-relaxed text-body">Three steps from the download to your first clip.</p>
          </div>

          <ol className="mt-7 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} as="li" delay={index * 0.06}>
                <div className="flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-paper p-6 shadow-[var(--shadow-card)]">
                  <span aria-hidden className="grid size-9 place-items-center rounded-full bg-ink text-[0.8rem] font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="text-[0.9rem] leading-relaxed text-body">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <div className="mt-5 flex gap-3 rounded-[var(--radius-md)] border border-[#ecd2ae] bg-peach/60 p-4 sm:items-start">
            <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
            <p className="text-[0.9rem] leading-relaxed text-ink-2">
              This build is not code-signed yet, so Windows SmartScreen may warn you. That is expected. Only install the file linked from this page, which comes from the official GitHub release.
            </p>
          </div>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ButtonLink to="/studio" variant="secondary">
              Prefer the browser? Open the Studio
            </ButtonLink>
            <p className="text-[0.85rem] text-muted">The browser Studio needs the local pipeline running on this computer.</p>
          </div>
        </Container>
      </section>
    </>
  )
}
