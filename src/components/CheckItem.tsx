import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

/** The reference's black check disc over a statement. */
export function CheckDisc({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'accent' }) {
  return (
    <span aria-hidden className={cx('round grid shrink-0 place-items-center rounded-full text-white', tone === 'ink' ? 'bg-ink' : 'bg-accent', className ?? 'size-8')}>
      <Check className="size-[55%]" strokeWidth={3.4} />
    </span>
  )
}

export function CheckPoint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <CheckDisc />
      <p className="text-[1.1875rem] leading-[1.32] font-medium tracking-[-0.018em] text-pretty text-ink">{children}</p>
    </div>
  )
}

export function CheckList({ items, className, size = 'md' }: { items: string[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <ul className={cx('flex flex-col', size === 'md' ? 'gap-3' : 'gap-2', className)}>
      {items.map((item) => (
        <li key={item} className={cx('flex items-start gap-3 text-body', size === 'md' ? 'text-[0.975rem]' : 'text-[0.9rem]')}>
          <CheckDisc className={cx('mt-0.5', size === 'md' ? 'size-5' : 'size-4.5')} tone="accent" />
          {item}
        </li>
      ))}
    </ul>
  )
}
