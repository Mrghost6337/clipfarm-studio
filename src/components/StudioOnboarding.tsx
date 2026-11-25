import { ArrowRight, Check, Cloud, Download, Laptop, Layers, Link2, Lock, ScanFace, Sparkles, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button, ButtonLink } from './Button'
import { Modal } from './Overlay'
import { cx } from '../lib/cx'

export type StudioRuntime = 'cloud' | 'local' | 'both'

const FEATURES = [
  { icon: Link2, title: 'Every source in one place', text: 'Connect a channel, paste a link or upload a file.' },
  { icon: Sparkles, title: 'AI finds the moments', text: 'Transcribe, score and rank the clips worth posting.' },
  { icon: ScanFace, title: 'Edit for vertical', text: '9:16 preview, word-level captions and face-aware crops.' },
  { icon: UploadCloud, title: 'Export when ready', text: 'Download the MP4 and SRT, or publish to YouTube Shorts.' },
]

const RUNTIMES: Array<{ id: StudioRuntime; title: string; text: string; icon: typeof Cloud }> = [
  { id: 'cloud', title: 'Cloud', text: 'Clip Farm processes your videos on our servers. Nothing to install.', icon: Cloud },
  { id: 'local', title: 'Local', text: 'Everything runs on this computer. Your source files never leave it.', icon: Laptop },
  { id: 'both', title: 'Both', text: 'Use the cloud for long jobs and the desktop app when you want local control.', icon: Layers },
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
  paid: boolean
  planName: string | null
  storageKey: string
  onClose: () => void
  onComplete: (runtime: StudioRuntime) => void
}

export function StudioOnboarding({ open, paid, planName, storageKey, onClose, onComplete }: Props) {
  const stepKey = `${storageKey}.step`
  const downloadKey = `${storageKey}.download`
  const [step, setStep] = useState<1 | 2>(() => (readSession(stepKey) === '2' ? 2 : 1))
  const [runtime, setRuntime] = useState<StudioRuntime>('cloud')
  const [downloadOpened, setDownloadOpened] = useState(() => readSession(downloadKey) === '1')

  useEffect(() => {
    if (!open) return
    setStep(readSession(stepKey) === '2' ? 2 : 1)
    setDownloadOpened(readSession(downloadKey) === '1')
  }, [open, stepKey, downloadKey])

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
    clearSession(downloadKey)
    onComplete(paid ? runtime : 'local')
  }

  const title = step === 1 ? 'Welcome to the new Studio' : paid ? 'Choose how to run Clip Farm' : 'Download the Clip Farm app first'
  const description =
    step === 1
      ? 'The Studio is new in this update.'
      : paid
        ? `You are on the ${planName ?? 'paid'} plan. Pick where Clip Farm should do the heavy lifting; you can change this later.`
        : 'You need to download the Clip Farm app before you can clip and use the Studio. On the Free plan, Clip Farm runs locally on your computer.'

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
      ) : paid ? (
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="How to run Clip Farm" className="flex flex-col gap-2">
            {RUNTIMES.map((option) => {
              const selected = runtime === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRuntime(option.id)}
                  className={cx(
                    'flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                    selected ? 'border-ink bg-sand' : 'border-line hover:border-line-strong',
                  )}
                >
                  <span aria-hidden className={cx('grid size-9 shrink-0 place-items-center rounded-full', selected ? 'bg-ink text-white' : 'bg-sand text-accent-ink')}>
                    <option.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9rem] font-semibold">{option.title}</span>
                    <span className="block text-[0.8rem] leading-snug text-muted">{option.text}</span>
                  </span>
                  <span className={cx('mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full border', selected ? 'border-ink bg-ink text-white' : 'border-line-strong text-transparent')}>
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                </button>
              )
            })}
          </div>

          {runtime !== 'cloud' && (
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-paper p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.8rem] leading-snug text-body">The desktop app is optional on your plan. The Studio still opens without it.</p>
              <ButtonLink
                to="/download"
                variant="secondary"
                size="sm"
                className="shrink-0"
                icon={<Download aria-hidden className="size-4" />}
              >
                Download the app
              </ButtonLink>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-sand p-3.5">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-accent-ink">
              <Lock className="size-4" />
            </span>
            <p className="text-[0.84rem] leading-relaxed text-body">
              The Studio stays locked on the Free plan until you have been through the download step. Desktop builds are coming soon; we cannot detect an installation automatically yet.
            </p>
          </div>

          <ButtonLink
            to="/download"
            className="w-full"
            icon={<Download aria-hidden className="size-4" />}
            onClick={() => {
              setDownloadOpened(true)
              writeSession(downloadKey, '1')
            }}
          >
            Download the app
          </ButtonLink>

          <p className={cx('text-[0.78rem] leading-relaxed', downloadOpened ? 'text-success' : 'text-muted')} role="status">
            {downloadOpened
              ? 'Download page opened. If the app is installed, continue. Otherwise install it first; automatic detection is not available yet.'
              : 'Open the download page first. The button below unlocks after that step.'}
          </p>
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
          <Button
            onClick={finish}
            disabled={!paid && !downloadOpened}
            title={!paid && !downloadOpened ? 'Open the download page before entering the Studio' : undefined}
          >
            {paid ? 'Open Studio' : 'Enter Studio'}
          </Button>
        )}
      </div>

      <p className="mt-3 text-center text-[0.7rem] text-muted">You will not see this setup again after you finish.</p>
    </Modal>
  )
}
