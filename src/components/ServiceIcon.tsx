import { Compass, GraduationCap, Scale, ShieldCheck, Sparkles, Users } from 'lucide-react'

import type { Service } from '../content'
import { cx } from '../lib/cx'

const ICONS = { compass: Compass, users: Users, scale: Scale, shield: ShieldCheck, sparkles: Sparkles, graduation: GraduationCap }

export function ServiceIcon({ icon, className }: { icon: Service['icon']; className?: string }) {
  const Icon = ICONS[icon]
  return (
    <span aria-hidden className={cx('grid size-12 shrink-0 place-items-center rounded-[14px] bg-peach text-accent-ink', className)}>
      <Icon className="size-6" strokeWidth={1.9} />
    </span>
  )
}
