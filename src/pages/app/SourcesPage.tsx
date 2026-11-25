import { ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { AnalyzeForm } from '../../components/AnalyzeForm'
import { AppLoading, useRequireAuth } from '../../components/AuthGate'
import { Button, IconButton } from '../../components/Button'
import { Card } from '../../components/Card'
import { Notice, TextArea } from '../../components/Field'
import { Tag } from '../../components/Pill'
import { useToast } from '../../components/Toast'
import { addTranscript, deleteSource, loadSources, retrySource } from '../../lib/clipData'
import { cx } from '../../lib/cx'
import { formatAgo } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import { formatStamp, type ClipSource } from '../../shared/clips'

const badge = (source: ClipSource) =>
  source.status === 'ready'
    ? { label: `${source.clips} clip${source.clips === 1 ? '' : 's'}`, className: 'bg-success-soft text-success' }
    : source.status === 'failed'
      ? { label: 'Failed', className: 'bg-danger-soft text-danger' }
      : { label: 'Needs transcript', className: 'bg-peach text-accent-ink' }

export function SourcesPage() {
  usePageTitle('Sources')
  const { ready } = useRequireAuth({ onboarded: true, plan: true })
  const toast = useToast()
  const [sources, setSources] = useState<ClipSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transcriptFor, setTranscriptFor] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const res = await loadSources()
    setLoading(false)
    if (res.ok) {
      setSources(res.sources)
      setError('')
    } else {
      setError(res.error)
    }
  }, [])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  async function retry(source: ClipSource) {
    setBusy(source.id)
    const res = await retrySource(source.id)
    setBusy('')
    if (!res.ok) {
      toast(res.error)
      await load()
      return
    }
    toast(`${res.created} clip${res.created === 1 ? '' : 's'} found again`)
    await load()
  }

  async function remove(source: ClipSource) {
    if (!window.confirm(`Delete “${source.title}” and every clip cut from it? This cannot be undone.`)) return
    setBusy(source.id)
    const removed = await deleteSource(source.id)
    setBusy('')
    if (!removed) {
      toast('That source could not be deleted.')
      return
    }
    toast('Source deleted')
    await load()
  }

  async function submitTranscript(source: ClipSource) {
    setBusy(source.id)
    const res = await addTranscript(source.id, transcript)
    setBusy('')
    if (!res.ok) {
      toast(res.error)
      return
    }
    setTranscriptFor(null)
    setTranscript('')
    toast(`${res.created} clip${res.created === 1 ? '' : 's'} detected`)
    await load()
  }

  if (!ready) return <AppLoading label="Loading your sources" rows={3} />

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Sources</p>
        <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">Analyze a VOD</h1>
        <p className="max-w-2xl text-[0.95rem] text-body">Paste a public YouTube video, Twitch VOD or Twitch clip. Clipfarm reads the real video and cuts its strongest moments — never a demo dataset.</p>
      </header>

      {error && <Notice>{error}</Notice>}

      <Card className="flex flex-col gap-5">
        <AnalyzeForm onAnalyzed={load} />
        <p className="border-t border-line pt-4 text-[0.8rem] leading-relaxed text-muted">
          Detection reads timed captions when the platform serves them, then the creator’s own chapter markers. If a video has neither, the source is kept and you can paste its transcript to run the same detector. Every clip lands on a shareable page with an SRT caption file.
        </p>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="source-list">
        <div className="flex items-center justify-between gap-3">
          <h2 id="source-list" className="text-[1.2rem] font-semibold tracking-[-0.02em]">
            Your sources
          </h2>
          <Tag>{sources.length}</Tag>
        </div>

        {loading ? (
          <Card>
            <p className="text-[0.9rem] text-muted">Loading sources…</p>
          </Card>
        ) : sources.length ? (
          <ul className="flex flex-col gap-3">
            {sources.map((source) => {
              const status = badge(source)
              return (
                <li key={source.id}>
                  <Card className="flex flex-col gap-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <span className="aspect-video w-full shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-ink/8 sm:w-36">
                        {source.thumbnail ? <img src={source.thumbnail} alt="" loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[0.75rem] text-muted">{source.platform}</span>}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[1rem] leading-snug font-semibold underline-offset-4 hover:underline">
                            {source.title}
                            <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted" />
                          </a>
                          <span className={cx('inline-flex h-7 items-center rounded-full px-2.5 text-[0.75rem] font-semibold', status.className)}>{status.label}</span>
                        </div>
                        <p className="text-[0.8rem] text-muted">
                          {source.platform}
                          {source.duration ? ` · ${formatStamp(source.duration)}` : ''}
                          {source.method ? ` · ${source.method === 'chapters' ? 'chapter markers' : 'transcript'}` : ''} · added {formatAgo(source.createdAt)}
                        </p>
                        {source.error && <p className="text-[0.82rem] text-muted">{source.error}</p>}
                        {source.clips > 0 && (
                          <Link to="/dashboard/clips" className="w-fit text-[0.82rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
                            View {source.clips} clip{source.clips === 1 ? '' : 's'}
                          </Link>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {source.status === 'needs_transcript' && (
                          <Button size="sm" variant="secondary" onClick={() => setTranscriptFor(transcriptFor === source.id ? null : source.id)}>
                            Add transcript
                          </Button>
                        )}
                        <IconButton aria-label="Analyze this link again" title="Analyze again" className="size-9" disabled={busy === source.id} onClick={() => retry(source)}>
                          <RotateCcw className="size-4" />
                        </IconButton>
                        <IconButton aria-label="Delete this source" title="Delete source" className="size-9 text-danger" disabled={busy === source.id} onClick={() => remove(source)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </div>

                    {transcriptFor === source.id && (
                      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line-strong bg-sand p-4">
                        <p className="text-[0.85rem] leading-relaxed text-body">
                          Paste the transcript with timestamps. On YouTube open the video, choose <b>…more</b> then <b>Show transcript</b>, and copy the lines.
                        </p>
                        <TextArea label="Transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={6} placeholder={'0:00 hello chat\n0:14 that was insane'} />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" loading={busy === source.id} onClick={() => submitTranscript(source)}>
                            Detect clips
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setTranscriptFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : (
          <Card className="flex flex-col items-center gap-2 py-12 text-center">
            <h2 className="text-[1.1rem] font-semibold">Nothing analyzed yet</h2>
            <p className="max-w-md text-[0.9rem] text-muted">Your sources appear here with their status, the method used to find moments and how many clips came out.</p>
          </Card>
        )}
      </section>
    </div>
  )
}
