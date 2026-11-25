import { ArrowUpRight, Quote as QuoteIcon } from 'lucide-react'
import { Link } from 'react-router'

import { IMAGES, type CaseStudy, type Service } from '../content'
import { cx } from '../lib/cx'
import { ClientLogo } from './ClientLogos'
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
        <h3 className="text-[1.3rem] font-semibold tracking-[-0.025em]">{service.title}</h3>
        <p className="text-[0.975rem] leading-relaxed text-body">{service.summary}</p>
      </div>
    </Link>
  )
}

export function CaseCard({ study, className }: { study: CaseStudy; className?: string }) {
  const img = IMAGES[study.image] as { src: string; alt: string }
  const lead = study.metrics[0]
  return (
    <Link to={`/case-studies/${study.slug}`} className={cx('group flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-raise)]', className)}>
      <div className="relative aspect-[3/2] overflow-hidden">
        <img src={img.src} alt="" loading="lazy" width={1400} height={933} className="size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
        <span className="absolute bottom-4 left-4 inline-flex flex-col rounded-[var(--radius-md)] bg-paper/95 px-4 py-2.5 shadow-[var(--shadow-card)] backdrop-blur">
          <span className="text-[1.5rem] leading-none font-semibold tracking-[-0.04em] tabular-nums">{lead.value}</span>
          <span className="text-[0.8rem] text-muted">{lead.label}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <ClientLogo name={study.client} className="origin-left scale-[0.72]" />
          <Tag>{study.platform}</Tag>
        </div>
        <h3 className="text-[1.25rem] leading-snug font-semibold tracking-[-0.025em] text-balance">{study.title}</h3>
        <p className="text-[0.95rem] leading-relaxed text-body">{study.summary}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {study.topics.map((t) => (
            <Tag key={t} tone="peach">
              {t}
            </Tag>
          ))}
        </div>
      </div>
    </Link>
  )
}

export function QuoteBlock({ text, name, role, avatar, className }: { text: string; name: string; role: string; avatar?: { src: string }; className?: string }) {
  return (
    <figure className={cx('flex flex-col gap-6', className)}>
      <QuoteIcon aria-hidden className="size-9 fill-accent text-accent" />
      <blockquote className="text-[1.5rem] leading-[1.35] font-medium tracking-[-0.025em] text-balance sm:text-[1.9rem]">“{text}”</blockquote>
      <figcaption className="flex items-center gap-3">
        {avatar && <img src={avatar.src} alt="" width={48} height={48} className="round size-12 rounded-full object-cover" />}
        <span className="flex flex-col">
          <span className="font-semibold">{name}</span>
          <span className="text-[0.9rem] text-muted">{role}</span>
        </span>
      </figcaption>
    </figure>
  )
}
