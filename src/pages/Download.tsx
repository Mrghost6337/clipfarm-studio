import { ArrowLeft, Download, Laptop, Monitor } from 'lucide-react'
import { Link } from 'react-router'

import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { Tag } from '../components/Pill'
import { usePageTitle } from '../lib/title'
import { DESKTOP_DOWNLOADS } from '../shared/downloads'

const BUILDS: Array<{ id: 'macos' | 'windows'; name: string; note: string; icon: typeof Laptop }> = [
  {
    id: 'macos',
    name: 'Download for macOS',
    note: 'Apple silicon and Intel',
    icon: Laptop,
  },
  {
    id: 'windows',
    name: 'Download for Windows',
    note: 'Windows 10 and 11',
    icon: Monitor,
  },
]

export function DownloadPage() {
  usePageTitle('Download Clipfarm')

  return (
    <section className="py-14 sm:py-20">
      <Container className="max-w-4xl">
        <Link to="/studio" className="inline-flex items-center gap-2 text-[0.85rem] font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          Back to Studio
        </Link>

        <div className="mt-8 max-w-2xl">
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Desktop app</p>
          <h1 className="mt-2 text-[2.3rem] leading-[1.03] font-semibold tracking-[-0.045em] text-balance sm:text-[3.2rem]">Download Clipfarm</h1>
          <p className="mt-3 text-[1rem] leading-relaxed text-body">
            The desktop app runs transcription, face tracking and rendering on your computer, so long videos never leave your machine.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {BUILDS.map((build) => {
            const href = DESKTOP_DOWNLOADS[build.id]
            return (
              <Card key={build.id} className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-sand text-accent-ink">
                    <build.icon className="size-5" />
                  </span>
                  {!href && <Tag tone="peach">Coming soon</Tag>}
                </div>
                <div>
                  <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">{build.name}</h2>
                  <p className="mt-1 text-[0.85rem] text-muted">{build.note}</p>
                </div>
                {href ? (
                  <a href={href} className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[0.9rem] font-semibold text-white transition-colors hover:bg-ink-2">
                    <Download aria-hidden className="size-4" />
                    {build.name}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Not available yet"
                    className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-sand text-[0.9rem] font-semibold text-muted"
                  >
                    <Download aria-hidden className="size-4" />
                    {build.name}
                  </button>
                )}
              </Card>
            )
          })}
        </div>

        <p className="mt-6 rounded-[var(--radius-md)] border border-line bg-paper px-4 py-3 text-[0.9rem] leading-relaxed text-body">
          {DESKTOP_DOWNLOADS.windows ? 'The macOS app is coming soon.' : 'Desktop apps are coming soon.'}
        </p>
      </Container>
    </section>
  )
}
