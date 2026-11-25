import { AlertTriangle, Check, Copy, Link2, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'

import { Button } from './Button'
import { Notice } from './Field'
import { cancelPairing, connectPipeline, getPipelineStatus, pipelineMode, startPairing, subscribePipeline, type PipelineStatus } from '../lib/pipeline'

/** Live connection state of the local pipeline (see src/lib/pipeline.ts). */
export function usePipelineStatus(): PipelineStatus {
  return useSyncExternalStore(subscribePipeline, getPipelineStatus, getPipelineStatus)
}

const START_COMMANDS = `bash scripts/setup.sh\n.venv/bin/python -m pipeline.cli serve`

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <div className="flex items-stretch gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded-[var(--radius-md)] bg-ink p-4 text-[0.76rem] leading-relaxed text-white">{command}</pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(command).then(() => setCopied(true))
        }}
        aria-label={copied ? 'Copied' : 'Copy command'}
        className="grid size-11 shrink-0 place-items-center self-start rounded-full border border-line-strong bg-paper text-ink-2 transition-colors hover:border-ink"
      >
        {copied ? <Check aria-hidden className="size-4 text-success" /> : <Copy aria-hidden className="size-4" />}
      </button>
    </div>
  )
}

type Props = {
  /** The page could reach the service but a request failed: show the offline card with this reason. */
  failure?: string | null
  onRetry?: () => void
}

/**
 * The card shown in place of a pipeline-backed screen until the local service
 * is reachable and this browser is allowed to use it.
 */
export function PipelineConnect({ failure, onRetry }: Props) {
  const status = usePipelineStatus()
  const retry = () => {
    onRetry?.()
    void connectPipeline()
  }

  const shell = (eyebrow: { text: string; tone: 'danger' | 'muted' }, title: string, body: ReactNode, icon: ReactNode) => (
    <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-paper p-7 shadow-[var(--shadow-card)]" role="region" aria-label="Local pipeline connection">
      <div className={`flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.08em] uppercase ${eyebrow.tone === 'danger' ? 'text-danger' : 'text-muted'}`}>
        {icon} {eyebrow.text}
      </div>
      <h1 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.03em] text-balance">{title}</h1>
      <div className="mt-2 flex flex-col gap-4 text-[0.9rem] leading-relaxed text-body">{body}</div>
    </div>
  )

  if (status.state === 'checking') {
    return (
      <div role="status" className="flex items-center gap-3 text-[0.9rem] text-muted">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Looking for the Clipfarm pipeline on this computer…
      </div>
    )
  }

  if (status.state === 'blocked') {
    return shell(
      { text: 'Access blocked', tone: 'danger' },
      'Your browser blocked this page from reaching your computer',
      <>
        <p>The Studio talks to the pipeline on 127.0.0.1. Your browser asked whether this site may access devices on your local network, and the answer was no.</p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Click the site icon to the left of the address bar.</li>
          <li>Open Site settings and set Local network access to Allow.</li>
          <li>Come back and try again.</li>
        </ol>
        <Button className="self-start" onClick={retry}>Try again</Button>
      </>,
      <ShieldOff aria-hidden className="size-3.5" />,
    )
  }

  if (status.state === 'unpaired') {
    return shell(
      { text: 'Pipeline found', tone: 'muted' },
      'Connect this browser to your pipeline',
      <>
        <p>The pipeline is running on this computer. To keep other websites out, it only answers browsers you approve on this computer. You do this once per browser, and you can disconnect it at any time.</p>
        {status.error && <Notice>{status.error}</Notice>}
        <Button className="self-start" icon={<Link2 aria-hidden className="size-4" />} onClick={() => void startPairing()}>
          Connect this browser
        </Button>
      </>,
      <ShieldCheck aria-hidden className="size-3.5" />,
    )
  }

  if (status.state === 'pairing') {
    return shell(
      { text: 'Waiting for approval', tone: 'muted' },
      'Approve this browser on your computer',
      <>
        <p>
          Check that the code below matches, then approve it in the terminal where the pipeline runs. The code expires in ten minutes.
        </p>
        <p className="text-center font-mono text-[2rem] font-semibold tracking-[0.12em] text-ink tabular-nums" aria-label={`Pairing code ${status.code.split('').join(' ')}`}>
          {status.code}
        </p>
        <CopyCommand command={`.venv/bin/python -m pipeline.cli pair approve ${status.code}`} />
        <div className="flex items-center justify-between gap-3">
          <span role="status" className="flex items-center gap-2 text-[0.85rem] text-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Waiting for approval…
          </span>
          <Button variant="secondary" size="sm" onClick={cancelPairing}>
            Cancel
          </Button>
        </div>
      </>,
      <ShieldCheck aria-hidden className="size-3.5" />,
    )
  }

  // Inside the desktop app the main process runs the pipeline: offer a restart, not setup commands.
  const desktop = (window as { clipfarm?: { invoke: (channel: string, arg?: unknown) => Promise<unknown> } }).clipfarm
  if (desktop) {
    return shell(
      { text: 'Pipeline offline', tone: 'danger' },
      'The pipeline is not answering',
      <>
        <p>{failure || 'Clipfarm starts it for you and restarts it after a crash. If it keeps failing, restart it here or open the logs.'}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void desktop.invoke('pipeline:restart')
              onRetry?.()
            }}
          >
            Restart the pipeline
          </Button>
          <Button variant="secondary" onClick={() => void desktop.invoke('shell:open-path', 'logs')}>
            Open logs
          </Button>
        </div>
      </>,
      <AlertTriangle aria-hidden className="size-3.5" />,
    )
  }

  // offline, or ready but a request failed
  const proxy = pipelineMode() === 'proxy'
  return shell(
    { text: 'Pipeline offline', tone: 'danger' },
    'Start the local service to use the Studio',
    <>
      <p>{failure || 'The website cannot run ffmpeg, Whisper or yt-dlp. They run in the Clipfarm pipeline on your computer. Start it, then try again.'}</p>
      <CopyCommand command={START_COMMANDS} />
      {!proxy && <p className="text-[0.8rem] text-muted">The Studio looks for it on 127.0.0.1, ports 8787 to 8791.</p>}
      <Button className="self-start" onClick={retry}>Retry connection</Button>
    </>,
    <AlertTriangle aria-hidden className="size-3.5" />,
  )
}
