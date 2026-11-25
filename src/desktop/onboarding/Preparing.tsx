import { AlertTriangle, Check, FolderOpen, Loader2, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '../../components/Button'
import { cx } from '../../lib/cx'
import { invoke, on, type PrepareLine } from '../bridge'
import { Frame } from './Frame'

const ORDER = ['runtime', 'ffmpeg', 'face', 'fonts', 'folders', 'pipeline', 'database']

/**
 * Step 3: the real setup work (verify the bundled runtime, ffmpeg, face model
 * and fonts, create folders and the job database, start the pipeline).
 * The progress bar counts finished steps; nothing here is simulated.
 */
export function Preparing({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [lines, setLines] = useState<PrepareLine[]>([])
  const [result, setResult] = useState<boolean | null>(null)

  const run = useCallback(async () => {
    setResult(null)
    setLines([])
    const outcome = await invoke('prepare:run')
    setLines(outcome.lines)
    setResult(outcome.ok)
  }, [])

  useEffect(() => {
    const off = on('prepare:line', (line) => setLines((current) => [...current.filter((item) => item.id !== line.id), line]))
    void run()
    return off
  }, [run])

  const sorted = [...lines].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
  const done = lines.filter((line) => line.state === 'done').length
  const running = lines.find((line) => line.state === 'running')
  const fraction = (done + (running?.progress ?? 0)) / ORDER.length

  return (
    <Frame onBack={result === null ? undefined : onBack}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div aria-hidden className="relative mb-4 h-28 w-40">
          {[0, 1, 2].map((card) => (
            <motion.span
              key={card}
              className="absolute top-0 left-1/2 h-28 w-16 rounded-[var(--radius-sm)] border border-line bg-paper shadow-[var(--shadow-card)]"
              style={{ marginLeft: -32 }}
              animate={result === true ? { x: (card - 1) * 46, rotate: (card - 1) * 6, y: 0 } : { x: [(card - 1) * 30, (card - 1) * 46, (card - 1) * 30], rotate: [(card - 1) * 4, (card - 1) * 9, (card - 1) * 4], y: [0, -6, 0] }}
              transition={result === true ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 2.4, repeat: Infinity, delay: card * 0.2, ease: 'easeInOut' }}
            >
              <span className="absolute inset-x-2 top-3 h-12 rounded-[8px] bg-peach" />
              <span className="absolute inset-x-2 bottom-5 h-1.5 rounded-full bg-line-strong" />
              <span className="absolute inset-x-2 bottom-2.5 h-1.5 w-2/3 rounded-full bg-line" />
            </motion.span>
          ))}
        </div>
        <h1 className="text-[2.4rem] leading-[1.06] font-semibold tracking-[-0.04em]">{result ? 'Done' : result === false ? 'Something needs attention' : 'We’re working on your app'}</h1>
        <p className="text-[1.0625rem] text-body">{result ? 'Everything is in place.' : result === false ? 'One step did not finish. You can try again.' : 'Preparing all the clip things…'}</p>
      </div>

      <div className="mt-8 rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-card)]">
        <div className="h-1.5 overflow-hidden rounded-full bg-sand" role="progressbar" aria-label="Preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${Math.round(fraction * 100)}%` }} transition={{ duration: 0.4 }} />
        </div>
        <ul className="mt-5 flex flex-col gap-2.5" aria-live="polite">
          {sorted.map((line) => (
            <li key={line.id} className="flex items-start gap-3 text-[0.92rem]">
              <span aria-hidden className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full transition-colors', line.state === 'done' ? 'bg-success text-white' : line.state === 'failed' ? 'bg-danger text-white' : 'bg-sand text-muted')}>
                {line.state === 'done' ? <Check className="size-3" strokeWidth={3} /> : line.state === 'failed' ? <AlertTriangle className="size-3" /> : line.state === 'running' ? <Loader2 className="size-3 animate-spin" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('font-semibold', line.state === 'pending' && 'text-muted')}>{line.label}</span>
                {line.state === 'running' && typeof line.progress === 'number' && line.progress > 0 && <span className="ml-2 text-muted tabular-nums">{Math.round(line.progress * 100)}%</span>}
                {line.detail && <span className={cx('block truncate text-[0.8rem]', line.state === 'failed' ? 'whitespace-normal text-danger' : 'text-muted')}>{line.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {result === true && (
          <Button size="lg" onClick={onDone} autoFocus>
            Continue
          </Button>
        )}
        {result === false && (
          <>
            <Button onClick={() => void run()} icon={<RotateCcw aria-hidden className="size-4" />}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => void invoke('shell:open-path', 'logs')} icon={<FolderOpen aria-hidden className="size-4" />}>
              Open logs
            </Button>
          </>
        )}
      </div>
    </Frame>
  )
}
