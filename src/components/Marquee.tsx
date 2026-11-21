import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

/**
 * An endless horizontal strip. Children render twice; the copy is hidden from
 * assistive tech. Hover or focus pauses it, and reduced motion stops it.
 */
export function Marquee({ children, className, slow, label }: { children: ReactNode; className?: string; slow?: boolean; label?: string }) {
  return (
    <div className={cx('group fade-x overflow-hidden', className)} role={label ? 'region' : undefined} aria-label={label}>
      <div className={cx('flex w-max motion-reduce:animate-none group-hover:[animation-play-state:paused]', slow ? 'animate-marquee-slow' : 'animate-marquee')}>
        <div className="flex shrink-0 items-center pr-[var(--gap)]" style={{ gap: 'var(--gap)' }}>{children}</div>
        <div aria-hidden className="flex shrink-0 items-center pr-[var(--gap)]" style={{ gap: 'var(--gap)' }} inert>
          {children}
        </div>
      </div>
    </div>
  )
}
