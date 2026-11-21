import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from '../lib/cx'
import type { Force } from './Button'

/** Outline pill with an apricot check dot, as in the hero marquee. */
export function CheckPill({ children, className, wrap }: { children: ReactNode; className?: string; wrap?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 rounded-full border border-[#d9c6ad] bg-white/30 pr-4 pl-3 text-[0.9rem] font-medium text-ink-2 backdrop-blur-[2px]', wrap ? 'min-h-10 min-w-0 py-2' : 'h-10 shrink-0 whitespace-nowrap', className)}>
      <span aria-hidden className="round grid size-4.5 place-items-center rounded-full bg-accent text-white">
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      {children}
    </span>
  )
}

/** Grey speech-style badge with an optional avatar, above the hero headline. */
export function Badge({ children, avatar, className, tone = 'grey' }: { children: ReactNode; avatar?: { src: string; alt: string }; className?: string; tone?: 'grey' | 'white' | 'peach' }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      {avatar && <img src={avatar.src} alt={avatar.alt} width={40} height={40} className="round size-10 rounded-full object-cover ring-2 ring-white" />}
      <span className={cx('inline-flex h-9 items-center rounded-full px-3.5 text-[0.9rem] font-medium italic text-ink-2', tone === 'grey' && 'bg-[#e4e2de]', tone === 'white' && 'bg-paper shadow-[var(--shadow-card)]', tone === 'peach' && 'bg-peach')}>{children}</span>
    </span>
  )
}

/** Eyebrow label above section headings. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-8 w-fit items-center gap-2 rounded-full border border-line-strong bg-paper/70 px-3.5 text-[0.8125rem] font-semibold text-ink-2', className)}>
      <span aria-hidden className="round size-2 rounded-full bg-accent" />
      {children}
    </span>
  )
}

/** Selectable filter chip (toggle). */
export function Chip({ selected, children, className, force, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; force?: Force }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-force={force}
      className={cx(
        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[0.875rem] font-medium transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 data-[force=pressed]:scale-[0.97] data-[force=focus]:outline-[2.5px] data-[force=focus]:outline-offset-3 data-[force=focus]:outline-ink',
        selected ? 'border-ink bg-ink text-white' : 'border-line-strong bg-paper text-ink-2 hover:border-ink data-[force=hover]:border-ink',
        className,
      )}
      {...rest}
    >
      {selected && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      {children}
    </button>
  )
}

/** Small static tag used on cards. */
export function Tag({ children, tone = 'line' }: { children: ReactNode; tone?: 'line' | 'peach' | 'ink' }) {
  return <span className={cx('inline-flex h-7 items-center rounded-full px-3 text-[0.78rem] font-semibold', tone === 'line' && 'border border-line-strong text-ink-2', tone === 'peach' && 'bg-peach text-accent-ink', tone === 'ink' && 'bg-ink text-white')}>{children}</span>
}
