import { AlertTriangle, Check, Download, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '../../components/Button'
import { Notice } from '../../components/Field'
import { Tag } from '../../components/Pill'
import { cx } from '../../lib/cx'
import { invoke, on, type ModelInfo, type ModelProgress, type ModelTest } from '../bridge'
import { formatBytes, formatDuration } from '../hooks'
import { playSound } from '../sound'
import { Frame } from './Frame'

const LANGUAGES: Record<string, string> = { en: 'English', nl: 'Dutch', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese' }

/**
 * Step 7: download the chosen model with real byte progress (pause, resume,
 * resume after a restart, retry), verify it, then prove it works with a test
 * transcription and face detection before marking it ready.
 */
export function Models({ recommended, onDone, onBack }: { recommended: string; onDone: () => void; onBack?: () => void }) {
  const [models, setModels] = useState<ModelInfo[] | null>(null)
  const [choice, setChoice] = useState(recommended)
  const [progress, setProgress] = useState<ModelProgress | null>(null)
  const [test, setTest] = useState<{ state: 'idle' | 'running' | 'done' | 'failed'; result?: ModelTest; error?: string }>({ state: 'idle' })
  const tested = useRef(false)

  useEffect(() => {
    void invoke('models:list').then((list) => {
      setModels(list)
      // A download that was in progress when the app closed is the user's choice: continue with it.
      const unfinished = list.find((model) => !model.installed && model.progress?.state === 'paused')
      const current = unfinished ?? list.find((model) => model.id === recommended)
      if (current) setChoice(current.id)
      if (current?.progress) setProgress(current.progress)
    })
    return on('models:progress', (update) => {
      setProgress((current) => (update.id === (current?.id ?? update.id) ? update : current))
      // Keep the cards in step (percent, installed).
      setModels((list) => list?.map((item) => (item.id === update.id ? { ...item, installed: update.state === 'installed', progress: update } : item)) ?? list)
    })
  }, [recommended])

  const model = models?.find((item) => item.id === choice)
  const start = useCallback(() => {
    setTest({ state: 'idle' })
    tested.current = false
    void invoke('models:download', choice)
  }, [choice])

  // A download paused before the app closed resumes as soon as the screen opens.
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !models || !model) return
    resumed.current = true
    if (!model.installed && model.progress?.state === 'paused') start()
  }, [models, model, start])

  const installed = progress?.state === 'installed' || (model?.installed && progress?.state !== 'downloading')

  const runTest = useCallback(async () => {
    setTest({ state: 'running' })
    try {
      const result = await invoke('models:test', choice)
      setTest(result.ok ? { state: 'done', result } : { state: 'failed', result, error: 'The test did not produce a transcript and a face. Try again.' })
      if (result.ok) void playSound('ready')
    } catch (error) {
      setTest({ state: 'failed', error: error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(error) })
    }
  }, [choice])

  useEffect(() => {
    if (installed && !tested.current) {
      tested.current = true
      void runTest()
    }
  }, [installed, runTest])

  const busy = progress?.state === 'downloading' || progress?.state === 'verifying'
  const fraction = progress ? progress.received / Math.max(1, progress.total) : model?.installed ? 1 : 0

  return (
    <Frame onBack={busy || test.state === 'running' ? undefined : onBack} wide>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="text-center">
          <h1 className="text-[2.4rem] leading-[1.06] font-semibold tracking-[-0.04em]">{test.state === 'done' ? 'Your model is ready' : 'Downloading your models'}</h1>
          <p className="mt-2 text-[1rem] text-body">Speech models turn what is said in a video into word-timed captions. They run on this PC.</p>
        </div>

        {models && (
          <div role="radiogroup" aria-label="Speech model" className="grid grid-cols-3 gap-3">
            {models.map((item) => {
              const active = item.id === choice
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy || test.state === 'running'}
                  onClick={() => {
                    setChoice(item.id)
                    setProgress(item.progress)
                    setTest({ state: 'idle' })
                    tested.current = false
                  }}
                  className={cx('flex flex-col gap-1 rounded-[var(--radius-md)] border-2 bg-paper p-4 text-left transition-colors disabled:cursor-not-allowed', active ? 'border-ink' : 'border-transparent hover:border-line-strong')}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[1.05rem] font-semibold">Whisper {item.label}</span>
                    {item.id === recommended && <Tag tone="peach">Recommended</Tag>}
                  </span>
                  <span className="text-[0.85rem] text-muted">
                    {formatBytes(item.bytes)} · {item.installed ? 'Installed' : item.progress && item.progress.received > 0 ? `${Math.round((item.progress.received / item.bytes) * 100)}% downloaded` : 'Not downloaded'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[1.05rem] font-semibold">Whisper {model?.label ?? ''}</p>
              <p className="text-[0.82rem] text-muted">
                {model ? `${model.license} licence · from Hugging Face, checked with SHA-256` : 'Loading…'}
              </p>
            </div>
            <span className="text-[1.6rem] font-semibold tracking-[-0.03em] tabular-nums">{Math.round(fraction * 100)}%</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sand" role="progressbar" aria-label="Download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
            <motion.div className={cx('h-full rounded-full', progress?.state === 'error' ? 'bg-danger' : 'bg-accent')} animate={{ width: `${Math.round(fraction * 100)}%` }} transition={{ duration: 0.25 }} />
          </div>
          <dl className="mt-4 grid grid-cols-4 gap-3 text-[0.85rem]">
            {[
              ['Downloaded', progress ? `${formatBytes(progress.received)} of ${formatBytes(progress.total)}` : model ? `0 of ${formatBytes(model.bytes)}` : '—'],
              ['Speed', progress?.state === 'downloading' && progress.speed > 0 ? `${formatBytes(progress.speed)}/s` : '—'],
              ['Time left', progress?.state === 'downloading' ? formatDuration(progress.eta) : '—'],
              ['Status', progress?.state === 'verifying' ? 'Checking files' : progress?.state === 'paused' ? 'Paused' : progress?.state === 'error' ? 'Stopped' : installed ? 'Installed' : progress?.state === 'downloading' ? 'Downloading' : 'Not started'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-sm)] bg-sand p-3">
                <dt className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">{label}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {progress?.state === 'error' && progress.error && <Notice className="mt-4">{progress.error}</Notice>}
          <div className="mt-5 flex flex-wrap gap-2">
            {!installed && !busy && (
              <Button onClick={start} icon={progress?.state === 'error' ? <RotateCcw aria-hidden className="size-4" /> : progress?.state === 'paused' ? <Play aria-hidden className="size-4" /> : <Download aria-hidden className="size-4" />}>
                {progress?.state === 'error' ? 'Retry' : progress?.state === 'paused' ? 'Resume' : 'Download'}
              </Button>
            )}
            {progress?.state === 'downloading' && (
              <Button variant="secondary" onClick={() => void invoke('models:pause', choice)} icon={<Pause aria-hidden className="size-4" />}>
                Pause
              </Button>
            )}
          </div>
        </div>

        {(installed || test.state !== 'idle') && (
          <div className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-card)]" aria-live="polite">
            <p className="flex items-center gap-2 text-[1.05rem] font-semibold">
              {test.state === 'running' ? <Loader2 aria-hidden className="size-4 animate-spin" /> : test.state === 'done' ? <Check aria-hidden className="size-4 text-success" strokeWidth={3} /> : test.state === 'failed' ? <AlertTriangle aria-hidden className="size-4 text-danger" /> : null}
              {test.state === 'running' ? 'Testing on a sample video…' : test.state === 'done' ? 'Test passed' : test.state === 'failed' ? 'Test failed' : 'Ready to test'}
            </p>
            {test.result && (
              <p className="mt-2 text-[0.9rem] leading-relaxed text-body">
                Transcribed {test.result.seconds} s of speech in {test.result.transcribeSeconds} s ({LANGUAGES[test.result.language] ?? test.result.language} detected) and found {test.result.faces} face{test.result.faces === 1 ? '' : 's'}.
                <span className="mt-1 block text-[0.82rem] text-muted">“{test.result.text}”</span>
              </p>
            )}
            {test.error && <Notice className="mt-3">{test.error}</Notice>}
            {test.state === 'failed' && (
              <Button className="mt-3" variant="secondary" onClick={() => void runTest()} icon={<RotateCcw aria-hidden className="size-4" />}>
                Test again
              </Button>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <Button size="lg" onClick={onDone} disabled={test.state !== 'done'}>
            Continue
          </Button>
        </div>
      </div>
    </Frame>
  )
}
