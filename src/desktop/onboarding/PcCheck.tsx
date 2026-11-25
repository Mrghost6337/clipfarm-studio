import { AlertTriangle, Check, Cloud, Cpu, Laptop, Layers, Loader2, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { Button } from '../../components/Button'
import { Notice } from '../../components/Field'
import { Tag } from '../../components/Pill'
import { requestJson } from '../../lib/api'
import { cx } from '../../lib/cx'
import { PLANS } from '../../shared/account'
import { invoke, on, type PcCheckResult, type PcItem, type Recommendation, type WorkMode } from '../bridge'
import { playSound } from '../sound'
import { Frame } from './Frame'

type WebCodecs = { state: PcItem['state']; detail: string }

/** WebCodecs runs in the page, so the page checks it: encode and decode H.264 at 1080×1920. */
async function checkWebCodecs(): Promise<WebCodecs> {
  const encoder = (globalThis as { VideoEncoder?: { isConfigSupported: (c: unknown) => Promise<{ supported?: boolean }> } }).VideoEncoder
  const decoder = (globalThis as { VideoDecoder?: { isConfigSupported: (c: unknown) => Promise<{ supported?: boolean }> } }).VideoDecoder
  if (!encoder || !decoder) return { state: 'failed', detail: 'Not available in this window' }
  const config = { codec: 'avc1.640028', width: 1080, height: 1920 }
  const [enc, dec] = await Promise.all([encoder.isConfigSupported({ ...config, bitrate: 8_000_000, framerate: 30 }), decoder.isConfigSupported({ codec: config.codec, codedWidth: 1080, codedHeight: 1920 })])
  return enc.supported && dec.supported ? { state: 'done', detail: 'H.264 encode and decode at 1080×1920' } : { state: 'failed', detail: `H.264 ${enc.supported ? '' : 'encode '}${dec.supported ? '' : 'decode '}not supported` }
}

function ItemRow({ label, state, progress, detail }: { label: string; state: PcItem['state']; progress: number; detail: string | null }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span aria-hidden className={cx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full transition-colors', state === 'done' ? 'bg-success text-white' : state === 'failed' ? 'bg-danger text-white' : 'bg-sand text-muted')}>
        {state === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : state === 'failed' ? <AlertTriangle className="size-3.5" /> : state === 'running' ? <Loader2 className="size-3.5 animate-spin" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className={cx('text-[0.95rem] font-semibold', state === 'pending' && 'text-muted')}>{label}</span>
          <span className="text-[0.8rem] text-muted tabular-nums">{state === 'pending' ? '' : `${Math.round(progress * 100)}%`}</span>
        </span>
        {state === 'running' && (
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        )}
        {detail && <span className={cx('mt-0.5 block text-[0.82rem]', state === 'failed' ? 'text-danger' : 'text-muted')}>{detail}</span>}
      </span>
    </li>
  )
}

const MODES: Array<{ id: WorkMode; title: string; text: string; icon: typeof Cloud; available: boolean }> = [
  { id: 'local', title: 'Local (free)', text: 'Lightweight models on this PC. Your videos stay here.', icon: Laptop, available: true },
  { id: 'cloud', title: 'Cloud', text: `Premium AI models on a paid plan, from $${Math.min(...PLANS.map((plan) => plan.price))} a month.`, icon: Cloud, available: false },
  { id: 'both', title: 'Both', text: 'Cloud for long VODs, this PC for the rest.', icon: Layers, available: false },
]

/**
 * Step 6: ask first, then check this PC for real and recommend a model.
 * Ends with "How do you want to work?", Local preselected.
 */
export function PcCheck({ preferred, onDone, onBack }: { preferred: WorkMode | null; onDone: (result: { recommendation: Recommendation; workMode: WorkMode }) => void; onBack?: () => void }) {
  const [phase, setPhase] = useState<'ask' | 'running' | 'result'>('ask')
  const [items, setItems] = useState<PcItem[]>([])
  const [webcodecs, setWebcodecs] = useState<WebCodecs>({ state: 'pending', detail: '' })
  const [result, setResult] = useState<PcCheckResult | null>(null)
  const [skipped, setSkipped] = useState<Recommendation | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mode: WorkMode = preferred && MODES.find((item) => item.id === preferred)?.available ? preferred : 'local'

  useEffect(() => on('pccheck:item', (item) => setItems((current) => [...current.filter((entry) => entry.id !== item.id), item])), [])

  async function run() {
    setPhase('running')
    setError('')
    setItems([])
    setWebcodecs({ state: 'running', detail: '' })
    setWebcodecs(await checkWebCodecs().catch(() => ({ state: 'failed' as const, detail: 'Could not be checked' })))
    try {
      const outcome = await invoke('pccheck:run')
      setResult(outcome)
      setPhase('result')
      void playSound('check')
    } catch (failure) {
      setError(`The check stopped: ${failure instanceof Error ? failure.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(failure)}`)
      setPhase('ask')
    }
  }

  async function skip() {
    setSkipped(await invoke('pccheck:skip'))
    setPhase('result')
  }

  async function confirm() {
    const recommendation = result?.recommendation ?? skipped
    if (!recommendation) return
    setSaving(true)
    setError('')
    await invoke('state:update', { workMode: mode })
    // Keep the account in step so the browser Studio does not ask again.
    const saved = await requestJson<{ user: unknown }>('/api/auth/preferences', { method: 'PATCH', body: JSON.stringify({ workMode: mode }) })
    setSaving(false)
    if (!saved.ok && saved.status !== 0 && saved.status !== 503) {
      setError(saved.error)
      return
    }
    onDone({ recommendation, workMode: mode })
  }

  const order = ['windows', 'cpu', 'memory', 'gpu', 'disk', 'ffmpeg', 'benchmark']
  const sorted = [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  const recommendation = result?.recommendation ?? skipped

  return (
    <Frame onBack={phase === 'running' ? undefined : onBack} wide>
      {phase === 'ask' && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <span className="grid size-16 place-items-center rounded-[var(--radius-lg)] bg-ink text-apricot">
            <Cpu aria-hidden className="size-8" />
          </span>
          <h1 className="text-[2.4rem] leading-[1.06] font-semibold tracking-[-0.04em]">Check this PC?</h1>
          <p className="text-[1.0625rem] leading-relaxed text-body">
            Clipfarm looks at your Windows version, processor, memory, graphics card, free disk space, video support and ffmpeg, then runs a speed test of about ten seconds. It uses the result to pick a speech model that runs reliably here.
          </p>
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-paper px-4 py-3 text-left text-[0.9rem] text-ink-2 shadow-[var(--shadow-card)]">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            Nothing from the check leaves your computer.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => void run()} autoFocus>
              Check this PC
            </Button>
            <Button size="lg" variant="secondary" onClick={() => void skip()}>
              Skip and use the lightest setup
            </Button>
          </div>
          {error && <Notice>{error}</Notice>}
          <p className="text-[0.85rem] text-muted">You can run the check later in Settings.</p>
        </div>
      )}

      {phase !== 'ask' && (
        <div className="grid grid-cols-[1.1fr_1fr] gap-6">
          <div className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-card)]">
            <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">{phase === 'running' ? 'Checking this PC…' : skipped ? 'Check skipped' : 'Your PC'}</h1>
            {skipped ? (
              <>
                <p className="mt-3 text-[0.95rem] text-body">No information was read. Clipfarm uses the lightest model, which works on any PC that can run the app.</p>
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => {
                    setSkipped(null)
                    void run()
                  }}
                >
                  Run the check instead
                </Button>
              </>
            ) : (
              <ul className="mt-3 divide-y divide-line" aria-live="polite">
                {sorted.map((item) => (
                  <ItemRow key={item.id} {...item} />
                ))}
                <ItemRow label="Video support (WebCodecs)" state={webcodecs.state} progress={webcodecs.state === 'pending' || webcodecs.state === 'running' ? 0 : 1} detail={webcodecs.detail || null} />
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-5">
            {phase === 'running' && (
              <div className="grid flex-1 place-items-center rounded-[var(--radius-xl)] border border-dashed border-line-strong p-6 text-center text-[0.95rem] text-muted">
                The recommendation appears when the check is done.
              </div>
            )}
            {phase === 'result' && recommendation && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
                <div className="rounded-[var(--radius-xl)] bg-ink p-6 text-white">
                  <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-white/55 uppercase">Recommended model</p>
                  <p className="mt-1 text-[1.6rem] font-semibold tracking-[-0.03em]">Whisper {recommendation.model.replace('whisper-', '')}</p>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-white/75">{recommendation.reason}</p>
                </div>
                <div>
                  <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">How do you want to work?</h2>
                  <div role="radiogroup" aria-label="How do you want to work" className="mt-3 flex flex-col gap-2">
                    {MODES.map((option) => {
                      const selected = option.available && option.id === mode
                      return (
                        <div key={option.id} role="radio" aria-checked={selected} aria-disabled={!option.available || undefined} aria-labelledby={`mode-${option.id}`} tabIndex={selected ? 0 : -1} className={cx('flex items-start gap-3 rounded-[var(--radius-md)] border p-3.5', selected ? 'border-ink bg-paper' : 'border-line bg-paper/60 opacity-70')}>
                          <span aria-hidden className={cx('grid size-9 shrink-0 place-items-center rounded-full', selected ? 'bg-ink text-apricot' : 'bg-sand text-muted')}>
                            <option.icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-[0.95rem] font-semibold">
                              <span id={`mode-${option.id}`}>{option.title}</span>
                              {option.available ? <Tag tone="peach">Recommended</Tag> : <Tag>Coming soon</Tag>}
                            </span>
                            <span className="block text-[0.85rem] text-muted">{option.text}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {error && <Notice>{error}</Notice>}
                <Button size="lg" onClick={() => void confirm()} loading={saving} autoFocus>
                  Continue with Local
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </Frame>
  )
}
