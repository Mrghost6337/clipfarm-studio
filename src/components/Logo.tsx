import { Link } from 'react-router'

import { SITE } from '../content'
import { cx } from '../lib/cx'

/** A vertical clip frame with a play cutout: the Clipfarm mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cx('shrink-0', className)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M12.5 3h15A9.5 9.5 0 0 1 37 12.5v15a9.5 9.5 0 0 1-9.5 9.5h-15A9.5 9.5 0 0 1 3 27.5v-15A9.5 9.5 0 0 1 12.5 3Zm6.5 10.6v12.8L29.5 20 19 13.6Z"
      />
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
