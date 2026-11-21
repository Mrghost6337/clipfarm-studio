import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Button, ButtonLink } from '../components/Button'
import { CaseCard, QuoteBlock } from '../components/Cards'
import { Stat } from '../components/Card'
import { CheckList } from '../components/CheckItem'
import { ClientLogo } from '../components/ClientLogos'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { controlBase } from '../components/Field'
import { PageHero } from '../components/PageHero'
import { Chip, Tag } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { CASES, CASES_PAGE, HOME, IMAGES } from '../content'
import { cx } from '../lib/cx'
import { usePageTitle } from '../lib/title'
import { NotFound } from './NotFound'

const TOPICS = Array.from(new Set(CASES.flatMap((c) => c.topics))).sort()
const STAGES = ['Seed', 'Series A', 'Series B'] as const

export function CaseStudies() {
  usePageTitle('Case studies')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const topic = params.get('topic') ?? ''
  const stage = params.get('stage') ?? ''
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return CASES.filter((c) => (!topic || c.topics.includes(topic)) && (!stage || c.stage === stage) && (!needle || [c.client, c.title, c.summary, c.sector, ...c.topics].join(' ').toLowerCase().includes(needle)))
  }, [q, topic, stage])

  return (
    <>
      <PageHero eyebrow={CASES_PAGE.eyebrow} title={CASES_PAGE.title} text={CASES_PAGE.text} />
      <section className="pb-20">
        <Container>
          <div className="flex flex-col gap-5 rounded-[var(--radius-xl)] bg-paper p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="relative">
              <label htmlFor="case-search" className="sr-only">
                {CASES_PAGE.searchLabel}
              </label>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
              <input id="case-search" type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder={CASES_PAGE.searchPlaceholder} className={cx(controlBase, 'h-12 border-line-strong pl-12')} />
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
                <Chip selected={!topic} onClick={() => set('topic', '')}>
                  {CASES_PAGE.all}
                </Chip>
                {TOPICS.map((t) => (
                  <Chip key={t} selected={topic === t} onClick={() => set('topic', topic === t ? '' : t)}>
                    {t}
                  </Chip>
                ))}
              </div>
              <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <Chip key={s} selected={stage === s} onClick={() => set('stage', stage === s ? '' : s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 text-[0.9rem] text-muted" aria-live="polite">
            {results.length} {results.length === 1 ? 'case study' : 'case studies'}
          </p>
          {results.length ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((c) => (
                <CaseCard key={c.slug} study={c} className="h-full" />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-line-strong px-6 py-16 text-center">
              <p className="text-[1.125rem] font-semibold">{CASES_PAGE.empty}</p>
              <Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })} icon={<X aria-hidden className="size-4" />}>
                {CASES_PAGE.clear}
              </Button>
            </div>
          )}
        </Container>
      </section>
    </>
  )
}

export function CaseStudyPage() {
  const { slug } = useParams()
  const index = CASES.findIndex((c) => c.slug === slug)
  const study = CASES[index]
  usePageTitle(study ? `${study.client} case study` : 'Page not found')
  if (!study) return <NotFound />
  const next = CASES[(index + 1) % CASES.length]
  const img = IMAGES[study.image] as { src: string; alt: string }
  return (
    <>
      <section className="pt-10 pb-12 sm:pt-14">
        <Container>
          <Link to="/case-studies" className="inline-flex min-h-10 items-center gap-2 text-[0.95rem] font-semibold text-ink-2 hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" /> {CASES_PAGE.back}
          </Link>
          <div className="mt-6 grid items-end gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div className="flex flex-col gap-6">
              <ClientLogo name={study.client} />
              <h1 className="text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[3.4rem]">{study.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Tag tone="ink">{study.stage}</Tag>
                <Tag>{study.sector}</Tag>
                <Tag>{study.headcount} people</Tag>
                {study.topics.map((t) => (
                  <Tag key={t} tone="peach">
                    {t}
                  </Tag>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-card)]">
              {study.metrics.map((m) => (
                <Stat key={m.label} value={m.value} label={m.label} className="[&>span:first-child]:text-[1.75rem] sm:[&>span:first-child]:text-[2.25rem]" />
              ))}
            </div>
          </div>
        </Container>
      </section>
      <Container>
        <img src={img.src} alt={img.alt} width={1400} height={933} className="aspect-[21/9] w-full rounded-[var(--radius-xl)] object-cover" />
      </Container>
      <section className="py-16">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-3">
            <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em]">{CASES_PAGE.challenge}</h2>
            <p className="text-[1.0625rem] leading-relaxed text-body">{study.challenge}</p>
          </div>
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em]">{CASES_PAGE.approach}</h2>
              <CheckList items={study.approach} />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em]">{CASES_PAGE.result}</h2>
              <p className="text-[1.0625rem] leading-relaxed text-body">{study.result}</p>
            </div>
          </div>
        </Container>
      </section>
      <Container>
        <Reveal>
          <div className="rounded-[var(--radius-xl)] bg-peach/70 p-8 sm:p-14">
            <QuoteBlock {...study.quote} />
          </div>
        </Reveal>
        <div className="mt-10 flex justify-end">
          <ButtonLink to={`/case-studies/${next.slug}`} variant="secondary">
            {CASES_PAGE.next}: {next.client} <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </Container>
      <CtaBand title={HOME.cta.title} text={HOME.cta.text} button={HOME.cta.button} />
    </>
  )
}
