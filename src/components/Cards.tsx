import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import type { Service } from '../content'
import { cx } from '../lib/cx'
import { Tag } from './Pill'
import { ServiceIcon } from './ServiceIcon'

export function ServiceCard({ service, className }: { service: Service; className?: string }) {
  return (
    <Link to={`/services#${service.id}`} className={cx('group relative flex flex-col gap-5 rounded-[var(--radius-lg)] bg-paper p-7 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-raise)]', className)}>
      <div className="flex items-start justify-between">
        <ServiceIcon icon={service.icon} />
        <span aria-hidden className="round grid size-10 place-items-center rounded-full bg-ink/5 transition-[background-color,color,transform] duration-[var(--duration-base)] group-hover:rotate-45 group-hover:bg-ink group-hover:text-white">
          <ArrowUpRight className="size-4.5" />
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-[1.3rem] font-semibold tracking-[-0.025em]">
          {service.title}
          {service.soon && <Tag tone="peach">Coming soon</Tag>}
        </h3>
        <p className="text-[0.975rem] leading-relaxed text-body">{service.summary}</p>
      </div>
    </Link>
  )
}
