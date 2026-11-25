import {
  Captions,
  CheckCircle2,
  ChevronDown,
  Download,
  FileArchive,
  FileVideo,
  LoaderCircle,
  Mic,
  Play,
  ScanFace,
  Scissors,
  Sparkles,
  Square,
  Timer,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cx } from '../lib/cx'
import {
  CAPTION_STYLES,
  FRAME_FORMATS,
  canRenderInBrowser,
  captionAt,
  readVideoDuration,
  renderClip,
  type CaptionPosition,
  type CaptionStyle,
  type FrameFormat,
} from '../lib/clipRender'
import { trackFace, type FaceReading } from '../lib/faceTrack'
import {
  toSrt,
  transcribeMedia,
  TRANSCRIBE_LANGUAGES,
  WHISPER_SIZE,
  type TranscribeUpdate,
  type TranscriptSegment,
} from '../lib/transcribe'
import { zipFiles } from '../lib/zip'
import { detectFromTranscript, formatStamp, type DetectedClip } from '../shared/clips'
import { Button } from './Button'
import { Notice, SelectField } from './Field'

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const clock = (seconds: number) => (seconds >= 60 ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)}s`)

const phaseLabel = (phase: TranscribeUpdate['phase']) =>
  phase === 'model' ? 'Loading Whisper tiny' : phase === 'decode' ? 'Reading the audio' : 'Transcribing the stream'

type JobStatus = 'queued' | 'face' | 'rendering' | 'done' | 'error'
type Job = { status: JobStatus; progress: number; error?: string }
type Rendered = {
  url: string
  posterUrl: string | null
  name: string
  size: number
  duration: number
  face: FaceReading | null
  width: number
  height: number
  blob: Blob
}

type Settings = {
  format: FrameFormat
  captionStyle: CaptionStyle
  captionPosition: CaptionPosition
  captions: boolean
  followFace: boolean
}

const DEFAULTS: Settings = { format: 'tiktok', captionStyle: 'bold', captionPosition: 'bottom', captions: true, followFace: true }
const STORAGE_KEY = 'clipfarm.clipper'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw) as Partial<Settings>
    return {
      format: saved.format && saved.format in FRAME_FORMATS ? saved.format : DEFAULTS.format,
      captionStyle: saved.captionStyle && CAPTION_STYLES.some((style) => style.id === saved.captionStyle) ? saved.captionStyle : DEFAULTS.captionStyle,
      captionPosition: saved.captionPosition === 'top' ? 'top' : 'bottom',
      captions: saved.captions ?? DEFAULTS.captions,
      followFace: saved.followFace ?? DEFAULTS.followFace,
    }
  } catch {
    return DEFAULTS
  }
}

function saveText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function downloadUrl(url: string, name: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'clip'

/** A live, in-browser approximation of the burned-in caption. */
function PreviewCaption({ text, style, position }: { text: string | null; style: CaptionStyle; position: CaptionPosition }) {
  if (!text) return null
  return (
    <div className={cx('pointer-events-none absolute inset-x-0 flex justify-center px-3', position === 'top' ? 'top-[13%]' : 'bottom-[11%]')}>
      {style === 'highlight' ? (
        <span className="max-w-[92%] rounded-[4px] bg-[#d7ff3e]/95 px-1.5 py-0.5 text-center text-[0.82rem] leading-[1.15] font-extrabold text-[#101208]">
          {text}
        </span>
      ) : style === 'clean' ? (
        <span className="max-w-[92%] text-center text-[0.9rem] leading-tight font-extrabold text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.95)]">{text}</span>
      ) : (
        <span className="max-w-[92%] rounded-xl bg-[rgba(8,9,12,0.76)] px-2.5 py-1.5 text-center shadow-[0_4px_18px_rgba(0,0,0,0.35)]">
          <span className="block text-[0.82rem] leading-[1.15] font-extrabold text-white">{text}</span>
          <span aria-hidden className="mx-auto mt-1 block h-[3px] w-9 rounded-full bg-[#d7ff3e]" />
        </span>
      )}
    </div>
  )
}

/**
 * The clipping desk: transcribe a real local VOD or livestream with Whisper,
 * rank the strongest spoken moments, fine-tune each cut, preview it with a live
 * caption overlay, then render one or all of them as real MP4s with face-aware
 * framing and burned-in captions. Everything runs in the tab.
 */
export function AutoClipper() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [language, setLanguage] = useState('en')
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [transcribing, setTranscribing] = useState(false)
  const [update, setUpdate] = useState<TranscribeUpdate>({ phase: 'model', ratio: 0, detail: '' })
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [moments, setMoments] = useState<DetectedClip[]>([])
  const [jobs, setJobs] = useState<Record<number, Job>>({})
  const [results, setResults] = useState<Record<number, Rendered>>({})
  const [rendering, setRendering] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [batch, setBatch] = useState<{ total: number; done: number; running: boolean; startedAt: number } | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewTime, setPreviewTime] = useState(0)
  const [trimOpen, setTrimOpen] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [error, setError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const cancelRef = useRef(false)
  const runningRef = useRef(false)
  const urlsRef = useRef<Set<string>>(new Set())

  const supported = useMemo(() => canRenderInBrowser(), [])
  const busy = rendering || Boolean(batch?.running)
  const name = file?.name.replace(/\.[^.]+$/, '') ?? 'stream'
  const spec = FRAME_FORMATS[settings.format]
  const showCaptions = settings.captions && settings.format !== 'source'
  const previewMoment = previewIndex !== null ? moments[previewIndex] : undefined
  const previewSpoken = previewMoment ? captionAt(previewMoment.cues, previewTime) : null

  const trackUrl = (url: string) => {
    urlsRef.current.add(url)
    return url
  }

  const releaseAll = () => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url)
    urlsRef.current.clear()
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Private-mode storage is optional.
    }
  }, [settings])

  useEffect(
    () => () => {
      controllerRef.current?.abort()
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const stats = useMemo(() => {
    const speech = segments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)
    const cut = moments.reduce((total, moment) => total + Math.max(0, moment.end - moment.start), 0)
    return { speech, cut, lines: segments.length }
  }, [segments, moments])

  const rendered = useMemo(() => Object.values(results), [results])

  const eta = useMemo(() => {
    if (!batch?.running) return ''
    const finished = Object.values(jobs).filter((job) => job.status === 'done')
    if (!finished.length) return 'estimating…'
    const average = (performance.now() - batch.startedAt) / Math.max(1, batch.done)
    const left = Math.max(0, batch.total - batch.done) * average
    return left > 1000 ? `about ${clock(left / 1000)} left` : 'almost done'
  }, [batch, jobs])

  function resetOutputs() {
    releaseAll()
    setResults({})
    setJobs({})
    setPreviewIndex(null)
    setTrimOpen(null)
  }

  async function choose(next: File) {
    controllerRef.current?.abort()
    resetOutputs()
    setError('')
    setSegments([])
    setMoments([])
    setDuration(0)
    setBatch(null)
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    const url = URL.createObjectURL(next)
    setFile(next)
    setFileUrl(url)
    try {
      const total = await readVideoDuration(next)
      if (!Number.isFinite(total) || total <= 0) throw new Error('empty')
      setDuration(total)
    } catch {
      setDuration(0)
      setError('Could not read this file. Use an MP4, MOV, WebM or MKV with H.264 video and audio.')
    }
  }

  async function findMoments() {
    if (!file || transcribing || busy) return
    const controller = new AbortController()
    controllerRef.current = controller
    setTranscribing(true)
    setError('')
    resetOutputs()
    setSegments([])
    setMoments([])
    setUpdate({ phase: 'model', ratio: 0, detail: 'Whisper tiny' })
    try {
      const transcript = await transcribeMedia(file, { language, signal: controller.signal, onUpdate: setUpdate })
      setSegments(transcript.segments)
      setDuration(transcript.duration)
      if (!transcript.segments.length) {
        setError('No speech was detected. Check the audio track, or pick another spoken language.')
        return
      }
      const found = detectFromTranscript(transcript.segments, 8)
      if (!found.length) {
        setError(
          'The transcript is too sparse to rank moments. This works best on talkative streams with a line every few seconds; a mostly silent gameplay VOD has nothing for the scorer to rank.',
        )
        return
      }
      setMoments(found)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') setError('Transcription stopped.')
      else setError(cause instanceof Error ? cause.message : 'Transcription failed in this browser.')
    } finally {
      setTranscribing(false)
      controllerRef.current = null
    }
  }

  async function renderOne(index: number): Promise<boolean> {
    const moment = moments[index]
    if (!file || !moment) return false
    setError('')
    setJobs((current) => ({ ...current, [index]: { status: settings.followFace ? 'face' : 'rendering', progress: 0 } }))
    try {
      let face: FaceReading | null = null
      if (settings.followFace) {
        try {
          face = await trackFace(file, moment.start, moment.end)
        } catch {
          face = null
        }
      }
      setJobs((current) => ({ ...current, [index]: { status: 'rendering', progress: 0 } }))
      const renderedClip = await renderClip(
        file,
        {
          start: moment.start,
          end: moment.end,
          format: settings.format,
          cues: moment.cues,
          captions: settings.captions,
          captionStyle: settings.captionStyle,
          captionPosition: settings.captionPosition,
          face,
        },
        (ratio) => setJobs((current) => ({ ...current, [index]: { status: 'rendering', progress: ratio } })),
      )

      const previous = results[index]
      if (previous) {
        URL.revokeObjectURL(previous.url)
        if (previous.posterUrl) URL.revokeObjectURL(previous.posterUrl)
        urlsRef.current.delete(previous.url)
        if (previous.posterUrl) urlsRef.current.delete(previous.posterUrl)
      }
      const url = trackUrl(URL.createObjectURL(renderedClip.blob))
      const posterUrl = renderedClip.poster ? trackUrl(URL.createObjectURL(renderedClip.poster)) : null
      setResults((current) => ({
        ...current,
        [index]: {
          url,
          posterUrl,
          name: `clipfarm-${settings.format}-${formatStamp(moment.start).replace(/:/g, '-')}-${slugify(moment.title)}.mp4`,
          size: renderedClip.blob.size,
          duration: renderedClip.duration,
          face,
          width: renderedClip.width,
          height: renderedClip.height,
          blob: renderedClip.blob,
        },
      }))
      setJobs((current) => ({ ...current, [index]: { status: 'done', progress: 1 } }))
      return true
    } catch (cause) {
      setJobs((current) => ({
        ...current,
        [index]: { status: 'error', progress: 0, error: cause instanceof Error ? cause.message : 'The render failed in this browser.' },
      }))
      return false
    }
  }

  async function renderSingle(index: number) {
    if (!file || busy || transcribing || runningRef.current) return
    runningRef.current = true
    setRendering(true)
    setActiveIndex(index)
    setPreviewIndex(null)
    try {
      await renderOne(index)
    } finally {
      setRendering(false)
      setActiveIndex(null)
      runningRef.current = false
    }
  }

  async function renderAll() {
    if (!file || !moments.length || busy || transcribing || runningRef.current) return
    runningRef.current = true
    cancelRef.current = false
    setPreviewIndex(null)
    setBatch({ total: moments.length, done: 0, running: true, startedAt: performance.now() })
    try {
      for (let index = 0; index < moments.length; index++) {
        if (cancelRef.current) break
        await renderOne(index)
        setBatch((current) => (current ? { ...current, done: index + 1 } : current))
      }
    } finally {
      setBatch((current) => (current ? { ...current, running: false } : current))
      runningRef.current = false
    }
  }

  function stopBatch() {
    cancelRef.current = true
    controllerRef.current?.abort()
  }

  async function downloadZip() {
    if (!rendered.length || zipping) return
    setZipping(true)
    try {
      const blob = await zipFiles(rendered.map((item) => ({ name: item.name, blob: item.blob })))
      const url = URL.createObjectURL(blob)
      downloadUrl(url, `${slugify(name)}-clips.zip`)
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } finally {
      setZipping(false)
    }
  }

  function updateTrim(index: number, field: 'start' | 'end', value: number) {
    setMoments((current) =>
      current.map((moment, position) => {
        if (position !== index) return moment
        if (field === 'start') return { ...moment, start: Math.max(0, Math.min(value, moment.end - 1)) }
        return { ...moment, end: Math.max(moment.start + 1, Math.min(value, duration || value)) }
      }),
    )
    setJobs((current) => {
      const next = { ...current }
      delete next[index]
      return next
    })
    setResults((current) => {
      const previous = current[index]
      if (previous) {
        URL.revokeObjectURL(previous.url)
        if (previous.posterUrl) URL.revokeObjectURL(previous.posterUrl)
        urlsRef.current.delete(previous.url)
        if (previous.posterUrl) urlsRef.current.delete(previous.posterUrl)
      }
      const next = { ...current }
      delete next[index]
      return next
    })
  }

  function togglePreview(index: number) {
    setPreviewIndex((current) => (current === index ? null : index))
    setPreviewTime(moments[index]?.start ?? 0)
  }

  useEffect(() => {
    const video = previewRef.current
    if (!video || !previewMoment) return
    video.currentTime = previewMoment.start
    void video.play().catch(() => undefined)
  }, [previewIndex, previewMoment?.start, previewMoment?.end, previewMoment])

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={inputRef}
        id="auto-clipper-file"
        type="file"
        accept="video/*,.mp4,.mov,.webm,.mkv"
        className="sr-only"
        onChange={(event) => {
          const next = event.target.files?.[0]
          if (next) void choose(next)
        }}
      />

      {!file ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const next = event.dataTransfer.files?.[0]
            if (next) void choose(next)
          }}
          className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-white/50 px-6 py-9 text-center"
        >
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-sand text-accent-ink">
            <Upload className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[1rem] font-semibold">Drop a VOD or stream export here</p>
            <p className="max-w-md text-[0.85rem] leading-relaxed text-muted">
              Any MP4, MOV, WebM or MKV with speech. The file is read in this tab and never uploaded.
            </p>
          </div>
          <Button variant="secondary" size="sm" icon={<FileVideo aria-hidden className="size-3.5" />} onClick={() => inputRef.current?.click()}>
            Choose a file
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={<FileVideo aria-hidden className="size-3.5" />} onClick={() => inputRef.current?.click()} disabled={busy || transcribing}>
            Choose another file
          </Button>
          <span className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-sand px-3 text-[0.78rem] font-medium text-ink-2">
            <span className="max-w-56 truncate">{file.name}</span>
            <span aria-hidden className="text-muted">·</span>
            <span className="tabular-nums">{mb(file.size)}</span>
            {duration ? (
              <>
                <span aria-hidden className="text-muted">·</span>
                <span className="tabular-nums">{formatStamp(duration)}</span>
              </>
            ) : null}
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-soft px-3 text-[0.78rem] font-semibold text-success">
            <CheckCircle2 aria-hidden className="size-3.5" /> On this device
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44">
          <SelectField
            label="Spoken language"
            options={TRANSCRIBE_LANGUAGES.map((entry) => entry.label)}
            value={TRANSCRIBE_LANGUAGES.find((entry) => entry.code === language)?.label ?? 'English'}
            onChange={(event) => setLanguage(TRANSCRIBE_LANGUAGES.find((entry) => entry.label === event.target.value)?.code ?? 'en')}
            disabled={transcribing || busy}
          />
        </div>
        {transcribing ? (
          <Button variant="secondary" size="sm" icon={<Square aria-hidden className="size-3.5" />} onClick={() => controllerRef.current?.abort()}>
            Stop transcribing
          </Button>
        ) : (
          <Button size="sm" icon={<Sparkles aria-hidden className="size-3.5" />} onClick={findMoments} disabled={!file || busy} loading={transcribing}>
            {moments.length ? 'Find moments again' : 'Find the best moments'}
          </Button>
        )}
        {!supported && <p className="text-[0.78rem] font-medium text-danger">This browser has no WebCodecs, so it cannot render here. Use Chrome or Edge.</p>}
      </div>

      {file && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[0.78rem] font-semibold tracking-[0.08em] text-muted uppercase">Output</p>
              <p className="text-[0.88rem] font-semibold">{spec.label}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FRAME_FORMATS) as FrameFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  aria-pressed={settings.format === format}
                  onClick={() => setSettings((current) => ({ ...current, format }))}
                  disabled={busy}
                  className={cx(
                    'inline-flex h-8 items-center rounded-full border px-3 text-[0.78rem] font-semibold transition-colors disabled:opacity-45',
                    settings.format === format ? 'border-ink bg-ink text-white' : 'border-line-strong bg-paper text-ink-2 hover:border-ink',
                  )}
                >
                  {FRAME_FORMATS[format].short}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.78rem] font-semibold text-ink-2">Caption style</span>
              <div className="flex flex-wrap gap-1.5">
                {CAPTION_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    title={style.blurb}
                    aria-pressed={settings.captionStyle === style.id}
                    onClick={() => setSettings((current) => ({ ...current, captionStyle: style.id }))}
                    disabled={busy || !showCaptions}
                    className={cx(
                      'inline-flex h-8 items-center rounded-full border px-3 text-[0.78rem] font-semibold transition-colors disabled:opacity-40',
                      settings.captionStyle === style.id ? 'border-ink bg-sand text-ink' : 'border-line-strong bg-paper text-ink-2 hover:border-ink',
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.78rem] font-semibold text-ink-2">Placement &amp; toggles</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-line-strong bg-paper p-0.5">
                  {(['top', 'bottom'] as CaptionPosition[]).map((position) => (
                    <button
                      key={position}
                      type="button"
                      aria-pressed={settings.captionPosition === position}
                      onClick={() => setSettings((current) => ({ ...current, captionPosition: position }))}
                      disabled={busy || !showCaptions}
                      className={cx('h-7 rounded-full px-3 text-[0.75rem] font-semibold capitalize disabled:opacity-40', settings.captionPosition === position ? 'bg-ink text-white' : 'text-ink-2')}
                    >
                      {position}
                    </button>
                  ))}
                </div>
                <label className={cx('inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink-2', !showCaptions && 'opacity-40')}>
                  <input
                    type="checkbox"
                    checked={settings.captions}
                    onChange={(event) => setSettings((current) => ({ ...current, captions: event.target.checked }))}
                    disabled={busy || settings.format === 'source'}
                    className="size-3.5 accent-[var(--color-ink)]"
                  />
                  Burn captions
                </label>
                <label className={cx('inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink-2', settings.format === 'source' && 'opacity-40')}>
                  <input
                    type="checkbox"
                    checked={settings.followFace}
                    onChange={(event) => setSettings((current) => ({ ...current, followFace: event.target.checked }))}
                    disabled={busy || settings.format === 'source'}
                    className="size-3.5 accent-[var(--color-ink)]"
                  />
                  Face-aware crop
                </label>
              </div>
            </div>
          </div>
          <p className="text-[0.76rem] leading-relaxed text-muted">
            {settings.format === 'source'
              ? 'The clip keeps its original frame; captions and face framing are off.'
              : `${spec.width}×${spec.height} · ${showCaptions ? `${CAPTION_STYLES.find((style) => style.id === settings.captionStyle)?.label} captions, ${settings.captionPosition} safe area` : 'no burned captions'}${settings.followFace ? ' · speaker-following crop' : ' · centre crop'}.`}{' '}
            These settings are remembered on this device.
          </p>
        </div>
      )}

      {transcribing && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(update.ratio * 100)}>
            <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${Math.round(update.ratio * 100)}%` }} />
          </div>
          <p className="text-[0.78rem] text-muted">
            {phaseLabel(update.phase)} · {Math.round(update.ratio * 100)}%{update.detail ? ` · ${update.detail}` : ''}
          </p>
        </div>
      )}

      {error && <Notice>{error}</Notice>}

      {previewMoment && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-[0.85rem] font-semibold">
              <Play aria-hidden className="size-3.5 text-accent-ink" /> Preview · {previewMoment.title}
            </p>
            <button type="button" onClick={() => setPreviewIndex(null)} className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close preview">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-ink sm:max-w-[240px]" style={{ aspectRatio: `${spec.width || 16} / ${spec.height || 9}` }}>
              <video
                ref={previewRef}
                src={fileUrl}
                playsInline
                className="size-full object-cover"
                onTimeUpdate={(event) => {
                  const video = event.currentTarget
                  setPreviewTime(video.currentTime)
                  if (video.currentTime >= previewMoment.end - 0.04) video.pause()
                }}
                onEnded={(event) => {
                  event.currentTarget.currentTime = previewMoment.start
                }}
              />
              <PreviewCaption text={previewSpoken?.text ?? null} style={settings.captionStyle} position={settings.captionPosition} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const video = previewRef.current
                    if (!video) return
                    if (video.paused) {
                      if (video.currentTime < previewMoment.start || video.currentTime >= previewMoment.end - 0.1) video.currentTime = previewMoment.start
                      void video.play().catch(() => undefined)
                    } else video.pause()
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[0.8rem] font-semibold text-white"
                >
                  <Play aria-hidden className="size-3.5" /> Play
                </button>
                <span className="text-[0.78rem] font-medium text-muted tabular-nums">
                  {formatStamp(previewTime)} / {formatStamp(previewMoment.end)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{ width: `${Math.max(0, Math.min(100, ((previewTime - previewMoment.start) / Math.max(1, previewMoment.end - previewMoment.start)) * 100))}%` }}
                />
              </div>
              <p className="line-clamp-4 text-[0.8rem] leading-relaxed text-body">{previewMoment.excerpt}</p>
              <p className="text-[0.76rem] leading-relaxed text-muted">
                The caption overlay is a live preview of the burned-in text. The export renders the same words at {spec.width || 'source'}×{spec.height || 'auto'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {moments.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
              <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                <CheckCircle2 aria-hidden className="size-4" /> {moments.length} moments
              </span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{stats.lines} lines</span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{clock(stats.cut)} of clips</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon={<Download aria-hidden className="size-3.5" />} onClick={() => saveText(`${name}.srt`, toSrt(segments))}>
                Transcript SRT
              </Button>
              {rendered.length > 1 && (
                <Button size="sm" variant="secondary" icon={<FileArchive aria-hidden className="size-3.5" />} onClick={downloadZip} loading={zipping}>
                  ZIP · {rendered.length}
                </Button>
              )}
              {batch?.running ? (
                <Button size="sm" variant="secondary" icon={<Square aria-hidden className="size-3.5" />} onClick={stopBatch}>
                  Stop batch
                </Button>
              ) : (
                <Button size="sm" icon={<Wand2 aria-hidden className="size-3.5" />} onClick={renderAll} disabled={busy || transcribing}>
                  Render all {moments.length}
                </Button>
              )}
            </div>
          </div>

          {batch && (
            <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-sand px-3 py-2.5" aria-live="polite">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${Math.round((batch.done / Math.max(1, batch.total)) * 100)}%` }} />
              </div>
              <p className="flex items-center gap-1.5 text-[0.76rem] font-medium text-muted">
                <Timer aria-hidden className="size-3.5" />
                {batch.running ? `Rendering ${Math.min(batch.done + 1, batch.total)} of ${batch.total} · ${eta}` : `Batch finished · ${batch.done} of ${batch.total} rendered`}
              </p>
            </div>
          )}

          <ol className="flex flex-col gap-2">
            {moments.map((moment, index) => {
              const job = jobs[index]
              const result = results[index]
              const length = Math.max(1, Math.round(moment.end - moment.start))
              return (
                <li
                  key={index}
                  className={cx(
                    'flex flex-col gap-3 rounded-[var(--radius-lg)] border p-3.5',
                    result ? 'border-ink/25 bg-sand/70' : 'border-line bg-white/60',
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {result?.posterUrl ? (
                      <img src={result.posterUrl} alt="" className="hidden h-20 w-11 shrink-0 rounded-md object-cover ring-1 ring-ink/10 sm:block" />
                    ) : (
                      <span aria-hidden className="hidden h-20 w-11 shrink-0 place-items-center rounded-md bg-ink text-[0.65rem] font-bold text-white/60 sm:grid">
                        {index + 1}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-ink px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-paper tabular-nums">{moment.score}</span>
                        <p className="min-w-0 text-[0.9rem] font-semibold">{moment.title}</p>
                      </div>
                      <p className="text-[0.75rem] font-medium text-muted tabular-nums">
                        {formatStamp(moment.start)}–{formatStamp(moment.end)} · {length}s
                        {result ? ` · ${mb(result.size)} · ${result.width}×${result.height}` : ''}
                      </p>
                      <p className="line-clamp-2 text-[0.8rem] leading-relaxed text-body">{moment.excerpt}</p>
                      {job?.status === 'error' && <p className="text-[0.76rem] font-medium text-danger">{job.error}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => togglePreview(index)}
                        className={cx(
                          'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.76rem] font-semibold transition-colors',
                          previewIndex === index ? 'border-ink bg-ink text-white' : 'border-line-strong bg-paper text-ink-2 hover:border-ink',
                        )}
                      >
                        <Play aria-hidden className="size-3" /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrimOpen((current) => (current === index ? null : index))}
                        aria-expanded={trimOpen === index}
                        className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong bg-paper px-3 text-[0.76rem] font-semibold text-ink-2 hover:border-ink"
                      >
                        Trim
                        <ChevronDown aria-hidden className={cx('size-3 transition-transform', trimOpen === index && 'rotate-180')} />
                      </button>
                      {result ? (
                        <Button size="sm" icon={<Download aria-hidden className="size-3.5" />} onClick={() => downloadUrl(result.url, result.name)}>
                          Download
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          icon={<Scissors aria-hidden className="size-3.5" />}
                          onClick={() => renderSingle(index)}
                          disabled={busy || transcribing}
                          loading={rendering && activeIndex === index}
                        >
                          Render
                        </Button>
                      )}
                    </div>
                  </div>

                  {trimOpen === index && (
                    <div className="grid gap-3 rounded-[var(--radius-md)] bg-white/70 p-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-ink-2">
                        Start (s)
                        <input
                          type="number"
                          min={0}
                          max={Math.max(0, moment.end - 1)}
                          step={0.1}
                          value={Number(moment.start.toFixed(1))}
                          onChange={(event) => updateTrim(index, 'start', Number(event.target.value))}
                          disabled={busy}
                          className="h-9 rounded-[var(--radius-sm)] border border-line-strong bg-paper px-2.5 text-[0.82rem] tabular-nums"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-ink-2">
                        End (s)
                        <input
                          type="number"
                          min={moment.start + 1}
                          max={duration || undefined}
                          step={0.1}
                          value={Number(moment.end.toFixed(1))}
                          onChange={(event) => updateTrim(index, 'end', Number(event.target.value))}
                          disabled={busy}
                          className="h-9 rounded-[var(--radius-sm)] border border-line-strong bg-paper px-2.5 text-[0.82rem] tabular-nums"
                        />
                      </label>
                      <div className="flex flex-col justify-end gap-1 text-[0.75rem] text-muted">
                        <span className="font-semibold text-ink-2 tabular-nums">{length}s cut</span>
                        <span>Edits reset this clip’s render.</span>
                      </div>
                    </div>
                  )}

                  {job?.status === 'face' && <p className="text-[0.76rem] font-medium text-muted">Finding the speaker for the crop…</p>}
                  {job?.status === 'rendering' && (
                    <div className="flex flex-col gap-1" aria-live="polite">
                      <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                        <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${Math.round(job.progress * 100)}%` }} />
                      </div>
                      <p className="text-[0.74rem] text-muted">
                        Rendering {spec.short} with {showCaptions ? 'burned captions' : 'no captions'} · {Math.round(job.progress * 100)}%
                      </p>
                    </div>
                  )}
                  {result && (
                    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-white/80 p-2">
                      <video src={result.url} controls playsInline className="max-h-72 w-full rounded-[0.6rem] bg-ink" />
                      <p className="inline-flex flex-wrap items-center gap-1.5 px-1 text-[0.74rem] text-muted">
                        <ScanFace aria-hidden className="size-3.5" />
                        {result.face && result.face.samples > 0 ? `Face locked in ${result.face.samples}/${result.face.checked} frames` : 'Centre crop'}
                        <span aria-hidden>·</span>
                        {result.duration.toFixed(1)}s
                        <span aria-hidden>·</span>
                        {mb(result.size)}
                        <span aria-hidden>·</span>
                        <span className="min-w-0 truncate">{result.name}</span>
                      </p>
                    </div>
                  )}
                  </li>
                )
              })}
          </ol>

          {rendered.length > 0 && (
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[0.78rem] text-muted">
              <CheckCircle2 aria-hidden className="size-3.5 text-success" />
              {rendered.length} real MP4{rendered.length === 1 ? '' : 's'} on this device · {mb(rendered.reduce((total, item) => total + item.size, 0))} total
              {rendered.length > 1 ? ' · ZIP bundles them into one download' : ''}
            </p>
          )}

          <details className="rounded-[var(--radius-lg)] border border-line bg-white/60 p-3" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer list-none text-[0.82rem] font-semibold text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Captions aria-hidden className="size-3.5" /> Transcript · {stats.lines} timed lines
                <ChevronDown aria-hidden className={cx('size-3.5 transition-transform', detailsOpen && 'rotate-180')} />
              </span>
            </summary>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-[var(--radius-sm)] bg-sand/70 p-2">
              {segments.map((segment, index) => (
                <p key={index} className="flex gap-2 px-1 py-0.5 text-[0.78rem] leading-relaxed">
                  <span className="shrink-0 font-semibold text-muted tabular-nums">{formatStamp(segment.start)}</span>
                  <span className="text-body">{segment.text}</span>
                </p>
              ))}
            </div>
          </details>
        </div>
      )}

      {moments.length === 0 && !transcribing && file && (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-sand p-3 text-[0.8rem] leading-relaxed text-body">
          <LoaderCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <p>
            The desk transcribes the file, ranks up to eight non-overlapping moments, then renders the ones you pick. A talkative 20-minute stream takes a few
            minutes of on-device Whisper time; keep this tab open.
          </p>
        </div>
      )}

      <p className="flex flex-wrap items-center gap-1.5 text-[0.78rem] leading-relaxed text-muted">
        <Mic aria-hidden className="size-3.5" />
        Whisper tiny ({WHISPER_SIZE}, cached after the first run) transcribes locally; the scorer ranks laughter, claims, questions and dense speech. Face framing
        loads a ~15 MB model once from a public CDN. Nothing is uploaded, and every download is a real file.
      </p>
    </div>
  )
}
