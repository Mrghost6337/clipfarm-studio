import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Scissors,
  ServerOff,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, IconButton } from '../components/Button'
import { Card } from '../components/Card'
import { controlBase, Notice } from '../components/Field'
import { useToast } from '../components/Toast'
import { cx } from '../lib/cx'
import { usePageTitle } from '../lib/title'

const API =
  (import.meta.env.VITE_PIPELINE_API as string | undefined)?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? '/pipeline-api' : 'http://127.0.0.1:8787')

type Check = { key: string; label: string; ok: boolean; detail: string; required: boolean }
type VideoItem = {
  id: string
  title: string
  thumbnail: string | null
  duration: number | null
  url: string
  platform: string
  uploadDate: string | null
  channel?: string | null
}
type Clip = {
  id: string
  title: string
  start: number
  end: number
  duration: number
  layout: string
  score: number
  reason: string
  hashtags: string[]
  caption: string
  files: { mp4: string; srt: string; vtt: string; ass: string; poster: string | null }
}
type Job = {
  id: string
  url: string
  status: string
  stage: string
  progress: number
  message: string | null
  error: string | null
  title: string | null
  thumbnail: string | null
  duration: number | null
  platform: string | null
  created_at: string
  result: {
    language: string | null
    languageProbability: number
    video: { title: string; thumbnail: string | null; platform: string; url: string }
    clips: Clip[]
  } | null
}

const stamp = (seconds: number | null) =>
  seconds === null
    ? '—'
    : `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((data as { detail?: string }).detail || `Request failed (${response.status})`)
  return data as T
}

export function Local() {
  usePageTitle('Local pipeline')
  const toast = useToast()
  const [online, setOnline] = useState<boolean | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [systemOk, setSystemOk] = useState(false)
  const [presets, setPresets] = useState<string[]>(['bold'])
  const [preset, setPreset] = useState('bold')
  const [url, setUrl] = useState('')
  const [listing, setListing] = useState<{ kind: string; title?: string; items: VideoItem[]; hasMore?: boolean } | null>(null)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [usage, setUsage] = useState<{ bytes: number; files: number } | null>(null)
  const [posting, setPosting] = useState<{ youtube: { configured: boolean; note: string } } | null>(null)
  const [uploading, setUploading] = useState('')
  const sourceRef = useRef<EventSource | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [system, config, list, status] = await Promise.all([
        api<{ ok: boolean; checks: Check[] }>('/system'),
        api<{ presets: string[]; defaultPreset: string; usage: { bytes: number; files: number } }>('/config'),
        api<Job[]>('/jobs?limit=12'),
        api<{ youtube: { configured: boolean; note: string } }>('/posting/status'),
      ])
      setOnline(true)
      setChecks(system.checks)
      setSystemOk(system.ok)
      setPresets(config.presets)
      setPreset((current) => (config.presets.includes(current) ? current : config.defaultPreset))
      setUsage(config.usage)
      setJobs(list)
      setPosting(status)
      setJob((current) => current ?? list.find((item) => item.status === 'running') ?? list[0] ?? null)
    } catch {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!job || ['done', 'failed', 'cancelled'].includes(job.status)) return
    sourceRef.current?.close()
    const source = new EventSource(`${API}/jobs/${job.id}/events`)
    sourceRef.current = source
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as Job
      setJob(next)
      setJobs((current) => [next, ...current.filter((item) => item.id !== next.id)])
      if (['done', 'failed', 'cancelled'].includes(next.status)) source.close()
    }
    source.onerror = () => source.close()
    return () => source.close()
  }, [job?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function look() {
    if (!url.trim()) return
    setBusy(true)
    setError('')
    setListing(null)
    setOffset(0)
    try {
      const result = await api<{ kind: string; title?: string; items: VideoItem[]; hasMore?: boolean }>('/ingest', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), limit: 24, offset: 0 }),
      })
      setListing(result)
      if (result.kind === 'video' && result.items[0]) {
        toast('Video found. Press Clip to run the full pipeline.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that link.')
    } finally {
      setBusy(false)
    }
  }

  async function more() {
    if (!listing) return
    const next = offset + 24
    setBusy(true)
    try {
      const result = await api<{ items: VideoItem[]; hasMore?: boolean }>('/ingest', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), limit: 24, offset: next }),
      })
      setListing({ ...listing, items: [...listing.items, ...result.items], hasMore: result.hasMore })
      setOffset(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more.')
    } finally {
      setBusy(false)
    }
  }

  async function clip(videoUrl: string) {
    setBusy(true)
    setError('')
    try {
      const created = await api<Job>('/jobs', {
        method: 'POST',
        body: JSON.stringify({ url: videoUrl, preset, maxClips: 5 }),
      })
      setJob(created)
      setJobs((current) => [created, ...current])
      toast('Queued. Downloading, transcribing, analysing, rendering.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not queue that video.')
    } finally {
      setBusy(false)
    }
  }

  async function control(path: string, method: string) {
    try {
      await api(path, { method })
      if (path.includes('/jobs/') && method === 'DELETE') {
        const id = path.split('/')[2]
        setJobs((current) => current.filter((item) => item.id !== id))
        setJob(null)
      }
      await refresh()
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'That action failed.')
    }
  }

  async function clearCache() {
    if (!window.confirm('Delete downloaded source media? Rendered clips stay in the library.')) return
    try {
      const result = await api<{ usage: { bytes: number; files: number } }>('/cache', { method: 'DELETE' })
      setUsage(result.usage)
      toast('Media cache cleared')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not clear the cache.')
    }
  }

  async function copyCaption(clip: Clip) {
    try {
      await navigator.clipboard.writeText(clip.caption)
      toast('Caption and hashtags copied')
    } catch {
      toast('Clipboard blocked. Select the caption text instead.')
    }
  }

  async function upload(clip: Clip) {
    if (!job) return
    setUploading(clip.id)
    try {
      const result = await api<{ url: string; privacy: string }>('/publish/youtube', {
        method: 'POST',
        body: JSON.stringify({ jobId: job.id, clipId: clip.id, privacy: 'private' }),
      })
      toast(`Uploaded ${result.privacy}: ${result.url}`)
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Upload failed.')
    } finally {
      setUploading('')
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Local pipeline</p>
        <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.6rem]">Paste a link, get vertical clips</h1>
        <p className="max-w-2xl text-[0.95rem] leading-relaxed text-body">
          Download, transcription, moment detection, face tracking and the 1080×1920 render all run on your machine with yt-dlp, faster-whisper, OpenCV and
          ffmpeg. No account, no API key, no upload.
        </p>
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-peach/60 px-3 py-2 text-[0.8rem] leading-relaxed text-accent-ink">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          Only process videos you own or have permission to clip. Credit the creator when you post.
        </p>
      </header>

      {online === false && (
        <Card className="mt-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
              <ServerOff className="size-5" />
            </span>
            <div>
              <h2 className="text-[1.1rem] font-semibold">The local service is not running</h2>
              <p className="mt-1 text-[0.9rem] leading-relaxed text-body">
                The hosted site cannot run ffmpeg, Whisper or yt-dlp. Start the pipeline on your computer, then reload this page.
              </p>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-ink p-4 text-[0.78rem] leading-relaxed text-white">
            {`python3 -m venv .venv\n.venv/bin/pip install -r requirements.txt\nbash scripts/setup.sh\n.venv/bin/python -m pipeline.cli serve`}
          </pre>
          <p className="text-[0.8rem] text-muted">
            Expected at <code className="rounded bg-sand px-1 py-0.5">{API}</code>. Override with <code className="rounded bg-sand px-1 py-0.5">VITE_PIPELINE_API</code>.
          </p>
        </Card>
      )}

      {online && (
        <>
          <Card className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void look()
                }}
                placeholder="https://youtube.com/@channel or https://youtube.com/watch?v=…"
                className={cx(controlBase, 'h-12 flex-1 border-line-strong')}
                aria-label="Video or channel link"
              />
              <Button onClick={look} loading={busy} className="h-12 shrink-0">
                Show videos
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="preset" className="text-[0.8rem] font-semibold text-ink-2">
                Caption style
              </label>
              <select id="preset" value={preset} onChange={(event) => setPreset(event.target.value)} className={cx(controlBase, 'h-9 w-auto border-line-strong')}>
                {presets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="text-[0.78rem] text-muted">1080×1920 · 30 fps · loudness −14 LUFS · burned-in word-synced captions</span>
            </div>
            {error && <Notice>{error}</Notice>}
          </Card>

          {listing && (
            <section className="mt-8 flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">{listing.kind === 'channel' ? listing.title || 'Channel' : 'Video'}</h2>
                  <p className="text-[0.8rem] text-muted">{listing.items.length} loaded · {listing.items[0]?.platform}</p>
                </div>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {listing.items.map((item) => (
                  <li key={`${item.id}-${item.url}`}>
                    <Card className="flex h-full flex-col gap-3 p-3">
                      <span className="relative block aspect-video overflow-hidden rounded-[var(--radius-sm)] bg-ink/10">
                        {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" className="size-full object-cover" /> : null}
                        {item.duration ? (
                          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[0.7rem] font-semibold text-white tabular-nums">{stamp(item.duration)}</span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-[0.9rem] leading-snug font-semibold">{item.title}</span>
                      <span className="text-[0.72rem] text-muted">{item.uploadDate || item.channel || item.platform}</span>
                      <div className="mt-auto flex gap-2">
                        <Button size="sm" onClick={() => clip(item.url)} loading={busy}>
                          <Scissors aria-hidden className="size-3.5" /> Clip
                        </Button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[0.78rem] font-semibold text-muted hover:text-ink"
                        >
                          Source <ExternalLink aria-hidden className="size-3" />
                        </a>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
              {listing.hasMore && (
                <Button variant="secondary" onClick={more} loading={busy} className="self-center">
                  Load more
                </Button>
              )}
            </section>
          )}

          {job && (
            <section className="mt-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">{job.result?.video.title || job.title || 'Current job'}</h2>
                <div className="flex gap-1.5">
                  {!['done', 'failed', 'cancelled'].includes(job.status) && (
                    <Button size="sm" variant="secondary" onClick={() => control(`/jobs/${job.id}/cancel`, 'POST')}>
                      Cancel
                    </Button>
                  )}
                  {['failed', 'cancelled'].includes(job.status) && (
                    <Button size="sm" variant="secondary" onClick={() => control(`/jobs/${job.id}/retry`, 'POST')}>
                      <RefreshCw aria-hidden className="size-3.5" /> Retry
                    </Button>
                  )}
                  <IconButton aria-label="Delete this job" title="Delete job and files" onClick={() => control(`/jobs/${job.id}`, 'DELETE')}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>

              <Card className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 text-[0.8rem] font-semibold">
                  <span className="inline-flex items-center gap-2">
                    {job.status === 'running' && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
                    {job.status === 'done' && <CheckCircle2 aria-hidden className="size-3.5 text-success" />}
                    {job.status === 'failed' && <XCircle aria-hidden className="size-3.5 text-danger" />}
                    {job.stage}
                  </span>
                  <span className="tabular-nums text-muted">{Math.round(job.progress * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-accent-ink transition-[width]" style={{ width: `${Math.max(2, job.progress * 100)}%` }} />
                </div>
                <p className="text-[0.82rem] text-muted">{job.error || job.message}</p>
                {job.result && (
                  <p className="text-[0.78rem] text-muted">
                    Language: <b>{job.result.language}</b> ({Math.round(job.result.languageProbability * 100)}% confidence) · {job.result.clips.length} clips ·{' '}
                    {stamp(job.duration)} source
                  </p>
                )}
              </Card>

              {job.result && (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {job.result.clips.map((clip) => (
                    <li key={clip.id}>
                      <Card className="flex h-full flex-col gap-3 p-3">
                        <video src={`${API}${clip.files.mp4}`} poster={clip.files.poster ? `${API}${clip.files.poster}` : undefined} controls playsInline className="aspect-[9/16] w-full rounded-[var(--radius-sm)] bg-ink object-contain" />
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[0.95rem] leading-snug font-semibold">{clip.title}</h3>
                          <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[0.72rem] font-semibold tabular-nums">{clip.score}</span>
                        </div>
                        <p className="text-[0.75rem] text-muted">{stamp(clip.start)}–{stamp(clip.end)} · {clip.layout} crop</p>
                        <p className="text-[0.8rem] font-medium text-accent-ink">{clip.hashtags.join(' ')}</p>
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          <a
                            href={`${API}${clip.files.mp4}`}
                            download
                            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[0.78rem] font-semibold text-white hover:bg-ink-2"
                          >
                            <Download aria-hidden className="size-3.5" /> MP4
                          </a>
                          <a href={`${API}${clip.files.srt}`} download className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[0.78rem] font-semibold hover:border-ink">
                            SRT
                          </a>
                          <a href={`${API}${clip.files.vtt}`} download className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[0.78rem] font-semibold hover:border-ink">
                            VTT
                          </a>
                          <button type="button" onClick={() => copyCaption(clip)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[0.78rem] font-semibold hover:border-ink">
                            <Clipboard aria-hidden className="size-3.5" /> Caption
                          </button>
                          <a
                            href="https://www.tiktok.com/upload"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[0.78rem] font-semibold hover:border-ink"
                          >
                            <UploadCloud aria-hidden className="size-3.5" /> TikTok
                          </a>
                          {posting?.youtube.configured && (
                            <button
                              type="button"
                              onClick={() => upload(clip)}
                              disabled={uploading === clip.id}
                              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[0.78rem] font-semibold hover:border-ink disabled:opacity-50"
                            >
                              <Play aria-hidden className="size-3.5" /> {uploading === clip.id ? 'Uploading…' : 'YouTube'}
                            </button>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}

              {posting && (
                <p className="text-[0.76rem] leading-relaxed text-muted">
                  Download and copy-caption always work. {posting.youtube.note} TikTok and Instagram direct posting need an approved developer app, so this page
                  opens their official upload page instead of automating a login.
                </p>
              )}
            </section>
          )}

          <section className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className={cx('size-2.5 rounded-full', systemOk ? 'bg-success' : 'bg-danger')} />
                <h2 className="text-[1.05rem] font-semibold">System check</h2>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {checks.map((check) => (
                  <li key={check.key} className="flex items-start gap-1.5 text-[0.78rem]">
                    {check.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" /> : <XCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-danger" />}
                    <span className="min-w-0">
                      <b className="font-semibold">{check.label}</b>
                      <span className="block truncate text-muted" title={check.detail}>
                        {check.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HardDrive aria-hidden className="size-4 text-accent-ink" />
                <h2 className="text-[1.05rem] font-semibold">Disk</h2>
              </div>
              <p className="text-[0.9rem] text-body">
                {usage ? `${(usage.bytes / 1024 / 1024).toFixed(1)} MB` : '—'} across {usage?.files ?? 0} files
              </p>
              <Button size="sm" variant="secondary" onClick={clearCache} className="self-start">
                Clear media cache
              </Button>
              <p className="text-[0.75rem] leading-relaxed text-muted">Clearing removes downloaded sources and audio. Rendered clips and their captions stay.</p>
            </Card>
          </section>

          {jobs.length > 0 && (
            <section className="mt-8 flex flex-col gap-3">
              <h2 className="text-[1.1rem] font-semibold">Library</h2>
              <ul className="flex flex-col gap-2">
                {jobs.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setJob(item)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-[var(--radius-md)] border bg-paper p-2.5 text-left transition-colors',
                        job?.id === item.id ? 'border-ink' : 'border-line hover:border-line-strong',
                      )}
                    >
                      <span className="aspect-video w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-ink/10">
                        {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" className="size-full object-cover" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[0.88rem] font-semibold">{item.title || item.url}</span>
                        <span className="text-[0.74rem] text-muted">
                          {item.platform} · {item.status} · {item.result?.clips.length ?? 0} clips · {stamp(item.duration)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
