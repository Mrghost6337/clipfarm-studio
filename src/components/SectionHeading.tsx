import type { ReactNode } from 'react'

import { cx } from '../lib/cx'
import { Eyebrow } from './Pill'

export function SectionHeading({ eyebrow, title, text, align = 'left', action, className, as: Tag = 'h2' }: { eyebrow?: string; title: ReactNode; text?: ReactNode; align?: 'left' | 'center'; action?: ReactNode; className?: string; as?: 'h1' | 'h2' }) {
  return (
    <div className={cx('flex flex-col gap-5', align === 'center' ? 'items-center text-center' : 'items-start', !!action && align === 'left' && 'md:flex-row md:items-end md:justify-between', className)}>
      <div className={cx('flex max-w-[720px] flex-col gap-4', align === 'center' && 'items-center')}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Tag className={cx('font-semibold tracking-[-0.04em] text-balance text-ink', Tag === 'h1' ? 'text-[2.6rem] leading-[1.02] sm:text-[3.6rem] lg:text-[4.25rem]' : 'text-[2.1rem] leading-[1.06] sm:text-[2.9rem]')}>{title}</Tag>
        {text && <p className="max-w-[600px] text-[1.0625rem] leading-[1.6] text-pretty text-body">{text}</p>}
      </div>
      {action}
    </div>
  )
}
