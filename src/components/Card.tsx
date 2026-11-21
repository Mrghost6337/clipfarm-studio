import type { HTMLAttributes, ReactNode } from 'react'

import { cx } from '../lib/cx'

export function Card({ children, className, tone = 'paper', ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: 'paper' | 'sand' | 'ink' | 'peach'; children: ReactNode }) {
  return (
    <div
      className={cx(
        'relative rounded-[var(--radius-lg)] p-6 sm:p-8',
        tone === 'paper' && 'bg-paper shadow-[var(--shadow-card)]',
        tone === 'sand' && 'border border-line bg-sand',
        tone === 'ink' && 'bg-ink text-white',
        tone === 'peach' && 'bg-peach',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Stat({ value, label, className, tone = 'ink' }: { value: string; label: string; className?: string; tone?: 'ink' | 'white' }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <span className={cx('text-[2.5rem] leading-none font-semibold tracking-[-0.045em] tabular-nums', tone === 'white' ? 'text-white' : 'text-ink')}>{value}</span>
      <span className={cx('text-[0.9rem] leading-snug', tone === 'white' ? 'text-white/75' : 'text-muted')}>{label}</span>
    </div>
  )
}
