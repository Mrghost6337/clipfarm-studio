import { AudioWaveform, Captions, ScanFace, Scissors, Smartphone, Wallet } from 'lucide-react'

import type { Service } from '../content'
import { cx } from '../lib/cx'

const ICONS = { scissors: Scissors, scanface: ScanFace, captions: Captions, audio: AudioWaveform, phone: Smartphone, wallet: Wallet }

export function ServiceIcon({ icon, className }: { icon: Service['icon']; className?: string }) {
  const Icon = ICONS[icon]
  return (
    <span aria-hidden className={cx('grid size-12 shrink-0 place-items-center rounded-[14px] bg-peach text-accent-ink', className)}>
      <Icon className="size-6" strokeWidth={1.9} />
    </span>
  )
}
