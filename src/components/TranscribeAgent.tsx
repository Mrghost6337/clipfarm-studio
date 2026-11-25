import { Check, Copy, Download, FileAudio, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { cx } from '../lib/cx'
import {
  formatClock,
  toSrt,
  toTimedText,
  transcribeMedia,
  TRANSCRIBE_LANGUAGES,
  WHISPER_SIZE,
  type TranscribeUpdate,
  type TranscriptSegment,
} from '../lib/transcribe'
import { Button } from './Button'
import { Notice, SelectField } from './Field'

const phaseLabel = (phase: TranscribeUpdate['phase']) =>
  phase === 'model' ? 'Loading Whisper tiny' : phase === 'decode' ? 'Reading the audio' : 'Transcribing'

function save(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Free, fully local speech-to-text. Whisper tiny runs in a Web Worker and the
 * transcript is real output from the user's own file.
 */
export function TranscribeAgent({ onTranscript, compact = false }: { onTranscript?: (timedText: string) => void; compact?: boolean } = {}) {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('en')
  const [busy, setBusy] = useState(false)
  const [update, setUpdate] = useState<TranscribeUpdate>({ phase: 'model', ratio: 0, detail: '' })
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      controllerRef.current?.abort()
    },
    [],
  )

  async function start() {
    if (!file || busy) return
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError('')
    setSegments([])
    setCopied(false)
    setUpdate({ phase: 'model', ratio: 0, detail: 'Whisper tiny' })
    try {
      const result = await transcribeMedia(file, { language, signal: controller.signal, onUpdate: setUpdate })
      setSegments(result.segments)
      setDuration(result.duration)
      if (!result.segments.length) setError('No speech was detected. Check the audio track, or try another language.')
      else onTranscript?.(toTimedText(result.segments))
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') setError('Transcription stopped.')
      else setError(cause instanceof Error ? cause.message : 'Transcription failed in this browser.')
    } finally {
      setBusy(false)
      controllerRef.current = null
    }
  }

  function stop() {
    controllerRef.current?.abort()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(toTimedText(segments))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('The clipboard is blocked in this browser. Download the SRT instead.')
    }
  }

  const name = file?.name.replace(/\.[^.]+$/, '') ?? 'transcript'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <input
          ref={inputRef}
          id="transcribe-file"
          type="file"
          accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.m4a,.mp3,.wav"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0]
            if (!next) return
            setFile(next)
            setSegments([])
            setDuration(0)
            setError('')
            setCopied(false)
          }}
        />
        <Button variant="secondary" size="sm" icon={<FileAudio aria-hidden className="size-3.5" />} onClick={() => inputRef.current?.click()}>
          {file ? 'Choose another file' : 'Choose a VOD or audio file'}
        </Button>
        <div className="min-w-40">
          <SelectField
            label="Spoken language"
            options={TRANSCRIBE_LANGUAGES.map((entry) => entry.label)}
            value={TRANSCRIBE_LANGUAGES.find((entry) => entry.code === language)?.label ?? 'English'}
            onChange={(event) => setLanguage(TRANSCRIBE_LANGUAGES.find((entry) => entry.label === event.target.value)?.code ?? 'en')}
          />
        </div>
        {busy ? (
          <Button variant="secondary" size="sm" icon={<Square aria-hidden className="size-3.5" />} onClick={stop}>
            Stop
          </Button>
        ) : (
          <Button size="sm" icon={<Mic aria-hidden className="size-3.5" />} onClick={start} disabled={!file}>
            Transcribe for free
          </Button>
        )}
      </div>

      {file ? (
        <p className="min-w-0 truncate text-[0.8rem] text-muted">
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
        </p>
      ) : (
        <p className="text-[0.8rem] text-muted">Video or audio from your own download. The file is never uploaded.</p>
      )}

      {busy && (
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

      {segments.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-sand p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-success">
              <Check aria-hidden className="size-4" />
              {segments.length} timed lines · {formatClock(duration)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />} onClick={copy}>
                {copied ? 'Copied' : 'Copy timed text'}
              </Button>
              <Button size="sm" variant="secondary" icon={<Download aria-hidden className="size-3.5" />} onClick={() => save(`${name}.srt`, toSrt(segments))}>
                Download SRT
              </Button>
              <Button size="sm" variant="secondary" icon={<Download aria-hidden className="size-3.5" />} onClick={() => save(`${name}.txt`, toTimedText(segments))}>
                .txt
              </Button>
            </div>
          </div>

          <ol className="max-h-72 overflow-auto rounded-[var(--radius-md)] bg-paper p-3 text-[0.82rem] leading-relaxed">
            {segments.slice(0, 400).map((segment, index) => (
              <li key={`${segment.start}-${index}`} className="flex gap-3 border-b border-line/60 py-1.5 last:border-0">
                <span className="w-14 shrink-0 font-semibold tabular-nums text-muted">{formatClock(segment.start)}</span>
                <span className="min-w-0">{segment.text}</span>
              </li>
            ))}
          </ol>

          {!compact && (
            <p className={cx('text-[0.78rem] leading-relaxed text-muted')}>
              No captions on a link? Paste the timed text into{' '}
              <Link to="/dashboard/sources" className="font-semibold text-ink underline decoration-2 underline-offset-4">
                Sources → paste transcript
              </Link>{' '}
              and the detector cuts clips from it.
            </p>
          )}
        </div>
      )}

      <p className="text-[0.78rem] leading-relaxed text-muted">
        Whisper tiny ({WHISPER_SIZE} download, cached after the first run) runs in a Web Worker on this device. Free, MIT-licensed, no account, key or upload. Long VODs take a while: the audio is processed in 30-second pieces.
      </p>
    </div>
  )
}
