import { AlertTriangle, ArrowRight, Check, Cpu, Film, Link2, Loader2, RotateCcw, UploadCloud } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { controlBase, Notice } from '../components/Field'
import { requestJson } from '../lib/api'
import { useAuth } from '../lib/auth'
import { cx } from '../lib/cx'
import { fileUrl, pipelineApi, statusLabel, type PipelineJob } from '../lib/pipeline'
import type { DashboardData } from '../shared/dashboard'
import { invoke, type AppState, type ModelInfo } from './bridge'
import { useAuthStatus, usePipelineStatus } from './hooks'

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

/** The desktop home: start a clip, see what the pipeline and the account hold. Real data only. */
export function DesktopHome() {
  const { user } = useAuth()
  const status = useAuthStatus()
  const pipeline = usePipelineStatus()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const input = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'' | 'link' | 'upload'>('')
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState<PipelineJob[] | null>(null)
  const [account, setAccount] = useState<DashboardData | null>(null)
  const [accountError, setAccountError] = useState('')
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [state, setState] = useState<AppState | null>(null)
  const name = (user?.name ?? (status?.state === 'signed-in' ? status.user.name : '')).split(' ')[0]

  useEffect(() => {
    if (params.get('new')) input.current?.focus()
  }, [params])

  const load = useCallback(async () => {
    const [app, models] = await Promise.all([invoke('state:get'), invoke('models:list')])
    setState(app)
    setModel(models.find((item) => item.id === app.selectedModel) ?? null)
    const dashboard = await requestJson<DashboardData>('/api/dashboard')
    if (dashboard.ok) setAccount(dashboard)
    else setAccountError(dashboard.error)
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await pipelineApi<PipelineJob[]>('/jobs?limit=12'))
    } catch {
      setJobs(null)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    if (pipeline?.state === 'ready') void loadJobs()
  }, [pipeline?.state, loadJobs])

  async function startLink(event: FormEvent) {
    event.preventDefault()
    if (!url.trim()) return
    setBusy('link')
    setError('')
    try {
      await pipelineApi<PipelineJob>('/jobs', { method: 'POST', body: JSON.stringify({ url: url.trim(), maxClips: 5 }) })
      navigate('/studio')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy('')
    }
  }

  async function startUpload(selected: File) {
    setBusy('upload')
    setError('')
    try {
      const form = new FormData()
      form.append('file', selected)
      const uploaded = await pipelineApi<{ path: string }>('/upload', { method: 'POST', body: form })
      await pipelineApi<PipelineJob>('/jobs', { method: 'POST', body: JSON.stringify({ url: uploaded.path, title: selected.name.replace(/\.[^.]+$/, ''), maxClips: 5 }) })
      navigate('/studio')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy('')
    }
  }

  const clips = (jobs ?? []).flatMap((job) => (job.result?.clips ?? []).map((clip) => ({ job, clip }))).slice(0, 8)
  const running = (jobs ?? []).filter((job) => !['done', 'failed', 'cancelled'].includes(job.status))
  const ready = pipeline?.state === 'ready'

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <header>
        <p className="text-[0.9rem] font-semibold text-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.04em]">
          {greeting()}
          {name ? `, ${name}` : ''}
        </h1>
      </header>

      <div className="grid grid-cols-[1.6fr_1fr] gap-5">
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-[1.3rem] font-semibold tracking-[-0.025em]">Make clips</h2>
            <p className="text-[0.9rem] text-muted">Paste a YouTube, Twitch or TikTok link, or upload a video from this PC.</p>
          </div>
          <form onSubmit={startLink} className="flex gap-2">
            <label htmlFor="quick-link" className="sr-only">
              Video link
            </label>
            <input id="quick-link" ref={input} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={cx(controlBase, 'h-12 flex-1 border-line-strong')} disabled={!ready || !!busy} />
            <Button type="submit" loading={busy === 'link'} disabled={!ready || !url.trim() || busy === 'upload'} icon={<Link2 aria-hidden className="size-4" />}>
              Make clips
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <input ref={file} type="file" accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm,.m4v" className="sr-only" tabIndex={-1} onChange={(event) => event.target.files?.[0] && void startUpload(event.target.files[0])} />
            <Button variant="secondary" disabled={!ready || !!busy} loading={busy === 'upload'} icon={<UploadCloud aria-hidden className="size-4" />} onClick={() => file.current?.click()}>
              Upload a video
            </Button>
            <p className="text-[0.8rem] text-muted">MP4, MOV, MKV or WebM. It stays on this PC.</p>
          </div>
          {!ready && <Notice tone="info">The pipeline is {pipeline?.state === 'failed' ? 'stopped' : 'starting'}. You can start a clip as soon as it runs.</Notice>}
          {error && <Notice>{error}</Notice>}
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[1.05rem] font-semibold">Pipeline</h2>
              <span className={cx('inline-flex items-center gap-1.5 text-[0.82rem] font-semibold', ready ? 'text-success' : pipeline?.state === 'failed' ? 'text-danger' : 'text-muted')}>
                {ready ? <Check aria-hidden className="size-4" /> : pipeline?.state === 'failed' ? <AlertTriangle aria-hidden className="size-4" /> : <Loader2 aria-hidden className="size-4 animate-spin" />}
                {ready ? `Running on port ${pipeline?.port}` : pipeline?.state === 'failed' ? 'Stopped' : 'Starting'}
              </span>
            </div>
            {running.length > 0 && <p className="text-[0.85rem] text-body">{running.length === 1 ? `${statusLabel(running[0])}: ${running[0].title ?? running[0].url}` : `${running.length} jobs in progress`}</p>}
            {pipeline?.state === 'failed' && (
              <>
                <p className="text-[0.82rem] text-danger">{pipeline.error}</p>
                <Button size="sm" variant="secondary" icon={<RotateCcw aria-hidden className="size-4" />} onClick={() => void invoke('pipeline:restart')}>
                  Restart the pipeline
                </Button>
              </>
            )}
          </Card>
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[1.05rem] font-semibold">Speech model</h2>
              <Cpu aria-hidden className="size-4 text-muted" />
            </div>
            {model?.installed ? (
              <p className="text-[0.9rem] text-body">Whisper {model.label} is installed and in use.</p>
            ) : (
              <p className="text-[0.9rem] text-body">{state?.selectedModel ? 'The selected model is missing.' : 'No model installed yet.'}</p>
            )}
            <Link to="/dashboard/settings#models" className="inline-flex min-h-10 items-center text-[0.85rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
              Manage models
            </Link>
          </Card>
        </div>
      </div>

      <section aria-labelledby="recent-local">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="recent-local" className="text-[1.3rem] font-semibold tracking-[-0.025em]">
            Recent clips on this PC
          </h2>
          {clips.length > 0 && (
            <Link to="/studio" className="inline-flex min-h-10 items-center gap-1 text-[0.88rem] font-semibold text-ink hover:underline">
              Open the Studio <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
        {clips.length ? (
          <ul className="grid grid-cols-4 gap-4">
            {clips.map(({ job, clip }) => (
              <li key={`${job.id}-${clip.id}`}>
                <Link to="/studio" className="group block overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1">
                  {clip.files.poster ? <img src={fileUrl(clip.files.poster)} alt="" className="aspect-[9/16] w-full object-cover" /> : <span className="grid aspect-[9/16] place-items-center bg-ink/10 text-muted"><Film aria-hidden className="size-6" /></span>}
                  <span className="block p-3">
                    <span className="line-clamp-2 text-[0.85rem] font-semibold">{clip.title}</span>
                    <span className="mt-0.5 block truncate text-[0.75rem] text-muted">{job.title ?? job.result?.video.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card tone="sand" className="flex items-center gap-4">
            <Film aria-hidden className="size-6 text-muted" />
            <p className="text-[0.92rem] text-body">{jobs === null && !ready ? 'Clips appear here once the pipeline is running.' : 'No clips yet. Paste a link or upload a video above to make your first ones.'}</p>
          </Card>
        )}
      </section>

      <section aria-labelledby="account-library">
        <h2 id="account-library" className="mb-3 text-[1.3rem] font-semibold tracking-[-0.025em]">
          In your account
        </h2>
        {account ? (
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Clips', account.summary.clips],
              ['Sources', account.summary.sources],
              ['Share-page views', account.summary.views],
            ].map(([label, value]) => (
              <Card key={label} className="flex flex-col gap-1">
                <span className="text-[0.78rem] font-semibold tracking-[0.06em] text-muted uppercase">{label}</span>
                <span className="text-[2rem] font-semibold tracking-[-0.04em] tabular-nums">{value}</span>
              </Card>
            ))}
            {account.sources.length > 0 && (
              <Card className="col-span-3">
                <ul className="divide-y divide-line">
                  {account.sources.slice(0, 4).map((source) => (
                    <li key={source.id} className="flex items-center justify-between gap-3 py-2.5 text-[0.9rem]">
                      <span className="truncate font-semibold">{source.title}</span>
                      <span className="shrink-0 text-muted">
                        {source.clips} clip{source.clips === 1 ? '' : 's'} · {source.platform}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : (
          <Card tone="sand">
            <p className="text-[0.92rem] text-body">{accountError || 'Loading your account…'}</p>
          </Card>
        )}
      </section>
    </div>
  )
}
