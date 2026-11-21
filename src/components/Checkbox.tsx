import { Check } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cx } from '../lib/cx'
import type { Force } from './Button'

/** A real checkbox drawn as a round tick. */
export function Checkbox({ label, className, force, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; force?: Force }) {
  const id = useId()
  return (
    <label htmlFor={id} data-force={force} className={cx('group flex min-h-10 cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] py-2 has-disabled:cursor-not-allowed has-disabled:opacity-50', className)}>
      <span className="relative mt-px grid size-6 shrink-0 place-items-center">
        <input id={id} type="checkbox" className="peer round absolute inset-0 size-full cursor-pointer appearance-none rounded-full border-2 border-line-strong bg-paper transition-colors checked:border-ink checked:bg-ink hover:border-ink group-data-[force=hover]:border-ink group-data-[force=focus]:outline-[2.5px] group-data-[force=focus]:outline-offset-2 group-data-[force=focus]:outline-ink disabled:cursor-not-allowed" {...rest} />
        <Check aria-hidden className="pointer-events-none relative size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3.4} />
      </span>
      <span className="text-[0.95rem] leading-snug text-ink-2 group-has-checked:text-muted group-has-checked:line-through">{label}</span>
    </label>
  )
}
