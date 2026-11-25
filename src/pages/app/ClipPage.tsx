import { ArrowUpRight, Copy, Download, ExternalLink, Link2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { AppLoading } from '../../components/AuthGate'
import { ButtonLink, IconButton } from '../../components/Button'
import { Card } from '../../components/Card'
import { ClipExports } from '../../components/ClipExports'
import { ScorePill } from '../../components/ClipList'
import { Notice } from '../../components/Field'
import { Logo } from '../../components/Logo'
import { Tag } from '../../components/Pill'
import { useToast } from '../../components/Toast'
import { copyText, exportHref, loadClip } from '../../lib/clipData'
import { useAuth } from '../../lib/auth'
import { formatAgo } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import { formatStamp, type Clip } from '../../shared/clips'

export function ClipPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [clip, setClip] = useState<Clip | null>(null)
  const [error, setError] = useState('')
  const [views, setViews] = useState(0)
  const viewed = useRef(false)

  usePageTitle(clip?.title ?? 'Clip')

  const load = useCallback(async () => {
    const res = await loadClip(id)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setClip(res.clip)
    setViews(res.clip.views)
    if (!viewed.current) {
      viewed.current = true
      void (async () => {
        try {
          const response = await fetch(`/api/clips/${id}/view`, { method: 'POST' })
          if (!response.ok) return
          const payload = (await response.json()) as { views?: number }
          if (payload.views) setViews(payload.views)
        } catch {
          // A view counter is never worth breaking the page for.
        }
      })()
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24">
        <Notice>{error}</Notice>
        <Link to="/dashboard/clips" className="mt-4 inline-flex h-10 items-center font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
          Back to clips
        </Link>
      </div>
    )
  }
  if (!clip) return <AppLoading label="Loading clip" rows={2} />

  const embed = clip.platform === 'YouTube' && clip.externalId ? `https://www.youtube.com/embed/${clip.externalId}?start=${Math.floor(clip.start)}&end=${Math.ceil(clip.end)}&rel=0` : null
  const sourceLink =
    clip.platform === 'YouTube' && clip.externalId
      ? `https://www.youtube.com/watch?v=${clip.externalId}&t=${Math.floor(clip.start)}s`
      : clip.sourceUrl

  async function copy(value: string, message: string) {
    const copied = await copyText(value)
    toast(copied ? message : 'Could not copy — select the text instead.')
  }

  return (
    <div className="min-h-svh bg-sand">
      <header className="border-b border-line bg-paper/90">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Tag tone="peach">Clip share page</Tag>
            <ButtonLink to={user ? '/dashboard' : '/signup'} variant="secondary" size="sm">
              {user ? 'Dashboard' : 'Start free'}
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-8 lg:py-12">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{clip.platform}</Tag>
            <span className="tabular-nums text-[0.8rem] font-semibold text-muted">
              {formatStamp(clip.start)}–{formatStamp(clip.end)} · {Math.round(clip.end - clip.start)}s
            </span>
            <ScorePill score={clip.score} />
            <span className="text-[0.8rem] text-muted">
              {views} view{views === 1 ? '' : 's'} · added {formatAgo(clip.createdAt)}
            </span>
          </div>
          <h1 className="max-w-3xl text-[2rem] leading-[1.06] font-semibold tracking-[-0.04em] text-balance sm:text-[2.7rem]">{clip.title}</h1>
          <p className="text-[0.92rem] text-body">
            From <a href={sourceLink} target="_blank" rel="noreferrer" className="font-semibold underline decoration-accent decoration-2 underline-offset-4">{clip.sourceTitle}</a>
            {clip.sourceAuthor ? ` · ${clip.sourceAuthor}` : ''}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="flex flex-col gap-4">
            {embed ? (
              <div className="overflow-hidden rounded-[var(--radius-lg)] bg-ink shadow-[var(--shadow-card)]">
                <iframe
                  src={embed}
                  title={clip.title}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-ink p-6 text-white shadow-[var(--shadow-card)]">
                <p className="text-[0.85rem] font-semibold text-white/60">Twitch source</p>
                <p className="text-[1.1rem] font-semibold">{clip.sourceTitle}</p>
                <p className="text-[0.88rem] text-white/70">Twitch clips need the Twitch player embed, which this share page does not ship. Open the source at {formatStamp(clip.start)} instead.</p>
                <a href={sourceLink} target="_blank" rel="noreferrer" className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-white px-5 text-[0.88rem] font-semibold text-ink">
                  <ExternalLink aria-hidden className="size-4" />
                  Open on Twitch
                </a>
              </div>
            )}

            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">Captions</h2>
                <div className="flex items-center gap-1.5">
                  <IconButton aria-label="Copy caption" title="Copy caption" className="size-9" onClick={() => copy(clip.excerpt, 'Caption copied')}>
                    <Copy className="size-4" />
                  </IconButton>
                  <a
                    href={exportHref(clip.id, 'srt')}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3 text-[0.82rem] font-semibold hover:border-ink"
                  >
                    <Download aria-hidden className="size-4" />
                    SRT
                  </a>
                </div>
              </div>
              <blockquote className="rounded-[var(--radius-md)] border-l-3 border-accent bg-sand p-4 text-[0.95rem] leading-relaxed">{clip.excerpt}</blockquote>
              <ul className="flex flex-col gap-2.5">
                {clip.cues.slice(0, 10).map((cue, index) => (
                  <li key={`${cue.start}-${index}`} className="flex gap-3 text-[0.85rem]">
                    <span className="w-12 shrink-0 font-semibold text-muted tabular-nums">{formatStamp(cue.start)}</span>
                    <span className="text-body">{cue.text}</span>
                  </li>
                ))}
              </ul>
              {clip.cues.length > 10 && <p className="text-[0.8rem] text-muted">+ {clip.cues.length - 10} more caption lines in the SRT file.</p>}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="flex flex-col gap-4">
              <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em]">Ship it</h2>
              <a href={sourceLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[0.88rem] font-semibold text-white hover:bg-ink-2">
                <ArrowUpRight aria-hidden className="size-4" />
                Open source at {formatStamp(clip.start)}
              </a>
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <p className="text-[0.72rem] font-semibold tracking-[0.1em] text-muted uppercase">Exports</p>
                <ClipExports clipId={clip.id} />
                <p className="text-[0.75rem] leading-relaxed text-muted">Captions, an EDL or MLT project, an Editly spec and an ffmpeg script — all from this cut.</p>
              </div>
              <button
                type="button"
                onClick={() => copy(window.location.href, 'Share link copied')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-5 text-[0.88rem] font-semibold hover:border-ink"
              >
                <Link2 aria-hidden className="size-4" />
                Copy share link
              </button>
            </Card>

            <Card tone="sand" className="flex flex-col gap-3">
              <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em]">Why this moment</h2>
              <p className="text-[0.88rem] leading-relaxed text-body">
                The detector scored every timed window of this VOD on the words actually spoken — laughter, disbelief, claims, questions and speech density — then picked the non-overlapping peaks. This one scored {clip.score}/100.
              </p>
              <dl className="mt-1 flex flex-col gap-2 text-[0.85rem]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Source</dt>
                  <dd className="truncate text-right font-semibold">{clip.sourceTitle}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Cut</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatStamp(clip.start)}–{formatStamp(clip.end)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Caption lines</dt>
                  <dd className="font-semibold tabular-nums">{clip.cues.length}</dd>
                </div>
              </dl>
            </Card>

            {user && (
              <Link to="/dashboard/clips" className="inline-flex h-10 items-center gap-2 px-1 text-[0.88rem] font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                Back to all clips
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
