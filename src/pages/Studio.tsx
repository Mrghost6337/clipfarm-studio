import {
  AlertTriangle,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Film,
  Gauge,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Redo2,
  ScanFace,
  Scissors,
  Search,
  Settings2,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  Undo2,
  UploadCloud,
  Video,
  Wand2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { Button, ButtonLink, IconButton } from '../components/Button'
import { controlBase, Notice } from '../components/Field'
import { Logo } from '../components/Logo'
import { Drawer } from '../components/Overlay'
import { useToast } from '../components/Toast'
import { cx } from '../lib/cx'
import { PipelineConnect, usePipelineStatus } from '../components/PipelineConnect'
import { connectPipeline, eventsUrl, fileUrl, pipelineApi, stamp, statusLabel, type PipelineClip, type PipelineJob, type PipelineListing } from '../lib/pipeline'
import { usePageTitle } from '../lib/title'

type SourceTab = 'channels' | 'link' | 'upload'
type InspectorTab = 'clips' | 'style' | 'layout' | 'publish'
type Channel = { url: string; title: string; thumbnail: string | null; platform: string }
type Verdict = 'approved' | 'rejected'

const PRESETS = [
  { id: 'bold', name: 'Bold', font: 'Anton', note: 'White + lime active word' },
  { id: 'clean', name: 'Clean', font: 'Bebas Neue', note: 'Narrow, orange highlight' },
  { id: 'box', name: 'Box', font: 'Noto Sans', note: 'Dark box, long words' },
]

const LAYOUTS = [
  { id: 'auto', name: 'Auto', note: 'Face when found, blurred when not' },
  { id: 'face', name: 'Talking head', note: 'Face crop fills the frame' },
  { id: 'blurred', name: 'Blurred background', note: 'Full source over a soft blur' },
]

const STEPS = [
  { id: 1, label: 'Source' },
  { id: 2, label: 'Analyze' },
  { id: 3, label: 'Review clips' },
  { id: 4, label: 'Edit' },
  { id: 5, label: 'Publish' },
]

const readStore = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const saveStore = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be full or blocked; editor still works in memory */
  }
}

function statusTone(status: string) {
  if (status === 'done') return 'bg-success-soft text-success'
  if (status === 'failed') return 'bg-danger-soft text-danger'
  if (status === 'cancelled') return 'bg-sand text-ink-2'
  return 'bg-peach text-accent-ink'
}

export function Studio() {
  usePageTitle('Studio')
  const toast = useToast()
  const [online, setOnline] = useState<boolean | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const pipeline = usePipelineStatus()
  const [jobs, setJobs] = useState<PipelineJob[]>([])
  const [activeId, setActiveId] = useState('')
  const [clipId, setClipId] = useState('')
  const [sourceTab, setSourceTab] = useState<SourceTab>('channels')
  const [inspector, setInspector] = useState<InspectorTab>('clips')
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  const [channelUrl, setChannelUrl] = useState('')
  const [channels, setChannels] = useState<Channel[]>(() => readStore<Channel[]>('clipfarm.studio.channels', []))
  const [listing, setListing] = useState<PipelineListing | null>(null)
  const [listingChannel, setListingChannel] = useState<Channel | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'longest' | 'title'>('newest')

  const [preset, setPreset] = useState('bold')
  const [layout, setLayout] = useState('auto')
  const [hook, setHook] = useState(true)
  const [hookTitle, setHookTitle] = useState('')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(30)
  const [safeZone, setSafeZone] = useState(() => readStore('clipfarm.studio.safeZone', true))
  const [zoom, setZoom] = useState(100)
  const [captionText, setCaptionText] = useState('')
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({ youtube: true, tiktok: true, instagram: false })
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>(() => readStore('clipfarm.studio.verdicts', {}))

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [posting, setPosting] = useState<{ youtube: { configured: boolean; note: string } } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeJob = jobs.find((job) => job.id === activeId) ?? null
  const result = activeJob?.result ?? null
  const clips = result?.clips ?? []
  const clip = clips.find((item) => item.id === clipId) ?? clips[0] ?? null
  const duration = activeJob?.duration || result?.video.duration || 0
  const running = Boolean(activeJob && !['done', 'failed', 'cancelled'].includes(activeJob.status))
  const sourceTime = clip ? clip.start + currentTime : 0
  const words = result?.transcript.words ?? []

  const loadJobs = useCallback(async () => {
    try {
      const list = await pipelineApi<PipelineJob[]>('/jobs?limit=40')
      setOnline(true)
      setFailure(null)
      setJobs(list)
      setActiveId((current) => (current && list.some((job) => job.id === current) ? current : list[0]?.id ?? ''))
      const status = await pipelineApi<{ youtube: { configured: boolean; note: string } }>('/posting/status').catch(() => null)
      if (status) setPosting(status)
    } catch (error) {
      setOnline(false)
      setFailure(error instanceof Error ? error.message : null)
    }
  }, [])

  useEffect(() => {
    void connectPipeline()
  }, [])

  useEffect(() => {
    if (pipeline.state === 'ready') void loadJobs()
  }, [pipeline.state, loadJobs])

  useEffect(() => {
    if (!result) {
      setClipId('')
      return
    }
    setClipId((current) => (result.clips.some((item) => item.id === current) ? current : result.clips[0]?.id ?? ''))
  }, [activeJob?.id, activeJob?.status, result])

  useEffect(() => {
    setProjectTitle(activeJob?.title || result?.video.title || '')
  }, [activeJob?.id, activeJob?.title, result?.video.title])

  useEffect(() => saveStore('clipfarm.studio.channels', channels), [channels])
  useEffect(() => saveStore('clipfarm.studio.verdicts', verdicts), [verdicts])
  useEffect(() => saveStore('clipfarm.studio.safeZone', safeZone), [safeZone])

  useEffect(() => {
    if (!clip) return
    setPreset(clip.preset || activeJob?.preset || 'bold')
    setLayout(clip.layout === 'face' ? 'face' : clip.layout === 'blurred' ? 'blurred' : 'auto')
    setHook(clip.hook !== false)
    setHookTitle(clip.title)
    setTrimStart(clip.start)
    setTrimEnd(clip.end)
    setCaptionText(`${clip.title}\n\n${clip.hashtags.join(' ')}`)
    setCurrentTime(0)
  }, [clip?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeJob || !running) return
    const source = new EventSource(eventsUrl(activeJob.id))
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as PipelineJob
      setJobs((current) => current.map((job) => (job.id === next.id ? next : job)))
      if (['done', 'failed', 'cancelled'].includes(next.status)) source.close()
    }
    source.onerror = () => source.close()
    return () => source.close()
  }, [activeJob?.id, running])

  useEffect(() => {
    if (!clip || !videoRef.current) return
    videoRef.current.currentTime = 0
    setCurrentTime(0)
    setPlaying(false)
  }, [clip?.id, clip?.files.mp4])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === ' ') {
        event.preventDefault()
        play()
      }
      if (event.key.toLowerCase() === 'j') skip(-5)
      if (event.key.toLowerCase() === 'k') play()
      if (event.key.toLowerCase() === 'l') skip(5)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play, clip?.id])

  function skip(delta: number) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta))
  }

  async function readLink(value: string) {
    if (!value.trim()) return
    setBusy(true)
    setError('')
    try {
      const data = await pipelineApi<PipelineListing>('/ingest', { method: 'POST', body: JSON.stringify({ url: value.trim(), limit: 24 }) })
      setListing(data)
      if (data.kind === 'channel') {
        const channel: Channel = { url: value.trim(), title: data.title || 'Channel', thumbnail: data.items[0]?.thumbnail ?? null, platform: data.platform }
        setChannels((current) => [channel, ...current.filter((item) => item.url !== channel.url)].slice(0, 8))
        setListingChannel(channel)
        setSourceTab('channels')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That link could not be read.')
    } finally {
      setBusy(false)
    }
  }

  async function loadMore() {
    if (!listing || !listingChannel) return
    setBusy(true)
    try {
      const next = await pipelineApi<PipelineListing>('/ingest', {
        method: 'POST',
        body: JSON.stringify({ url: listingChannel.url, limit: 24, offset: listing.items.length }),
      })
      setListing({ ...listing, items: [...listing.items, ...next.items], hasMore: next.hasMore })
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not load more videos.')
    } finally {
      setBusy(false)
    }
  }

  async function startJob(url: string) {
    setBusy(true)
    setError('')
    try {
      const job = await pipelineApi<PipelineJob>('/jobs', { method: 'POST', body: JSON.stringify({ url, preset, maxClips: 5 }) })
      setJobs((current) => [job, ...current])
      setActiveId(job.id)
      setClipId('')
      toast('Queued. Downloading, transcribing, analyzing, rendering.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start that job.')
    } finally {
      setBusy(false)
    }
  }

  async function upload(file: File) {
    setUploading(true)
    setError('')
    setUploadName(file.name)
    try {
      const form = new FormData()
      form.append('file', file)
      const uploaded = await pipelineApi<{ path: string }>('/upload', { method: 'POST', body: form })
      await startJob(uploaded.path)
      toast('Upload received. The local pipeline is starting.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function control(path: string, method: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    try {
      await pipelineApi(path, { method })
      if (method === 'DELETE') {
        setJobs((current) => current.filter((job) => job.id !== path.split('/')[2]))
        setActiveId('')
      }
      await loadJobs()
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'That action failed.')
    }
  }

  function snap(time: number) {
    if (!words.length) return time
    let best = time
    let distance = Infinity
    for (const word of words) {
      const candidate = Math.abs(word.start - time) < Math.abs(word.end - time) ? word.start : word.end
      if (Math.abs(candidate - time) < distance) {
        distance = Math.abs(candidate - time)
        best = candidate
      }
    }
    return Math.max(0, Math.min(duration, best))
  }

  async function applyRender() {
    if (!activeJob || !clip) return
    setRendering(true)
    try {
      const updated = await pipelineApi<PipelineClip>(`/jobs/${activeJob.id}/clips/${clip.id}/render`, {
        method: 'POST',
        body: JSON.stringify({ preset, layout, title: hookTitle, hook, start: trimStart, end: trimEnd }),
      })
      setJobs((current) =>
        current.map((job) =>
          job.id === activeJob.id && job.result
            ? { ...job, result: { ...job.result, clips: job.result.clips.map((item) => (item.id === updated.id ? updated : item)) } }
            : job,
        ),
      )
      toast('Clip re-rendered with the new settings')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Re-render failed.')
    } finally {
      setRendering(false)
    }
  }

  async function saveProjectTitle() {
    if (!activeJob) return
    try {
      await pipelineApi(`/jobs/${activeJob.id}`, { method: 'PATCH', body: JSON.stringify({ title: projectTitle }) })
    } catch {
      /* the label still autosaves locally; the job title is cosmetic */
    }
  }

  async function downloadFile(url: string, name: string) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('download failed')
      const blob = await response.blob()
      const anchor = document.createElement('a')
      anchor.href = URL.createObjectURL(blob)
      anchor.download = name
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(anchor.href), 2000)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  async function uploadYouTube() {
    if (!activeJob || !clip) return
    setRendering(true)
    try {
      const data = await pipelineApi<{ url: string; privacy: string }>('/publish/youtube', {
        method: 'POST',
        body: JSON.stringify({ jobId: activeJob.id, clipId: clip.id, privacy: 'private' }),
      })
      toast(`Uploaded ${data.privacy}: ${data.url}`)
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'YouTube upload failed.')
    } finally {
      setRendering(false)
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(captionText)
      toast('Caption and hashtags copied')
    } catch {
      toast('Clipboard blocked. Select the caption text instead.')
    }
  }

  function setVerdict(next: Verdict) {
    if (!clip) return
    setVerdicts((current) => {
      const copy = { ...current }
      if (copy[clip.id] === next) delete copy[clip.id]
      else copy[clip.id] = next
      return copy
    })
  }

  const visibleItems = useMemo(() => {
    if (!listing) return []
    const filtered = listing.items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    return [...filtered].sort((a, b) => {
      if (sort === 'longest') return (b.duration ?? 0) - (a.duration ?? 0)
      if (sort === 'title') return a.title.localeCompare(b.title)
      return (b.uploadDate ?? '').localeCompare(a.uploadDate ?? '')
    })
  }, [listing, search, sort])

  const waveform = useMemo(() => {
    const bins = 150
    if (!duration) return Array.from({ length: bins }, () => 0.08)
    const values = Array.from({ length: bins }, () => 0.05)
    for (const word of words) {
      const index = Math.min(bins - 1, Math.max(0, Math.floor((word.start / duration) * bins)))
      values[index] += 0.35 + Math.min(0.5, (word.end - word.start) * 0.8)
    }
    return values
  }, [words, duration])

  const currentStep = !activeJob ? 1 : running ? 2 : inspector === 'publish' ? 5 : 4
  const activeClipVerdict = clip ? verdicts[clip.id] : undefined
  const dirty = Boolean(clip && (preset !== (clip.preset || 'bold') || layout !== (clip.layout === 'face' ? 'face' : clip.layout === 'blurred' ? 'blurred' : 'auto') || hookTitle !== clip.title || hook !== (clip.hook !== false) || trimStart !== clip.start || trimEnd !== clip.end))

  function pickStep(step: number) {
    if (step === 1) {
      setSourceTab('channels')
      setInspectorOpen(false)
      return
    }
    if (step === 2) {
      if (!activeJob) setSourceTab('link')
      else setInspector('clips')
      return
    }
    if (step === 3) setInspector('clips')
    if (step === 4) setInspector('style')
    if (step === 5) setInspector('publish')
    if (window.innerWidth < 1280) setInspectorOpen(true)
  }

  function openInspector(tab: InspectorTab) {
    setInspector(tab)
    if (window.innerWidth < 1280) setInspectorOpen(true)
  }

  return (
    <div className="flex min-h-svh flex-col bg-page">
      <div className="md:hidden">
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-sand px-6 text-center">
          <Logo />
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-paper text-accent-ink shadow-[var(--shadow-card)]">
            <Maximize2 className="size-5" />
          </span>
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.03em]">Open the Studio on a wider screen</h1>
          <p className="max-w-sm text-[0.92rem] leading-relaxed text-body">The editor needs a tablet or desktop to show the 9:16 preview, timeline and inspector together. Everything is saved; open this page from a larger screen.</p>
          <ButtonLink to="/dashboard" variant="secondary">Back to dashboard</ButtonLink>
        </div>
      </div>

      <div className="hidden min-h-svh flex-col md:flex">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
            <Link to="/" aria-label="Clipfarm home" className="round grid size-9 shrink-0 place-items-center rounded-[10px] bg-ink text-white">
              <Film className="size-4.5" />
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                onBlur={saveProjectTitle}
                aria-label="Project title"
                placeholder="Untitled project"
                className="h-9 min-w-0 max-w-[280px] flex-1 rounded-[8px] border border-transparent bg-transparent px-2 text-[0.95rem] font-semibold tracking-[-0.01em] hover:border-line focus:border-line-strong focus:bg-paper focus:outline-none"
              />
              {activeJob && (
                <span className={cx('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.72rem] font-semibold', statusTone(activeJob.status))}>
                  {running && <Loader2 aria-hidden className="size-3 animate-spin" />}
                  {statusLabel(activeJob)}
                </span>
              )}
              {dirty && <span className="hidden h-6 items-center rounded-full bg-peach px-2 text-[0.68rem] font-semibold text-accent-ink sm:inline-flex">Unsaved style</span>}
            </div>
            <div className="flex items-center gap-1">
              <IconButton aria-label="Undo" title="Nothing to undo yet" disabled className="hidden size-9 sm:grid">
                <Undo2 className="size-4" />
              </IconButton>
              <IconButton aria-label="Redo" title="Nothing to redo yet" disabled className="hidden size-9 sm:grid">
                <Redo2 className="size-4" />
              </IconButton>
              <IconButton aria-label="Keyboard shortcuts" title="Keyboard shortcuts" className="hidden size-9 sm:grid" onClick={() => setHelpOpen(true)}>
                <Settings2 className="size-4" />
              </IconButton>
              <Button variant="secondary" size="sm" className="hidden lg:inline-flex" disabled={!clip} onClick={() => (clip ? downloadFile(fileUrl(clip.files.mp4), `${clip.id}-clip.mp4`) : undefined)} icon={<Download className="size-4" />} title={clip ? 'Download the rendered MP4' : 'Render a clip first'}>
                Export
              </Button>
              <Button size="sm" disabled={!clip} onClick={() => openInspector('publish')} title={clip ? 'Open publish settings' : 'Render a clip first'}>
                Publish
              </Button>
              <IconButton aria-label="Open inspector" className="xl:hidden" onClick={() => setInspectorOpen(true)}>
                <SlidersHorizontal className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="flex h-10 items-center gap-1 overflow-x-auto border-t border-line/70 px-3 sm:px-4">
            {STEPS.map((step, index) => {
              const done = step.id < currentStep
              const current = step.id === currentStep
              return (
                <div key={step.id} className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => pickStep(step.id)}
                    aria-current={current ? 'step' : undefined}
                    className={cx(
                      'inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[0.76rem] font-semibold transition-colors',
                      current ? 'bg-ink text-white' : done ? 'text-ink-2 hover:bg-ink/5' : 'text-muted hover:bg-ink/5',
                    )}
                  >
                    <span className={cx('grid size-4 place-items-center rounded-full text-[0.62rem] tabular-nums', current ? 'bg-white/20 text-white' : done ? 'bg-success text-white' : 'bg-ink/8 text-muted')}>
                      {done ? <Check className="size-2.5" strokeWidth={4} /> : step.id}
                    </span>
                    {step.label}
                  </button>
                  {index < STEPS.length - 1 && <ChevronRight aria-hidden className="mx-0.5 size-3 text-line-strong" />}
                </div>
              )
            })}
            <div className="ml-auto hidden items-center gap-2 pl-4 sm:flex">
              {activeJob && running ? (
                <>
                  <span className="text-[0.72rem] text-muted">{activeJob.message || activeJob.stage}</span>
                  <Button size="sm" variant="secondary" onClick={() => control(`/jobs/${activeJob.id}/cancel`, 'POST')}>
                    Cancel
                  </Button>
                </>
              ) : activeJob?.status === 'done' && clip ? (
                <span className="text-[0.72rem] text-muted">{clips.length} clips · {result?.language?.toUpperCase()} ({Math.round((result?.languageProbability ?? 0) * 100)}%)</span>
              ) : null}
            </div>
          </div>
          {activeJob && running && (
            <div className="h-0.5 w-full bg-ink/5">
              <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(2, activeJob.progress * 100)}%` }} />
            </div>
          )}
        </header>

        {pipeline.state !== 'ready' || online === false ? (
          <div className="grid flex-1 place-items-center p-6">
            <PipelineConnect failure={pipeline.state === 'ready' ? failure : null} onRetry={() => setOnline(null)} />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
            <aside className="flex min-h-0 flex-col border-b border-line bg-paper lg:border-r lg:border-b-0" aria-label="Sources">
              <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-line px-2">
                {(['channels', 'link', 'upload'] as SourceTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSourceTab(tab)}
                    aria-selected={sourceTab === tab}
                    className={cx('h-7 flex-1 rounded-[7px] text-[0.78rem] font-semibold capitalize transition-colors', sourceTab === tab ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/5')}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {sourceTab === 'channels' && (
                  <div className="flex flex-col gap-4">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        void readLink(channelUrl)
                      }}
                      className="flex flex-col gap-1.5"
                    >
                      <label htmlFor="channel-url" className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Connect a channel</label>
                      <div className="flex gap-1.5">
                        <input id="channel-url" value={channelUrl} onChange={(event) => setChannelUrl(event.target.value)} placeholder="youtube.com/@channel" className={cx(controlBase, 'h-9 border-line-strong px-2.5 text-[0.8rem]')} />
                        <Button size="sm" type="submit" loading={busy} className="h-9 shrink-0 px-3" title="List this channel’s videos">
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-[0.7rem] leading-snug text-muted">YouTube, Twitch or TikTok. Public videos only; cookies can be set in .env.</p>
                    </form>

                    {channels.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Connected</p>
                        {channels.map((channel) => (
                          <div key={channel.url} className="flex items-center gap-2 rounded-[8px] px-1 py-1.5 hover:bg-sand">
                            <span className="size-7 shrink-0 overflow-hidden rounded-full bg-ink/10">
                              {channel.thumbnail && <img src={channel.thumbnail} alt="" className="size-full object-cover" />}
                            </span>
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                setListingChannel(channel)
                                void readLink(channel.url)
                              }}
                            >
                              <span className="block truncate text-[0.8rem] font-semibold">{channel.title}</span>
                              <span className="block text-[0.68rem] text-muted">{channel.platform}</span>
                            </button>
                            <button type="button" aria-label={`Refresh ${channel.title}`} title="Refresh" className="grid size-7 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink" onClick={() => void readLink(channel.url)}>
                              <RefreshCw className="size-3" />
                            </button>
                            <button type="button" aria-label={`Disconnect ${channel.title}`} title="Disconnect" className="grid size-7 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setChannels((current) => current.filter((item) => item.url !== channel.url))}>
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {listing && listing.kind === 'channel' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative min-w-0 flex-1">
                            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search videos" aria-label="Search channel videos" className={cx(controlBase, 'h-8 border-line-strong pl-7 text-[0.76rem]')} />
                          </div>
                          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort videos" className={cx(controlBase, 'h-8 w-auto border-line-strong px-2 text-[0.72rem]')}>
                            <option value="newest">Newest</option>
                            <option value="longest">Longest</option>
                            <option value="title">A–Z</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {visibleItems.map((item) => {
                            const job = jobs.find((entry) => entry.url === item.url)
                            return (
                              <div key={`${item.id}-${item.url}`} className="group flex gap-2 rounded-[8px] p-1 hover:bg-sand">
                                <span className="relative block aspect-video w-[76px] shrink-0 overflow-hidden rounded-[6px] bg-ink/10">
                                  {item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
                                  {item.duration ? <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 text-[0.6rem] font-semibold text-white tabular-nums">{stamp(item.duration)}</span> : null}
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <span className="line-clamp-2 text-[0.76rem] leading-snug font-semibold">{item.title}</span>
                                  <span className="mt-0.5 text-[0.66rem] text-muted">{item.uploadDate || item.channel || 'Unknown date'}</span>
                                  {job ? (
                                    <button type="button" onClick={() => setActiveId(job.id)} className="mt-auto w-fit text-[0.68rem] font-semibold text-accent-ink hover:underline">
                                      {job.status === 'done' ? `${job.result?.clips.length ?? 0} clips found` : job.status === 'failed' ? 'Failed · open' : `${statusLabel(job)}…`}
                                    </button>
                                  ) : (
                                    <button type="button" onClick={() => void startJob(item.url)} disabled={busy} className="mt-auto inline-flex w-fit items-center gap-1 text-[0.68rem] font-semibold text-ink hover:text-accent-ink disabled:opacity-50">
                                      <Scissors className="size-3" /> Clip it
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {listing.hasMore && (
                          <Button size="sm" variant="secondary" loading={busy} onClick={loadMore} className="h-8 text-[0.72rem]">
                            Load more
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {sourceTab === 'link' && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      void readLink(channelUrl)
                    }}
                    className="flex flex-col gap-2"
                  >
                    <label htmlFor="video-url" className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Paste a video link</label>
                    <input id="video-url" value={channelUrl} onChange={(event) => setChannelUrl(event.target.value)} placeholder="https://youtube.com/watch?v=…" className={cx(controlBase, 'h-9 border-line-strong px-2.5 text-[0.8rem]')} />
                    <Button size="sm" type="submit" loading={busy} className="h-9">Read link</Button>
                    {listing?.kind === 'video' && listing.items[0] && (
                      <div className="mt-2 rounded-[var(--radius-md)] border border-line p-2">
                        <div className="flex gap-2">
                          <span className="aspect-video w-20 shrink-0 overflow-hidden rounded-[6px] bg-ink/10">
                            {listing.items[0].thumbnail && <img src={listing.items[0].thumbnail} alt="" className="size-full object-cover" />}
                          </span>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-[0.8rem] font-semibold">{listing.items[0].title}</p>
                            <p className="text-[0.7rem] text-muted">{listing.items[0].platform} · {stamp(listing.items[0].duration)}</p>
                          </div>
                        </div>
                        <Button size="sm" className="mt-2 h-8 w-full text-[0.76rem]" onClick={() => void startJob(listing.items[0].url)} loading={busy}>
                          Clip this video
                        </Button>
                      </div>
                    )}
                    <p className="text-[0.7rem] leading-snug text-muted">Clip only videos you own or have permission to use.</p>
                  </form>
                )}

                {sourceTab === 'upload' && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Upload a file</p>
                    <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska" className="sr-only" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-sand/60 px-3 py-6 text-center hover:border-ink">
                      {uploading ? <Loader2 className="size-5 animate-spin text-accent-ink" /> : <UploadCloud className="size-5 text-accent-ink" />}
                      <span className="text-[0.82rem] font-semibold">{uploading ? `Uploading ${uploadName}…` : 'Choose a video file'}</span>
                      <span className="text-[0.68rem] text-muted">MP4, MOV, MKV or WebM · sent to 127.0.0.1 only</span>
                    </button>
                    <p className="text-[0.7rem] leading-snug text-muted">Uploads go to the local pipeline, never to a cloud bucket. Rights reminder: use footage you own.</p>
                  </div>
                )}

                {jobs.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3">
                    <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Projects</p>
                    {jobs.slice(0, 8).map((job) => (
                      <button key={job.id} type="button" onClick={() => setActiveId(job.id)} className={cx('flex items-center gap-2 rounded-[8px] px-1.5 py-1.5 text-left', activeId === job.id ? 'bg-sand' : 'hover:bg-sand')}>
                        <span className={cx('size-1.5 shrink-0 rounded-full', job.status === 'done' ? 'bg-success' : job.status === 'failed' ? 'bg-danger' : running ? 'bg-accent' : 'bg-muted')} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.76rem] font-semibold">{job.title || job.url}</span>
                          <span className="block text-[0.66rem] text-muted">{statusLabel(job)} · {job.result?.clips.length ?? 0} clips · {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <main className="min-h-0 overflow-y-auto bg-sand/40 p-3 sm:p-5">
              {error && <Notice className="mb-3">{error}</Notice>}
              {!activeJob ? (
                <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
                  <span aria-hidden className="grid size-14 place-items-center rounded-[18px] bg-paper text-accent-ink shadow-[var(--shadow-card)]">
                    <ClapperboardIcon />
                  </span>
                  <h1 className="text-[1.7rem] leading-tight font-semibold tracking-[-0.035em]">Start with a source</h1>
                  <p className="text-[0.95rem] leading-relaxed text-body">Connect a channel, paste a video link or upload a file from the left. The pipeline downloads, transcribes, finds the best moments and renders 9:16 clips.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setSourceTab('channels')}>Connect a channel</Button>
                    <Button variant="secondary" onClick={() => setSourceTab('upload')}>Upload a file</Button>
                  </div>
                  <div className="mt-3 grid w-full gap-2 text-left sm:grid-cols-3">
                    {[
                      ['1', 'Add a source', 'Channel, link or local file'],
                      ['2', 'Wait for analysis', 'Live progress, cancel any time'],
                      ['3', 'Review and export', 'Preview, style, download'],
                    ].map(([number, title, text]) => (
                      <div key={number} className="rounded-[var(--radius-md)] border border-line bg-paper p-3">
                        <span className="text-[0.7rem] font-bold text-accent-ink tabular-nums">{number.padStart(2, '0')}</span>
                        <p className="mt-1 text-[0.82rem] font-semibold">{title}</p>
                        <p className="text-[0.72rem] text-muted">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : running ? (
                <div className="mx-auto flex max-w-2xl flex-col gap-4 py-10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Analyzing</p>
                      <h1 className="mt-1 text-[1.4rem] font-semibold tracking-[-0.03em]">{activeJob.title || projectTitle || 'Your video'}</h1>
                    </div>
                    <span className={cx('inline-flex h-7 items-center rounded-full px-2.5 text-[0.72rem] font-semibold', statusTone(activeJob.status))}>{statusLabel(activeJob)}</span>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-5">
                    <div className="flex items-center justify-between text-[0.8rem] font-semibold">
                      <span>{activeJob.message || 'Working'}</span>
                      <span className="tabular-nums text-muted">{Math.round(activeJob.progress * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8">
                      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(2, activeJob.progress * 100)}%` }} />
                    </div>
                    <ol className="mt-5 grid gap-2 sm:grid-cols-4">
                      {['Download', 'Transcribe', 'Find moments', 'Render 9:16'].map((stage, index) => {
                        const thresholds = [0.05, 0.3, 0.76, 0.82]
                        const done = activeJob.progress > thresholds[index] + (index === 3 ? 0.1 : 0)
                        const current = !done && activeJob.progress >= thresholds[index]
                        return (
                          <li key={stage} className={cx('rounded-[var(--radius-md)] px-3 py-2.5', done ? 'bg-success-soft' : current ? 'bg-peach' : 'bg-sand')}>
                            <span className={cx('text-[0.7rem] font-semibold', done ? 'text-success' : current ? 'text-accent-ink' : 'text-muted')}>{done ? 'Done' : current ? 'Now' : 'Next'}</span>
                            <p className="text-[0.8rem] font-semibold">{stage}</p>
                          </li>
                        )
                      })}
                    </ol>
                    <div className="mt-5 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => control(`/jobs/${activeJob.id}/cancel`, 'POST')}>Cancel job</Button>
                      <Button variant="ghost" size="sm" onClick={() => control(`/jobs/${activeJob.id}`, 'DELETE', 'Delete this job and its files?')}>Delete</Button>
                    </div>
                    {activeJob.error && <Notice className="mt-3">{activeJob.error}</Notice>}
                  </div>
                </div>
              ) : activeJob.status === 'failed' ? (
                <div className="mx-auto flex max-w-lg flex-col gap-4 py-14 text-center">
                  <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft text-danger"><AlertTriangle className="size-5" /></span>
                  <h1 className="text-[1.4rem] font-semibold tracking-[-0.03em]">This job did not finish</h1>
                  <p className="text-[0.9rem] text-body">{activeJob.error || activeJob.message || 'Unknown pipeline error.'}</p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => control(`/jobs/${activeJob.id}/retry`, 'POST')}>Retry</Button>
                    <Button variant="secondary" onClick={() => control(`/jobs/${activeJob.id}`, 'DELETE', 'Delete this failed job and its files?')}>Delete</Button>
                  </div>
                </div>
              ) : clip ? (
                <div className="mx-auto flex max-w-[720px] flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">Clip {clips.findIndex((item) => item.id === clip.id) + 1} of {clips.length}</p>
                      <h1 className="mt-0.5 truncate text-[1.15rem] font-semibold tracking-[-0.02em]">{clip.title}</h1>
                    </div>
                    <div className="flex items-center gap-2 text-[0.72rem] text-muted">
                      <span className={cx('inline-flex h-6 items-center rounded-full px-2 font-semibold', activeClipVerdict === 'approved' ? 'bg-success-soft text-success' : activeClipVerdict === 'rejected' ? 'bg-danger-soft text-danger' : 'bg-paper')}>
                        {activeClipVerdict ? activeClipVerdict[0].toUpperCase() + activeClipVerdict.slice(1) : 'Unreviewed'}
                      </span>
                      <span>Score {clip.score}</span>
                      <span>{Math.round(clip.duration)}s</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="relative w-full max-w-[286px] rounded-[34px] border border-ink/20 bg-ink p-1.5 shadow-[var(--shadow-raise)]">
                      <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] bg-black">
                        <video
                          ref={videoRef}
                          key={clip.files.mp4}
                          src={fileUrl(clip.files.mp4)}
                          poster={clip.files.poster ? fileUrl(clip.files.poster) : undefined}
                          playsInline
                          className="size-full object-contain"
                          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                          onPlay={() => setPlaying(true)}
                          onPause={() => setPlaying(false)}
                          onEnded={() => setPlaying(false)}
                        />
                        {safeZone && (
                          <div aria-hidden className="pointer-events-none absolute inset-0">
                            <div className="absolute inset-x-0 top-0 h-[10%] border-b border-dashed border-white/50 bg-black/20" />
                            <div className="absolute inset-x-0 bottom-0 h-[20%] border-t border-dashed border-white/50 bg-black/20" />
                          </div>
                        )}
                        {!playing && (
                          <button type="button" aria-label="Play clip" onClick={play} className="absolute inset-0 grid place-items-center bg-black/10">
                            <span className="round grid size-12 place-items-center rounded-full bg-white/95 text-ink shadow-lg">
                              <Play className="ml-0.5 size-5" fill="currentColor" />
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto flex w-full max-w-[420px] items-center gap-2">
                    <IconButton aria-label="Back 5 seconds" className="size-8" onClick={() => skip(-5)}><SkipBack className="size-4" /></IconButton>
                    <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={play} className="round grid size-9 place-items-center rounded-full bg-ink text-white">
                      {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
                    </button>
                    <IconButton aria-label="Forward 5 seconds" className="size-8" onClick={() => skip(5)}><SkipForward className="size-4" /></IconButton>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.1, clip.duration)}
                      step={0.05}
                      value={Math.min(currentTime, clip.duration)}
                      onChange={(event) => {
                        const time = Number(event.target.value)
                        if (videoRef.current) videoRef.current.currentTime = time
                        setCurrentTime(time)
                      }}
                      aria-label="Scrub clip"
                      className="h-1.5 flex-1 cursor-pointer accent-[var(--color-ink)]"
                    />
                    <span className="w-16 text-right text-[0.7rem] font-semibold text-muted tabular-nums">{stamp(currentTime)} / {stamp(clip.duration)}</span>
                    <button type="button" onClick={() => setSafeZone((value) => !value)} aria-pressed={safeZone} title="Toggle platform safe zones" className={cx('inline-flex h-7 items-center rounded-full border px-2 text-[0.68rem] font-semibold', safeZone ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2')}>
                      Safe
                    </button>
                  </div>

                  <section className="rounded-[var(--radius-md)] border border-line bg-paper p-3" aria-label="Timeline">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">Timeline</span>
                        <span className="text-[0.68rem] text-muted">{stamp(sourceTime)} / {stamp(duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconButton aria-label="Zoom out" className="size-7" onClick={() => setZoom((value) => Math.max(100, value - 30))}><ChevronLeft className="size-3.5" /></IconButton>
                        <span className="w-10 text-center text-[0.68rem] font-semibold text-muted tabular-nums">{zoom}%</span>
                        <IconButton aria-label="Zoom in" className="size-7" onClick={() => setZoom((value) => Math.min(260, value + 30))}><ChevronRight className="size-3.5" /></IconButton>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div
                        className="relative h-20 cursor-crosshair rounded-[6px] bg-sand"
                        style={{ minWidth: `${zoom}%` }}
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          const sourceAt = ((event.clientX - rect.left) / rect.width) * duration
                          if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(clip.duration, sourceAt - clip.start))
                        }}
                      >
                        <div className="absolute inset-x-0 bottom-0 flex h-16 items-end gap-[2px] px-0.5 opacity-70">
                          {waveform.map((value, index) => (
                            <span key={index} aria-hidden className="flex-1 rounded-t-sm bg-ink/30" style={{ height: `${Math.max(4, Math.min(100, value * 70))}%` }} />
                          ))}
                        </div>
                        {clips.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-label={`Select clip ${item.id}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setClipId(item.id)
                            }}
                            className={cx('absolute top-1.5 h-5 rounded-[4px] border text-[0.6rem] font-bold text-white', item.id === clip.id ? 'border-ink bg-accent-ink' : 'border-white/60 bg-accent/70')}
                            style={{ left: `${(item.start / Math.max(1, duration)) * 100}%`, width: `${Math.max(2, ((item.end - item.start) / Math.max(1, duration)) * 100)}%` }}
                          >
                            {item.id}
                          </button>
                        ))}
                        <div aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(sourceTime / Math.max(1, duration)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="flex flex-col gap-1 text-[0.68rem] font-semibold text-muted">
                        In {stamp(trimStart, true)}
                        <input type="range" min={0} max={Math.max(0.1, duration)} step={0.1} value={Math.min(trimStart, trimEnd - 1)} onChange={(event) => setTrimStart(Math.min(snap(Number(event.target.value)), trimEnd - 1))} className="accent-[var(--color-ink)]" />
                      </label>
                      <label className="flex flex-col gap-1 text-[0.68rem] font-semibold text-muted">
                        Out {stamp(trimEnd, true)}
                        <input type="range" min={0} max={Math.max(0.1, duration)} step={0.1} value={Math.max(trimEnd, trimStart + 1)} onChange={(event) => setTrimEnd(Math.max(snap(Number(event.target.value)), trimStart + 1))} className="accent-[var(--color-ink)]" />
                      </label>
                      <Button size="sm" className="h-8 text-[0.72rem]" variant="secondary" disabled={!dirty || rendering} loading={rendering} onClick={applyRender} title={dirty ? 'Render these changes' : 'No changes to render'}>
                        Apply trim
                      </Button>
                    </div>
                  </section>

                  <section className="rounded-[var(--radius-md)] border border-line bg-paper p-3" aria-label="Transcript">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Captions aria-hidden className="size-3.5 text-accent-ink" />
                        <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">Transcript</span>
                        {result?.language && <span className="rounded-full bg-sand px-2 py-0.5 text-[0.65rem] font-semibold uppercase">{result.language}</span>}
                      </div>
                      <a href={fileUrl(clip.files.srt)} download className="text-[0.68rem] font-semibold text-accent-ink hover:underline">Download SRT</a>
                    </div>
                    <div className="max-h-44 overflow-y-auto pr-1 text-[0.84rem] leading-relaxed">
                      {result?.transcript.segments.map((segment) => {
                        const segmentWords = words.filter((word) => word.start >= Math.max(clip.start, segment.start) && word.end <= Math.min(clip.end, segment.end) + 0.01)
                        if (!segmentWords.length) return null
                        return (
                          <p key={`${segment.start}-${segment.end}`} className="mb-1.5">
                            {segmentWords.map((word) => {
                              const active = sourceTime >= word.start && sourceTime <= word.end
                              return (
                                <button
                                  key={`${word.start}-${word.text}`}
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current) videoRef.current.currentTime = Math.max(0, word.start - clip.start)
                                    setCurrentTime(Math.max(0, word.start - clip.start))
                                  }}
                                  className={cx('mr-1 inline-block rounded px-0.5 transition-colors', active ? 'bg-accent text-ink' : 'hover:bg-sand')}
                                >
                                  {word.text}{' '}
                                </button>
                              )
                            })}
                          </p>
                        )
                      })}
                    </div>
                    <p className="mt-1 text-[0.66rem] text-muted">Click a word to jump. Transcript edits are exported as SRT/ASS and can be restyled before the next render.</p>
                  </section>
                </div>
              ) : (
                <div className="grid place-items-center py-20 text-center">
                  <div>
                    <p className="text-[1.1rem] font-semibold">No clips survived the filter</p>
                    <p className="mt-1 text-[0.9rem] text-muted">Try a longer source or lower the minimum clip length in .env, then retry.</p>
                    <Button className="mt-3" variant="secondary" onClick={() => control(`/jobs/${activeJob.id}/retry`, 'POST')}>Retry analysis</Button>
                  </div>
                </div>
              )}
            </main>

            <aside className="hidden min-h-0 flex-col border-l border-line bg-paper xl:flex" aria-label="Inspector">
              <Inspector
                tab={inspector}
                setTab={setInspector}
                job={activeJob}
                clip={clip}
                clips={clips}
                preset={preset}
                setPreset={setPreset}
                layout={layout}
                setLayout={setLayout}
                hook={hook}
                setHook={setHook}
                hookTitle={hookTitle}
                setHookTitle={setHookTitle}
                captionText={captionText}
                setCaptionText={setCaptionText}
                platforms={platforms}
                setPlatforms={setPlatforms}
                dirty={dirty}
                rendering={rendering}
                onApply={applyRender}
                onSelect={(id) => setClipId(id)}
                verdicts={verdicts}
                onVerdict={setVerdict}
                onDownload={() => clip && downloadFile(fileUrl(clip.files.mp4), `${clip.id}-clip.mp4`)}
                onDownloadSrt={() => clip && downloadFile(fileUrl(clip.files.srt), `${clip.id}.srt`)}
                onCopy={copyCaption}
                posting={posting}
                onYouTube={uploadYouTube}
                onDelete={() => activeJob && control(`/jobs/${activeJob.id}`, 'DELETE', 'Delete this project and every rendered clip?')}
              />
            </aside>
          </div>
        )}
      </div>

      <Drawer open={inspectorOpen} onClose={() => setInspectorOpen(false)} title="Inspector" className="sm:max-w-md">
        <Inspector
          tab={inspector}
          setTab={setInspector}
          job={activeJob}
          clip={clip}
          clips={clips}
          preset={preset}
          setPreset={setPreset}
          layout={layout}
          setLayout={setLayout}
          hook={hook}
          setHook={setHook}
          hookTitle={hookTitle}
          setHookTitle={setHookTitle}
          captionText={captionText}
          setCaptionText={setCaptionText}
          platforms={platforms}
          setPlatforms={setPlatforms}
          dirty={dirty}
          rendering={rendering}
          onApply={applyRender}
          onSelect={(id) => {
            setClipId(id)
            setInspectorOpen(false)
          }}
          verdicts={verdicts}
          onVerdict={setVerdict}
          onDownload={() => clip && downloadFile(fileUrl(clip.files.mp4), `${clip.id}-clip.mp4`)}
          onDownloadSrt={() => clip && downloadFile(fileUrl(clip.files.srt), `${clip.id}.srt`)}
          onCopy={copyCaption}
          posting={posting}
          onYouTube={uploadYouTube}
          onDelete={() => activeJob && control(`/jobs/${activeJob.id}`, 'DELETE', 'Delete this project and every rendered clip?')}
        />
      </Drawer>

      <Drawer open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts">
        <dl className="flex flex-col divide-y divide-line text-[0.9rem]">
          {[
            ['Space / K', 'Play or pause the clip'],
            ['J', 'Back 5 seconds'],
            ['L', 'Forward 5 seconds'],
            ['Click timeline', 'Seek to a source time'],
            ['Click transcript word', 'Jump to that word'],
          ].map(([key, text]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <dt className="rounded border border-line bg-sand px-2 py-1 font-mono text-[0.75rem] font-semibold">{key}</dt>
              <dd className="text-right text-body">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[0.8rem] leading-relaxed text-muted">Shortcuts work when focus is not inside a text field. Split and delete-word shortcuts are not implemented; edit the exported SRT/ASS instead.</p>
      </Drawer>
    </div>
  )
}

function ClapperboardIcon() {
  return <Film className="size-6" />
}

type InspectorProps = {
  tab: InspectorTab
  setTab: (tab: InspectorTab) => void
  job: PipelineJob | null
  clip: PipelineClip | null
  clips: PipelineClip[]
  preset: string
  setPreset: (value: string) => void
  layout: string
  setLayout: (value: string) => void
  hook: boolean
  setHook: (value: boolean) => void
  hookTitle: string
  setHookTitle: (value: string) => void
  captionText: string
  setCaptionText: (value: string) => void
  platforms: Record<string, boolean>
  setPlatforms: (value: Record<string, boolean>) => void
  dirty: boolean
  rendering: boolean
  onApply: () => void
  onSelect: (id: string) => void
  verdicts: Record<string, Verdict>
  onVerdict: (verdict: Verdict) => void
  onDownload: () => void
  onDownloadSrt: () => void
  onCopy: () => void
  posting: { youtube: { configured: boolean; note: string } } | null
  onYouTube: () => void
  onDelete: () => void
}

function Inspector(props: InspectorProps) {
  const { tab, setTab, job, clip, clips, preset, setPreset, layout, setLayout, hook, setHook, hookTitle, setHookTitle, captionText, setCaptionText, platforms, setPlatforms, dirty, rendering, onApply, onSelect, verdicts, onVerdict, onDownload, onDownloadSrt, onCopy, posting, onYouTube, onDelete } = props
  const tabs: Array<{ id: InspectorTab; label: string; icon: typeof Scissors }> = [
    { id: 'clips', label: 'Clips', icon: Scissors },
    { id: 'style', label: 'Style', icon: Captions },
    { id: 'layout', label: 'Layout', icon: Layers },
    { id: 'publish', label: 'Publish', icon: UploadCloud },
  ]
  return (
    <>
      <div className="grid h-11 shrink-0 grid-cols-4 border-b border-line">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx('flex flex-col items-center justify-center gap-0.5 border-b-2 text-[0.66rem] font-semibold transition-colors', tab === item.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
          >
            <item.icon aria-hidden className="size-3.5" />
            {item.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'clips' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">{clips.length} detected clips</p>
              {job?.result?.language && <span className="text-[0.65rem] text-muted uppercase">{job.result.language}</span>}
            </div>
            {clips.map((item) => (
              <div key={item.id} className={cx('rounded-[8px] border p-1.5 transition-colors', item.id === clip?.id ? 'border-ink bg-sand/60' : 'border-line hover:border-line-strong')}>
                <button type="button" onClick={() => onSelect(item.id)} className="flex w-full gap-2 text-left">
                  <span className="relative aspect-[9/16] w-11 shrink-0 overflow-hidden rounded-[4px] bg-ink/10">
                    {item.files.poster && <img src={fileUrl(item.files.poster)} alt="" loading="lazy" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[0.76rem] leading-snug font-semibold">{item.title}</span>
                    <span className="mt-0.5 block text-[0.66rem] text-muted">{stamp(item.start)}–{stamp(item.end)} · {Math.round(item.duration)}s</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[0.66rem] font-semibold text-accent-ink">
                      <Gauge className="size-2.5" /> {item.score}
                      {verdicts[item.id] && <span className={cx('ml-1 rounded-full px-1.5 text-[0.6rem]', verdicts[item.id] === 'approved' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{verdicts[item.id]}</span>}
                    </span>
                  </span>
                </button>
                {item.id === clip?.id && (
                  <div className="mt-1.5 flex gap-1">
                    <button type="button" onClick={() => onVerdict('approved')} aria-pressed={verdicts[item.id] === 'approved'} className={cx('inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-[5px] text-[0.64rem] font-semibold', verdicts[item.id] === 'approved' ? 'bg-success text-white' : 'bg-paper text-ink-2 hover:bg-ink/5')}>
                      <Check className="size-2.5" /> Approve
                    </button>
                    <button type="button" onClick={() => onVerdict('rejected')} aria-pressed={verdicts[item.id] === 'rejected'} className={cx('inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-[5px] text-[0.64rem] font-semibold', verdicts[item.id] === 'rejected' ? 'bg-danger text-white' : 'bg-paper text-ink-2 hover:bg-ink/5')}>
                      <X className="size-2.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            <Button size="sm" variant="secondary" className="mt-1 h-8 text-[0.72rem]" loading={rendering} disabled={!clip} onClick={onApply} icon={<Wand2 className="size-3" />} title="Re-render this clip with the current style and trim">
              Regenerate clip
            </Button>
          </div>
        )}

        {tab === 'style' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Caption preset</p>
              <div className="mt-1.5 flex flex-col gap-1">
                {PRESETS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setPreset(item.id)} aria-pressed={preset === item.id} className={cx('flex items-center justify-between rounded-[8px] border px-2.5 py-2 text-left', preset === item.id ? 'border-ink bg-sand' : 'border-line hover:border-line-strong')}>
                    <span>
                      <span className="block text-[0.8rem] font-semibold">{item.name}</span>
                      <span className="block text-[0.66rem] text-muted">{item.note}</span>
                    </span>
                    {preset === item.id && <Check className="size-3.5 text-success" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[8px] border border-line px-2.5 py-2">
              <div>
                <p className="text-[0.8rem] font-semibold">Hook title</p>
                <p className="text-[0.66rem] text-muted">First 3 seconds, top of frame</p>
              </div>
              <button type="button" role="switch" aria-checked={hook} aria-label="Hook title" onClick={() => setHook(!hook)} className={cx('relative h-5 w-9 rounded-full transition-colors', hook ? 'bg-ink' : 'bg-line-strong')}>
                <span className={cx('absolute top-0.5 size-4 rounded-full bg-white transition-[left]', hook ? 'left-[18px]' : 'left-0.5')} />
              </button>
            </div>
            <label className="flex flex-col gap-1.5 text-[0.72rem] font-semibold text-muted">
              Hook text
              <input value={hookTitle} onChange={(event) => setHookTitle(event.target.value)} maxLength={80} disabled={!hook} className={cx(controlBase, 'h-9 border-line-strong px-2.5 text-[0.8rem] font-medium disabled:opacity-50')} placeholder="Six words, same language as the video" />
            </label>
            <div className="rounded-[8px] bg-sand p-2.5">
              <p className="text-[0.66rem] font-semibold text-muted uppercase">Preview</p>
              <p className="mt-1 text-center text-[0.9rem] font-black leading-tight tracking-tight" style={{ fontFamily: preset === 'clean' ? '"Bebas Neue", sans-serif' : preset === 'box' ? '"Noto Sans", sans-serif' : 'Anton, sans-serif' }}>
                {hookTitle || 'Your hook title'}
              </p>
            </div>
            <Button size="sm" loading={rendering} disabled={!dirty} onClick={onApply} className="h-8 text-[0.72rem]">
              Apply style and re-render
            </Button>
            {!dirty && <p className="text-[0.68rem] text-muted">Change a preset or the hook text to enable rendering.</p>}
          </div>
        )}

        {tab === 'layout' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Crop layout</p>
              <div className="mt-1.5 flex flex-col gap-1">
                {LAYOUTS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setLayout(item.id)} aria-pressed={layout === item.id} className={cx('flex items-start justify-between gap-2 rounded-[8px] border px-2.5 py-2 text-left', layout === item.id ? 'border-ink bg-sand' : 'border-line hover:border-line-strong')}>
                    <span>
                      <span className="block text-[0.8rem] font-semibold">{item.name}</span>
                      <span className="block text-[0.66rem] leading-snug text-muted">{item.note}</span>
                    </span>
                    {layout === item.id && <Check className="mt-0.5 size-3.5 shrink-0 text-success" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-[8px] bg-sand p-2.5">
              <ScanFace className="mt-0.5 size-3.5 shrink-0 text-accent-ink" />
              <p className="text-[0.68rem] leading-snug text-ink-2">Face tracking samples YuNet five times a second and smooths the crop with a dead zone and maximum pan speed. Manual crop offset is not exposed in this build.</p>
            </div>
            <Button size="sm" loading={rendering} disabled={!dirty} onClick={onApply} className="h-8 text-[0.72rem]">
              Apply layout and re-render
            </Button>
          </div>
        )}

        {tab === 'publish' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Caption + hashtags</p>
              <textarea value={captionText} onChange={(event) => setCaptionText(event.target.value)} rows={5} className={cx(controlBase, 'mt-1.5 resize-y border-line-strong px-2.5 py-2 text-[0.8rem]')} />
              <div className="mt-1.5 flex gap-1.5">
                <Button size="sm" variant="secondary" className="h-7 text-[0.68rem]" onClick={onCopy} icon={<Clipboard className="size-3" />}>Copy</Button>
                <Button size="sm" variant="secondary" className="h-7 text-[0.68rem]" onClick={onDownloadSrt} disabled={!clip} icon={<Download className="size-3" />}>SRT</Button>
                <Button size="sm" variant="secondary" className="h-7 text-[0.68rem]" onClick={onDownload} disabled={!clip} icon={<Download className="size-3" />}>MP4</Button>
              </div>
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.05em] text-muted uppercase">Platforms</p>
              <div className="mt-1.5 flex flex-col gap-1">
                {[
                  { id: 'youtube', label: 'YouTube Shorts', note: 'Official API, private until audited', icon: Video },
                  { id: 'tiktok', label: 'TikTok', note: 'Official upload page', icon: Video },
                  { id: 'instagram', label: 'Instagram Reels', note: 'Advanced, needs a Meta app', icon: ImageIcon },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-[8px] border border-line px-2.5 py-2">
                    <input
                      id={`platform-${item.id}`}
                      type="checkbox"
                      checked={Boolean(platforms[item.id])}
                      onChange={(event) => setPlatforms({ ...platforms, [item.id]: event.target.checked })}
                      className="size-3.5 accent-[var(--color-ink)]"
                    />
                    <label htmlFor={`platform-${item.id}`} className="min-w-0 flex-1">
                      <span className="block text-[0.76rem] font-semibold">{item.label}</span>
                      <span className="block text-[0.64rem] text-muted">{item.note}</span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {platforms.youtube && (
                  posting?.youtube.configured ? (
                    <Button size="sm" className="h-7 text-[0.68rem]" loading={rendering} disabled={!clip} onClick={onYouTube}>Upload to YouTube</Button>
                  ) : (
                    <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-[0.68rem] font-semibold hover:border-ink">Open YouTube upload</a>
                  )
                )}
                {platforms.tiktok && (
                  <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-[0.68rem] font-semibold hover:border-ink">Open TikTok upload</a>
                )}
                {platforms.instagram && (
                  <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-[0.68rem] font-semibold hover:border-ink">Open Instagram</a>
                )}
              </div>
              <p className="mt-2 text-[0.64rem] leading-snug text-muted">{posting?.youtube.note || 'Download always works. Direct posting needs official credentials; Clipfarm never automates a login.'}</p>
            </div>
            <label className="flex flex-col gap-1 text-[0.7rem] font-semibold text-muted" title="Scheduling requires the hosted queue; the local build exports files instead.">
              Schedule (hosted only)
              <input type="datetime-local" disabled className={cx(controlBase, 'h-8 border-line-strong px-2 text-[0.72rem] disabled:opacity-50')} />
            </label>
            <div className="border-t border-line pt-3">
              <Button size="sm" variant="danger-ghost" className="h-7 w-full text-[0.68rem]" onClick={onDelete} icon={<Trash2 className="size-3" />}>Delete project</Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
