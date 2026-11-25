import { ArrowRight, Check, Cloud, Laptop, Layers, Link2, ScanFace, Sparkles, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from './Button'
import { Modal } from './Overlay'
import { Tag } from './Pill'
import { cx } from '../lib/cx'

export type StudioRuntime = 'cloud' | 'local' | 'both'

const FEATURES = [
  { icon: Link2, title: 'Every source in one place', text: 'Connect a channel, paste a link or upload a file.' },
  { icon: Sparkles, title: 'Find the moments', text: 'Transcribe, score and rank the clips worth posting.' },
  { icon: ScanFace, title: 'Edit for vertical', text: '9:16 preview, word-level captions and face-aware crops.' },
  { icon: UploadCloud, title: 'Export when ready', text: 'Download the MP4 and SRT, or publish to YouTube Shorts.' },
]

/**
 * Only Local exists today: the pipeline on the user's computer. Cloud and Both
 * need a hosted processing service and verified payments, neither of which is
 * built, so they are shown as coming soon and cannot be selected.
 */
const RUNTIMES: Array<{ id: StudioRuntime; title: string; text: string; icon: typeof Cloud; available: boolean }> = [
  { id: 'local', title: 'Local', text: 'Runs in the Clipfarm pipeline on this computer. Your videos stay on it.', icon: Laptop, available: true },
  { id: 'cloud', title: 'Cloud', text: 'Processing on Clipfarm servers, nothing to install.', icon: Cloud, available: false },
  { id: 'both', title: 'Both', text: 'Cloud for long jobs, this computer for everything else.', icon: Layers, available: false },
]

const readSession = (key: string) => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const writeSession = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* the step still works for this visit */
  }
}

const clearSession = (key: string) => {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* nothing else to do */
  }
}

type Props = {
  open: boolean
  storageKey: string
  onClose: () => void
  onComplete: (runtime: StudioRuntime) => void
}

export function StudioOnboarding({ open, storageKey, onClose, onComplete }: Props) {
  const stepKey = `${storageKey}.step`
  const [step, setStep] = useState<1 | 2>(() => (readSession(stepKey) === '2' ? 2 : 1))

  useEffect(() => {
    if (!open) return
    setStep(readSession(stepKey) === '2' ? 2 : 1)
  }, [open, stepKey])

  function next() {
    setStep(2)
    writeSession(stepKey, '2')
  }

  function back() {
    setStep(1)
    writeSession(stepKey, '1')
  }

  function finish() {
    clearSession(stepKey)
    onComplete('local')
  }

  const title = step === 1 ? 'Welcome to the Studio' : 'Choose how Clipfarm runs'
  const description =
    step === 1
      ? 'Everything from a long video to a captioned vertical clip, in one place.'
      : 'Local is available today. Cloud and Both open later; you can switch when they do.'

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} className="sm:max-w-xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          {[1, 2].map((dot) => (
            <span key={dot} className={cx('h-1.5 rounded-full transition-all', dot === step ? 'w-6 bg-ink' : dot < step ? 'w-1.5 bg-success' : 'w-1.5 bg-line-strong')} />
          ))}
        </div>
        <span className="text-[0.75rem] font-semibold text-muted">Step {step} of 2</span>
      </div>

      {step === 1 ? (
        <ul className="flex flex-col gap-1.5">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3 rounded-[var(--radius-md)] px-1 py-2">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
                <feature.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9rem] font-semibold">{feature.title}</span>
                <span className="block text-[0.82rem] leading-snug text-muted">{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div role="radiogroup" aria-label="How Clipfarm runs" className="flex flex-col gap-2">
          {RUNTIMES.map((option) => {
            const selected = option.id === 'local'
            return (
              <div
                key={option.id}
                role="radio"
                aria-checked={selected}
                aria-disabled={!option.available || undefined}
                aria-labelledby={`runtime-${option.id}`}
                aria-describedby={`runtime-${option.id}-text`}
                tabIndex={selected ? 0 : -1}
                className={cx(
                  'flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left',
                  selected ? 'border-ink bg-sand' : 'border-line opacity-70',
                )}
              >
                <span aria-hidden className={cx('grid size-9 shrink-0 place-items-center rounded-full', selected ? 'bg-ink text-white' : 'bg-sand text-muted')}>
                  <option.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[0.9rem] font-semibold">
                    <span id={`runtime-${option.id}`}>{option.title}</span>
                    {!option.available && <Tag tone="peach">Coming soon</Tag>}
                  </span>
                  <span id={`runtime-${option.id}-text`} className="block text-[0.8rem] leading-snug text-muted">
                    {option.text}
                    {!option.available && <span className="sr-only"> Coming soon, not available yet.</span>}
                  </span>
                </span>
                <span className={cx('mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full border', selected ? 'border-ink bg-ink text-white' : 'border-line-strong text-transparent')}>
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className={cx('mt-6 flex items-center gap-2 border-t border-line pt-4', step === 2 ? 'justify-between' : 'justify-end')}>
        {step === 2 && (
          <Button variant="ghost" onClick={back}>
            Back
          </Button>
        )}
        {step === 1 ? (
          <Button onClick={next} icon={<ArrowRight aria-hidden className="size-4" />}>
            Next
          </Button>
        ) : (
          <Button onClick={finish}>Open Studio</Button>
        )}
      </div>

      <p className="mt-3 text-center text-[0.7rem] text-muted">You will not see this setup again after you finish.</p>
    </Modal>
  )
}
