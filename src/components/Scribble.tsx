import { cx } from '../lib/cx'

/** The hand-drawn arrow pointing at the hero button, with its note. */
export function Scribble({ note, className }: { note: string; className?: string }) {
  return (
    <span aria-hidden className={cx('pointer-events-none flex items-center gap-1 text-ink', className)}>
      <svg viewBox="0 0 96 40" className="h-9 w-[92px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path pathLength={1} strokeDasharray="1" className="animate-draw" d="M90 30c-14 4-30 4-34 0-3-4 6-9 12-10-12-6-34-3-56-4" />
        <path pathLength={1} strokeDasharray="1" className="animate-draw" d="M19 9l-9 7 10 6" />
      </svg>
      <span className="animate-wiggle font-hand text-[1.6rem] leading-none font-semibold whitespace-nowrap">{note}</span>
    </span>
  )
}
