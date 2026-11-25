import { AlertTriangle, Check, FolderOpen, Loader2, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { cx } from '../lib/cx'
import { invoke, on, type PrepareLine } from './bridge'
import { usePipelineStatus } from './hooks'

/**
 * Phase 1 start screen: runs the real preparation (verify runtime, ffmpeg,
 * face model, fonts, folders, pipeline, database) and shows each line live.
 * Later phases put the first-run screens in front of this.
 */
export function Boot({ onReady }: { onReady: () => void }) {
  const pipeline = usePipelineStatus()
  const [lines, setLines] = useState<PrepareLine[]>([])
  const [running, setRunning] = useState(false)
  const [ok, setOk] = useState<boolean | null>(null)

  const run = useCallback(async () => {
    setRunning(true)
    setOk(null)
    setLines([])
    const result = await invoke('prepare:run')
    setLines(result.lines)
    setOk(result.ok)
    setRunning(false)
  }, [])

  useEffect(() => {
    const off = on('prepare:line', (line) => setLines((current) => [...current.filter((item) => item.id !== line.id), line]))
    void run()
    return off
  }, [run])

  const order = ['runtime', 'ffmpeg', 'face', 'fonts', 'folders', 'pipeline', 'database']
  const sorted = [...lines].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

  return (
    <main className="grid min-h-svh place-items-center bg-sand p-8">
      <div className="w-full max-w-xl rounded-[var(--radius-xl)] bg-paper p-8 shadow-[var(--shadow-card)]">
        <Logo />
        <h1 className="mt-6 text-[1.6rem] font-semibold tracking-[-0.03em]">{ok ? 'Done' : ok === false ? 'Something needs attention' : 'Preparing all the clip things…'}</h1>
        <ul className="mt-5 flex flex-col gap-2" aria-live="polite">
          {sorted.map((line) => (
            <li key={line.id} className="flex items-start gap-3 text-[0.9rem]">
              <span aria-hidden className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', line.state === 'done' ? 'bg-success text-white' : line.state === 'failed' ? 'bg-danger text-white' : 'bg-sand text-muted')}>
                {line.state === 'done' ? <Check className="size-3" strokeWidth={3} /> : line.state === 'failed' ? <AlertTriangle className="size-3" /> : line.state === 'running' ? <Loader2 className="size-3 animate-spin" /> : null}
              </span>
              <span className="min-w-0">
                <span className="font-semibold">{line.label}</span>
                {line.state === 'running' && typeof line.progress === 'number' && line.progress > 0 && <span className="ml-2 text-muted tabular-nums">{Math.round(line.progress * 100)}%</span>}
                {line.detail && <span className={cx('block text-[0.8rem]', line.state === 'failed' ? 'text-danger' : 'text-muted')}>{line.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {ok && (
            <Button onClick={onReady} disabled={pipeline?.state !== 'ready'}>
              Continue
            </Button>
          )}
          {ok === false && (
            <>
              <Button onClick={() => void run()} icon={<RotateCcw aria-hidden className="size-4" />} loading={running}>
                Try again
              </Button>
              <Button variant="secondary" onClick={() => void invoke('shell:open-path', 'logs')} icon={<FolderOpen aria-hidden className="size-4" />}>
                Open logs
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
