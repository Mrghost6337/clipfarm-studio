import { Captions, CheckCircle2, Download, FileVideo, ScanFace, Scissors } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CAPTION_STYLES,
  FRAME_FORMATS,
  canRenderInBrowser,
  readVideoDuration,
  renderClip,
  type CaptionPosition,
  type CaptionStyle,
  type FrameFormat,
} from '../lib/clipRender'
import { trackFace, type FaceReading } from '../lib/faceTrack'
import { cx } from '../lib/cx'
import { formatStamp, type Clip } from '../shared/clips'
import { clipSlug } from '../shared/exports'
import { Button } from './Button'
import { controlBase, Notice } from './Field'

type Result = { url: string; name: string; size: number; duration: number; face: FaceReading | null; width: number; height: number }

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/**
 * Cuts the user's own copy of the VOD with MediaBunny in the browser. The file
 * stays on the device; the downloaded MP4 is the real trimmed clip, framed and
 * captioned exactly like the auto-clipper's output.
 */
export function ClipCutter({ clip }: { clip: Clip }) {
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(clip.start)
  const [end, setEnd] = useState(clip.end)
  const [format, setFormat] = useState<FrameFormat>('tiktok')
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('bold')
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>('bottom')
  const [captions, setCaptions] = useState(true)
  const [followFace, setFollowFace] = useState(true)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [supported] = useState(() => canRenderInBrowser())
  const inputRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  const framed = format !== 'source'
  const burnCaptions = framed && captions && clip.cues.length > 0

  const clearResult = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setResult(null)
  }, [])

  useEffect(() => {
    setStart(clip.start)
    setEnd(clip.end)
    setProgress(0)
    setError('')
    setStage('')
    clearResult()
  }, [clip.id, clip.start, clip.end, clearResult])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  async function choose(next: File) {
    setFile(next)
    setError('')
    setProgress(0)
    setStage('')
    clearResult()
    try {
      const total = await readVideoDuration(next)
      if (!Number.isFinite(total) || total <= 0) throw new Error('empty')
      setDuration(total)
      const safeStart = clip.start < total - 1 ? clip.start : 0
      const safeEnd = Math.min(clip.end > safeStart + 1 ? clip.end : safeStart + 20, total)
      setStart(Math.round(safeStart * 10) / 10)
      setEnd(Math.round(safeEnd * 10) / 10)
    } catch {
      setDuration(0)
      setError('Could not read this file. Use an MP4, MOV or WebM with H.264 video.')
    }
  }

  async function cut() {
    if (!file) return
    setBusy(true)
    setError('')
    setProgress(0)
    setStage(framed && followFace ? 'Loading the face model and finding the speaker' : '')
    clearResult()
    try {
      let face: FaceReading | null = null
      if (framed && followFace) {
        try {
          face = await trackFace(file, start, end)
        } catch {
          face = null
        }
      }
      setStage(framed ? `Rendering ${FRAME_FORMATS[format].width}×${FRAME_FORMATS[format].height}` : 'Trimming and re-encoding')
      const rendered = await renderClip(
        file,
        { start, end, format, cues: clip.cues, captions: burnCaptions, captionStyle, captionPosition, face },
        setProgress,
      )
      const url = URL.createObjectURL(rendered.blob)
      urlRef.current = url
      setResult({
        url,
        name: `clipfarm-${clipSlug(clip)}-${framed ? FRAME_FORMATS[format].short.toLowerCase().replace(':', 'x') : 'cut'}.mp4`,
        size: rendered.blob.size,
        duration: rendered.duration,
        face,
        width: rendered.width,
        height: rendered.height,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The cut failed in this browser.')
    } finally {
      setBusy(false)
      setStage('')
    }
  }

  function download() {
    if (!result) return
    const link = document.createElement('a')
    link.href = result.url
    link.download = result.name
    link.click()
  }

  const valid = Boolean(file) && end > start + 0.2 && (!duration || end <= duration + 0.05)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id="clip-cutter-file"
          type="file"
          accept="video/*,.mp4,.mov,.webm,.mkv"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0]
            if (next) void choose(next)
          }}
        />
        <Button size="sm" variant="secondary" icon={<FileVideo aria-hidden className="size-3.5" />} onClick={() => inputRef.current?.click()} disabled={busy}>
          {file ? 'Choose another file' : 'Choose the downloaded VOD'}
        </Button>
        {file ? (
          <p className="min-w-0 truncate text-[0.8rem] text-muted">
            {file.name} · {mb(file.size)}
            {duration ? ` · ${formatStamp(duration)}` : ''}
          </p>
        ) : (
          <p className="text-[0.8rem] text-muted">MP4, MOV, WebM or MKV from your own download.</p>
        )}
      </div>

      {!supported && <Notice>This browser has no WebCodecs support, so it cannot cut video locally. Chrome, Edge or a recent Safari will.</Notice>}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-[0.8rem] font-semibold text-ink-2">
          Start (seconds)
          <input
            type="number"
            min={0}
            max={Math.max(0, duration - 0.5)}
            step={0.1}
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
            className={cx(controlBase, 'h-11 border-line-strong tabular-nums')}
          />
          <span className="text-[0.74rem] font-normal text-muted">{formatStamp(start)}</span>
        </label>
        <label className="flex flex-col gap-1.5 text-[0.8rem] font-semibold text-ink-2">
          End (seconds)
          <input
            type="number"
            min={0.3}
            max={duration || undefined}
            step={0.1}
            value={end}
            onChange={(event) => setEnd(Number(event.target.value))}
            className={cx(controlBase, 'h-11 border-line-strong tabular-nums')}
          />
          <span className="text-[0.74rem] font-normal text-muted">{formatStamp(end)}</span>
        </label>
        <div className="flex flex-col justify-center gap-1 rounded-[var(--radius-md)] bg-sand px-3 py-2">
          <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">Cut</span>
          <span className="text-[0.95rem] font-semibold tabular-nums">{Math.max(0, end - start).toFixed(1)}s</span>
          <span className="text-[0.74rem] text-muted">{(end - start) > 0 ? `${((end - start) / Math.max(1, duration || end - start) * 100).toFixed(0)}% of the source` : 'Pick a range'}</span>
        </div>
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-line bg-white/60 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[0.78rem] font-semibold text-ink-2">
          Frame
          <select value={format} onChange={(event) => setFormat(event.target.value as FrameFormat)} disabled={busy} className={cx(controlBase, 'h-10 border-line-strong text-[0.84rem]')}>
            {(Object.keys(FRAME_FORMATS) as FrameFormat[]).map((entry) => (
              <option key={entry} value={entry}>
                {FRAME_FORMATS[entry].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[0.78rem] font-semibold text-ink-2">
          Caption style
          <select
            value={captionStyle}
            onChange={(event) => setCaptionStyle(event.target.value as CaptionStyle)}
            disabled={busy || !burnCaptions}
            className={cx(controlBase, 'h-10 border-line-strong text-[0.84rem]')}
          >
            {CAPTION_STYLES.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label} — {style.blurb}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <div className={cx('inline-flex rounded-full border border-line-strong bg-paper p-0.5', !burnCaptions && 'opacity-40')}>
            {(['top', 'bottom'] as CaptionPosition[]).map((position) => (
              <button
                key={position}
                type="button"
                aria-pressed={captionPosition === position}
                onClick={() => setCaptionPosition(position)}
                disabled={busy || !burnCaptions}
                className={cx('h-7 rounded-full px-3 text-[0.75rem] font-semibold capitalize', captionPosition === position ? 'bg-ink text-white' : 'text-ink-2')}
              >
                {position}
              </button>
            ))}
          </div>
          <label className={cx('inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink-2', !framed && 'opacity-40')}>
            <input type="checkbox" checked={framed && captions} disabled={!framed || clip.cues.length === 0} onChange={(event) => setCaptions(event.target.checked)} className="size-3.5 accent-[var(--color-ink)]" />
            Burn captions{clip.cues.length === 0 ? ' (no cues)' : ''}
          </label>
          <label className={cx('inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink-2', !framed && 'opacity-45')}>
            <input type="checkbox" checked={framed && followFace} disabled={!framed} onChange={(event) => setFollowFace(event.target.checked)} className="size-3.5 accent-[var(--color-ink)]" />
            Face-aware crop
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={cut} loading={busy} disabled={!valid || !supported} icon={<Scissors aria-hidden className="size-4" />}>
          {busy ? 'Cutting…' : 'Cut the real clip'}
        </Button>
        <p className="text-[0.78rem] text-muted">Runs locally with MediaBunny. The video never leaves this tab.</p>
      </div>

      {busy && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-[0.78rem] text-muted">
            {Math.round(progress * 100)}%{stage ? ` — ${stage}` : framed ? ' — re-encoding the crop' : ' — trimming and re-encoding'}
          </p>
        </div>
      )}

      {error && <Notice>{error}</Notice>}

      {result && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-sand p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-success">
              <CheckCircle2 aria-hidden className="size-4" /> MP4 ready · {result.duration.toFixed(1)}s · {mb(result.size)}
            </p>
            <Button size="sm" icon={<Download aria-hidden className="size-4" />} onClick={download}>
              Download MP4
            </Button>
          </div>
          <video src={result.url} controls className="max-h-80 w-full rounded-[var(--radius-md)] bg-ink" />
          <p className="inline-flex flex-wrap items-center gap-1.5 text-[0.76rem] text-muted">
            {result.face && result.face.samples > 0 ? (
              <>
                <ScanFace aria-hidden className="size-3.5" /> Face locked in {result.face.samples}/{result.face.checked} frames ·
              </>
            ) : (
              <>
                <Captions aria-hidden className="size-3.5" /> Centre crop ·
              </>
            )}{' '}
            {result.width ? `${result.width}×${result.height} · ` : ''}
            {result.name}
          </p>
        </div>
      )}
    </div>
  )
}
