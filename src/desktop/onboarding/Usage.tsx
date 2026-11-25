import { Check, Cloud, Laptop, Layers } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/Button'
import { Tag } from '../../components/Pill'
import { cx } from '../../lib/cx'
import type { WorkMode } from '../bridge'
import { Frame } from './Frame'

const OPTIONS: Array<{ id: WorkMode; title: string; text: string; icon: typeof Cloud; available: boolean }> = [
  { id: 'local', title: 'Local', text: 'Everything runs on this PC with lightweight models. Free, and your videos never leave it.', icon: Laptop, available: true },
  { id: 'cloud', title: 'Cloud', text: 'Premium models on Clipfarm servers, on a paid plan. Not available yet.', icon: Cloud, available: false },
  { id: 'both', title: 'Both', text: 'Cloud for long VODs, this PC for everything else. Not available yet.', icon: Layers, available: false },
]

/** Step 2: how the user wants to work. A preference, confirmed after the PC check. */
export function Usage({ value, onChoose, onBack }: { value: WorkMode | null; onChoose: (mode: WorkMode) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<WorkMode>(value && OPTIONS.some((o) => o.id === value && o.available) ? value : 'local')
  return (
    <Frame onBack={onBack} wide>
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-[2.6rem] leading-[1.06] font-semibold tracking-[-0.04em]">How will you use Clipfarm?</h1>
        <p className="max-w-lg text-[1.0625rem] text-body">You can change this later in Settings.</p>
      </div>
      <div role="radiogroup" aria-label="How will you use Clipfarm" className="mt-10 grid grid-cols-3 gap-5">
        {OPTIONS.map((option) => {
          const active = option.available && selected === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={!option.available || undefined}
              disabled={!option.available}
              aria-labelledby={`usage-${option.id}`}
              aria-describedby={`usage-${option.id}-text`}
              onClick={() => setSelected(option.id)}
              className={cx(
                'group relative flex min-h-[260px] flex-col gap-5 rounded-[var(--radius-xl)] border-2 bg-paper p-7 text-left shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)]',
                active ? 'border-ink' : 'border-transparent',
                option.available ? 'hover:-translate-y-1 hover:shadow-[var(--shadow-raise)]' : 'cursor-not-allowed opacity-70',
              )}
            >
              <span className="flex items-start justify-between">
                <span aria-hidden className={cx('grid size-14 place-items-center rounded-[var(--radius-md)]', active ? 'bg-ink text-apricot' : 'bg-sand text-accent-ink')}>
                  <option.icon className="size-6" />
                </span>
                {option.available ? (
                  <span aria-hidden className={cx('round grid size-7 place-items-center rounded-full border-2', active ? 'border-ink bg-ink text-white' : 'border-line-strong text-transparent')}>
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : (
                  <Tag tone="peach">Coming soon</Tag>
                )}
              </span>
              <span id={`usage-${option.id}`} className="text-[1.5rem] font-semibold tracking-[-0.03em]">{option.title}</span>
              <span id={`usage-${option.id}-text`} className="text-[0.95rem] leading-relaxed text-body">{option.text}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-10 flex justify-center">
        <Button size="lg" onClick={() => onChoose(selected)}>
          Continue with {OPTIONS.find((option) => option.id === selected)?.title}
        </Button>
      </div>
    </Frame>
  )
}
