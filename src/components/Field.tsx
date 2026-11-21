import { ChevronDown } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cx } from '../lib/cx'
import type { Force } from './Button'

export const controlBase =
  'w-full rounded-[var(--radius-md)] border bg-paper px-4 text-[0.975rem] text-ink transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-muted/80 hover:border-ink/50 focus:border-ink focus:shadow-[0_0_0_3px_rgb(240_162_75/0.35)] focus:outline-none disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted data-[force=hover]:border-ink/50 data-[force=focus]:border-ink data-[force=focus]:shadow-[0_0_0_3px_rgb(240_162_75/0.35)]'

type FieldShell = { label: string; hint?: ReactNode; error?: string; optional?: boolean; className?: string; force?: Force }

function Shell({ id, label, hint, error, optional, className, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[0.9rem] font-semibold text-ink-2">
        {label}
        {optional && <span className="text-[0.8rem] font-normal text-muted">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-e`} className="text-[0.85rem] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-h`} className="text-[0.85rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-e` : hint ? `${id}-h` : undefined
}

export function TextField({ label, hint, error, optional, className, force, id: given, ...rest }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input id={id} data-force={force} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={cx(controlBase, 'h-12', error ? 'border-danger' : 'border-line-strong')} {...rest} />
    </Shell>
  )
}

export function TextArea({ label, hint, error, optional, className, force, id: given, ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea id={id} data-force={force} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={cx(controlBase, 'min-h-28 resize-y py-3', error ? 'border-danger' : 'border-line-strong')} {...rest} />
    </Shell>
  )
}

export function SelectField({ label, hint, error, optional, className, force, id: given, options, placeholder, ...rest }: FieldShell & SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; placeholder?: string }) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        <select id={id} data-force={force} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={cx(controlBase, 'h-12 appearance-none pr-10', error ? 'border-danger' : 'border-line-strong')} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4.5 -translate-y-1/2 text-muted" />
      </div>
    </Shell>
  )
}

/** A form-level message: error, success or info. */
export function Notice({ tone = 'error', children, className }: { tone?: 'error' | 'success' | 'info'; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-[var(--radius-md)] px-4 py-3 text-[0.9rem] font-medium', tone === 'error' && 'bg-[#fbe9ea] text-danger', tone === 'success' && 'bg-[#e5f3ea] text-success', tone === 'info' && 'bg-sand text-ink-2', className)}>
      {children}
    </div>
  )
}
