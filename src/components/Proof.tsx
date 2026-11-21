import { Heart, Star } from 'lucide-react'

import { IMAGES } from '../content'
import { cx } from '../lib/cx'

export function AvatarStack({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('flex', className)}>
      {IMAGES.avatars.map((a, i) => (
        <img key={a.src} src={a.src} alt="" width={44} height={44} className={cx('round rounded-full object-cover ring-[2.5px] ring-page', size === 'md' ? 'size-11' : 'size-8', i > 0 && (size === 'md' ? '-ml-3' : '-ml-2'))} />
      ))}
    </span>
  )
}

export function Stars({ rating = 5, className }: { rating?: number; className?: string }) {
  return (
    <span className={cx('flex gap-0.5 text-star', className)} role="img" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={cx('size-5', i < Math.round(rating) ? 'fill-current' : 'fill-none opacity-40')} strokeWidth={1.2} />
      ))}
    </span>
  )
}

export function SocialProof({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <AvatarStack />
      <div className="flex flex-col gap-0.5 text-left">
        <Stars />
        <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-ink-2">
          {label} <Heart aria-hidden className="size-3 fill-current" />
        </span>
      </div>
    </div>
  )
}
