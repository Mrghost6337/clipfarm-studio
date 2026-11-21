import type { ReactNode } from 'react'

import { CLIENTS } from '../content'
import { cx } from '../lib/cx'

type Client = (typeof CLIENTS)[number]

// Invented client marks, drawn in SVG and type. Replace with your clients' logos (with permission).
const MARKS: Record<Client, { mark: ReactNode; word: ReactNode }> = {
  Halden: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <rect x="3" y="3" width="26" height="26" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M11 9v14M21 9v14M11 16h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    word: <span className="text-[1.6rem] font-normal tracking-[-0.04em]">halden</span>,
  },
  Northloop: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M16 3a13 13 0 1 0 13 13" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M22 4l7 0 0 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    word: <span className="text-[1.6rem] font-bold tracking-[-0.05em]">NORTHLOOP</span>,
  },
  Kestrel: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M2 20 16 6l6 6 8-4-6 14H12Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="text-[1.65rem] font-extrabold italic tracking-[-0.04em]">kestrel</span>,
  },
  Brightwater: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <circle cx="16" cy="11" r="7" fill="currentColor" />
        <path d="M3 22c4-3 7-3 10 0s7 3 10 0 5-3 6-2M3 28c4-3 7-3 10 0s7 3 10 0 5-3 6-2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    ),
    word: <span className="text-[1.3rem] font-semibold tracking-[0.02em]">BRIGHTWATER</span>,
  },
  Oakfield: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M16 2c6 0 10 4 10 9 0 4-3 6-6 7v12h-8V18c-3-1-6-3-6-7 0-5 4-9 10-9Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="font-[Georgia,serif] text-[1.65rem] font-semibold italic tracking-[-0.02em]">Oakfield</span>,
  },
  Tidecraft: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M4 10h24M4 16h18M4 22h12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    word: (
      <span className="text-[1.55rem] tracking-[-0.03em]">
        Tide<b className="font-extrabold">CRAFT</b>
      </span>
    ),
  },
  'Lumen&Co': {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M16 2l3.5 10.5L30 16l-10.5 3.5L16 30l-3.5-10.5L2 16l10.5-3.5Z" fill="currentColor" />
      </svg>
    ),
    word: <span className="text-[1.6rem] font-medium tracking-[-0.03em]">lumen&amp;co</span>,
  },
  Fernway: {
    mark: (
      <svg viewBox="0 0 32 32" className="size-8">
        <path d="M6 28C6 14 14 5 28 4 27 18 18 26 6 28Zm0 0 14-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
    word: <span className="text-[1.6rem] font-black tracking-[-0.06em]">fernway</span>,
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
