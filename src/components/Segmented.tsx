import { motion } from 'motion/react'
import { useId } from 'react'

import { cx } from '../lib/cx'

/** A pill toggle group (radio semantics). Arrow keys move between options. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex rounded-full border border-line-strong bg-paper p-1', className)}
      onKeyDown={(e) => {
        if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return
        e.preventDefault()
        const i = options.findIndex((o) => o.value === value)
        const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length]
        onChange(next.value)
        ;(e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus()
      }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} data-value={o.value} tabIndex={active ? 0 : -1} onClick={() => onChange(o.value)} className={cx('relative h-10 rounded-full px-4 text-[0.875rem] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)]', active ? 'text-white' : 'text-ink-2 hover:text-ink')}>
            {active && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
