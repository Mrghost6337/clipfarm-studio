import type { ReactNode } from 'react'

import { CLIENTS } from '../content'
import { cx } from '../lib/cx'

type Client = (typeof CLIENTS)[number]

// Invented channel marks, drawn in SVG and type. Replace with real channel art (with permission).
const MARKS: Record<Client, { mark: ReactNode; word: ReactNode }> = {
  NovaPlays: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M16 2l3.6 10.4L30 16l-10.4 3.6L16 30l-3.6-10.4L2 16l10.4-3.6Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="text-[1.55rem] font-bold tracking-[-0.05em]">novaplays</span>,
  },
  LoudHouse: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <rect x="3" y="13" width="5" height="6" rx="1.5" fill="currentColor" />
        <rect x="11" y="6" width="5" height="20" rx="1.5" fill="currentColor" />
        <rect x="19" y="2" width="5" height="28" rx="1.5" fill="currentColor" />
        <rect x="27" y="11" width="3" height="10" rx="1.5" fill="currentColor" />
      </svg>
    ),
    word: <span className="text-[1.5rem] font-semibold tracking-[-0.02em]">LOUDHOUSE</span>,
  },
  PixelPunch: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <rect x="3" y="3" width="8" height="8" fill="currentColor" />
        <rect x="14" y="3" width="8" height="8" fill="currentColor" opacity="0.55" />
        <rect x="3" y="14" width="8" height="8" fill="currentColor" opacity="0.55" />
        <rect x="14" y="14" width="8" height="8" fill="currentColor" />
        <rect x="25" y="14" width="4" height="4" fill="currentColor" />
        <rect x="14" y="25" width="8" height="4" fill="currentColor" />
      </svg>
    ),
    word: (
      <span className="text-[1.45rem] tracking-[-0.03em]">
        Pixel<b className="font-extrabold">Punch</b>
      </span>
    ),
  },
  CheeseGang: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M2 8h28L4 27H2V8Z" fill="currentColor" />
        <circle cx="9" cy="14" r="2.2" fill="#f2f2f0" />
        <circle cx="16" cy="19" r="1.6" fill="#f2f2f0" />
      </svg>
    ),
    word: <span className="text-[1.4rem] font-black tracking-[-0.04em]">CHEESEGANG</span>,
  },
  NightOwl: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M21 2a14 14 0 1 0 9 22A15 15 0 0 1 21 2Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="font-[Georgia,serif] text-[1.55rem] font-semibold italic tracking-[-0.02em]">NightOwl</span>,
  },
  Stackd: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M4 8h24M7 16h18M11 24h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    word: <span className="text-[1.6rem] font-extrabold tracking-[-0.06em]">stackd</span>,
  },
  RageQuit: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M16 2c3 6 3 8 1 11 3-1 4-3 4-5 4 4 6 8 6 12a11 11 0 0 1-22 0c0-4 2-8 6-11-1 4 0 6 2 7-1-5 0-10 3-14Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="text-[1.5rem] font-extrabold italic tracking-[-0.045em]">ragequit</span>,
  },
  ClipCity: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <rect x="3" y="4" width="26" height="24" rx="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M14 11.5v9l7.5-4.5-7.5-4.5Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="text-[1.55rem] font-semibold tracking-[-0.04em]">clipcity</span>,
  },
}

export function ClientLogo({ name, className }: { name: Client; className?: string }) {
  const m = MARKS[name]
  return (
    <span role="img" aria-label={name} className={cx('inline-flex shrink-0 items-center gap-2 text-ink select-none', className)}>
      <span aria-hidden className="contents">
        {m.mark}
        {m.word}
      </span>
    </span>
  )
}
