import { Link } from 'react-router'

import { SITE } from '../content'
import { cx } from '../lib/cx'

/** Two people under one roof: the Peoplefirst mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cx('shrink-0', className)}>
      <circle cx="12" cy="8" r="4.5" fill="currentColor" />
      <circle cx="28" cy="8" r="4.5" fill="currentColor" />
      <path d="M5 19c0-2.2 1.8-4 4-4h22c2.2 0 4 1.8 4 4v1.5c0 2.5-2 4.5-4.5 4.5h-21C7 25 5 23 5 20.5V19Z" fill="currentColor" />
      <rect x="7" y="27" width="7" height="11" rx="2.5" fill="currentColor" />
      <rect x="26" y="27" width="7" height="11" rx="2.5" fill="currentColor" />
    </svg>
  )
}

export function Logo({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'white' }) {
  return (
    <Link to="/" aria-label={`${SITE.name} home`} className={cx('inline-flex min-h-11 items-center gap-2.5 rounded-full', tone === 'white' ? 'text-white' : 'text-ink', className)}>
      <LogoMark className="size-8" />
      <span className="text-[1.5rem] leading-none font-bold tracking-[-0.045em]">{SITE.short}</span>
    </Link>
  )
}
