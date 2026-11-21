import { Check } from 'lucide-react'

import { cx } from '../lib/cx'

/** Progress through a multi-step form. Completed steps are buttons that go back. */
export function Stepper({ steps, current, onStep, className }: { steps: string[]; current: number; onStep?: (i: number) => void; className?: string }) {
  return (
    <ol className={cx('flex items-center gap-2', className)}>
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        const inner = (
          <>
            <span className={cx('round grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold transition-colors', done && 'bg-accent text-ink', active && 'bg-ink text-white', !done && !active && 'bg-ink/8 text-muted')}>{done ? <Check aria-hidden className="size-3.5" strokeWidth={3.2} /> : i + 1}</span>
            <span className={cx('hidden text-[0.875rem] font-semibold sm:inline', active ? 'text-ink' : 'text-muted')}>{s}</span>
          </>
        )
        return (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            {done && onStep ? (
              <button type="button" onClick={() => onStep(i)} className="flex min-h-10 items-center gap-2 rounded-full pr-2" aria-label={`Back to step ${i + 1}: ${s}`}>
                {inner}
              </button>
            ) : (
              <span className="flex min-h-10 items-center gap-2">
                {inner}
                <span className="sr-only">{active ? '(current step)' : '(not started)'}</span>
              </span>
            )}
            {i < steps.length - 1 && <span aria-hidden className={cx('h-0.5 flex-1 rounded-full', done ? 'bg-accent' : 'bg-ink/10')} />}
          </li>
        )
      })}
    </ol>
  )
}
