import { ArrowRight, Link2, Mic, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { analyzeUrl, addTranscript } from '../lib/clipData'
import { formatStamp, type ClipSource } from '../shared/clips'
import { Button } from './Button'
import { Notice, TextArea, TextField } from './Field'
import { useToast } from './Toast'
import { TranscribeAgent } from './TranscribeAgent'

/**
 * The link → clips form. Detection runs on the Worker against the real VOD:
 * captions when the platform serves them, the creator's chapters otherwise.
 * When neither exists the form asks for a transcript instead of inventing clips.
 */
export function AnalyzeForm({ onAnalyzed, compact }: { onAnalyzed?: () => void; compact?: boolean }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [found, setFound] = useState<{ count: number; title: string } | null>(null)
  const [source, setSource] = useState<ClipSource | null>(null)
  const [transcript, setTranscript] = useState('')
  const [pasting, setPasting] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const toast = useToast()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    setFound(null)
    setBusy(true)
    const result = await analyzeUrl(url)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      if (result.needsTranscript && result.source) {
        setSource(result.source)
        setTranscript('')
      }
      return
    }
    setSource(null)
    setFound({ count: result.clips.length, title: result.source?.title ?? 'your VOD' })
    setUrl('')
    toast(`${result.clips.length} clip${result.clips.length === 1 ? '' : 's'} detected`)
    onAnalyzed?.()
  }

  async function useTranscript(event: FormEvent) {
    event.preventDefault()
    if (!source || pasting) return
    setError('')
    setPasting(true)
    const result = await addTranscript(source.id, transcript)
    setPasting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSource(null)
    setTranscript('')
    setFound({ count: result.created, title: source.title })
    toast(`${result.created} clip${result.created === 1 ? '' : 's'} detected from the transcript`)
    onAnalyzed?.()
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField
          label="Video link"
          hint="YouTube (watch, Shorts or live), Twitch VOD or Twitch clip."
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="flex-1"
          autoComplete="off"
          inputMode="url"
          required
        />
        <Button type="submit" loading={busy} icon={<Link2 aria-hidden className="size-4" />} className="sm:mb-0 sm:h-12">
          {busy ? 'Analyzing' : 'Find clips'}
        </Button>
      </form>

      {busy && (
        <p role="status" className="flex items-center gap-2 text-[0.875rem] text-muted">
          <Sparkles aria-hidden className="size-4 animate-pulse text-accent-ink" />
          Reading the video, its duration and its timed text…
        </p>
      )}
      {error && <Notice>{error}</Notice>}

      {found && (
        <Notice tone="success">
          {found.count} clip{found.count === 1 ? '' : 's'} cut from “{found.title}”.{' '}
          <Link to="/dashboard/clips" className="font-semibold underline decoration-2 underline-offset-4">
            Open clips
          </Link>
        </Notice>
      )}

      {source && (
        <form onSubmit={useTranscript} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line-strong bg-sand p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-[1.05rem] font-semibold">YouTube withheld the captions — bring your own transcript</h3>
            <p className="text-[0.875rem] leading-relaxed text-body">
              “{source.title}” is saved, but YouTube does not always give captions to servers. Paste a transcript with timestamps (VTT, SRT or “0:12 text” lines), or use the free on-device transcriber on your download. The detector cuts real clips from either one.
            </p>
            <p className="text-[0.8rem] text-muted">
              Source saved · {source.platform} · {source.duration ? formatStamp(source.duration) : 'duration unknown'}
            </p>
            <p className="text-[0.8rem] text-muted">
              No transcript yet? Generate one for free from your download in{' '}
              <Link to="/dashboard/studio" className="font-semibold text-ink underline decoration-2 underline-offset-4">
                Studio → Transcribe agent
              </Link>
              .
            </p>
          </div>
          <TextArea label="Transcript" placeholder={'0:00 hello chat\n0:14 that was actually insane\n0:31 no way he hit that'} value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={compact ? 5 : 7} required />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="secondary" icon={<Mic aria-hidden className="size-3.5" />} onClick={() => setTranscribing((value) => !value)}>
              {transcribing ? 'Hide the free transcriber' : 'Transcribe my download for free'}
            </Button>
          </div>
          {transcribing && (
            <div className="rounded-[var(--radius-lg)] border border-line-strong bg-paper p-4">
              <TranscribeAgent
                compact
                onTranscript={async (text) => {
                  setTranscript(text)
                  setTranscribing(false)
                  if (!source) return
                  setError('')
                  setPasting(true)
                  const result = await addTranscript(source.id, text)
                  setPasting(false)
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  setSource(null)
                  setTranscript('')
                  setFound({ count: result.created, title: source.title })
                  toast(`${result.created} clip${result.created === 1 ? '' : 's'} detected from your transcript`)
                  onAnalyzed?.()
                }}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pasting} icon={<ArrowRight aria-hidden className="size-4" />}>
              Detect clips
            </Button>
            <button type="button" onClick={() => setSource(null)} className="min-h-10 text-[0.875rem] font-semibold text-muted hover:text-ink">
              Use another link
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
