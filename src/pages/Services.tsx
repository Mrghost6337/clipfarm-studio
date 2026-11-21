import { Check, Minus } from 'lucide-react'
import { useState } from 'react'

import { ArrowLink, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { CheckList } from '../components/CheckItem'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { PageHero } from '../components/PageHero'
import { Tag } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Segmented } from '../components/Segmented'
import { SectionHeading } from '../components/SectionHeading'
import { ServiceIcon } from '../components/ServiceIcon'
import { ENGAGEMENTS, HOME, SERVICES, SERVICES_PAGE } from '../content'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/format'
import { readJson, writeJson } from '../lib/storage'
import { usePageTitle } from '../lib/title'

type Billing = 'monthly' | 'quarterly'
const BILLING_KEY = 'pfp.billing'

export function Services() {
  usePageTitle('Services')
  const [billing, setBilling] = useState<Billing>(() => readJson<Billing>(BILLING_KEY, 'monthly'))
  const choose = (b: Billing) => {
    setBilling(b)
    writeJson(BILLING_KEY, b)
  }
  return (
    <>
      <PageHero eyebrow={SERVICES_PAGE.eyebrow} title={SERVICES_PAGE.title} text={SERVICES_PAGE.text}>
        <nav aria-label="Services on this page" className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {SERVICES.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex h-10 items-center rounded-full border border-line-strong bg-paper/80 px-4 text-[0.875rem] font-medium text-ink-2 transition-colors hover:border-ink">
              {s.title}
            </a>
          ))}
        </nav>
      </PageHero>

      <section className="py-16">
        <Container className="flex flex-col gap-5">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id}>
              <article id={s.id} className="scroll-mt-32 rounded-[var(--radius-xl)] bg-paper p-7 shadow-[var(--shadow-card)] sm:p-10">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr_1fr]">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <ServiceIcon icon={s.icon} />
                      <span className="text-[0.875rem] font-semibold text-muted">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h2 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">{s.title}</h2>
                    <p className="text-[1rem] leading-relaxed text-body">{s.summary}</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-[0.95rem] font-semibold">What changes</h3>
                    <CheckList items={s.outcomes} />
                  </div>
                  <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-sand p-6">
                    <h3 className="text-[0.95rem] font-semibold">What you get</h3>
                    <ul className="flex flex-col gap-2.5">
                      {s.deliverables.map((d) => (
                        <li key={d} className="flex items-center gap-2.5 text-[0.95rem] text-ink-2">
                          <span aria-hidden className="round size-1.5 rounded-full bg-accent" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </Container>
      </section>

      <section id="plans" className="scroll-mt-28 py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="Pricing" title={ENGAGEMENTS.title} text={ENGAGEMENTS.text} align="center" />
          <div className="mt-8 flex justify-center">
            <Segmented
              label="Billing period"
              value={billing}
              onChange={choose}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly, save 10%' },
              ]}
            />
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {ENGAGEMENTS.plans.map((p) => {
              const price = billing === 'monthly' ? p.monthly : Math.round(p.monthly * 0.9)
              return (
                <Card key={p.id} tone={p.featured ? 'ink' : 'paper'} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[1.4rem] font-semibold tracking-[-0.025em]">{p.name}</h3>
                    {p.featured && <Tag tone="peach">Most chosen</Tag>}
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.045em] tabular-nums">{formatMoney(price)}</span>
                      <span className={cx('text-[0.95rem]', p.featured ? 'text-white/75' : 'text-muted')}>/ month</span>
                    </p>
                    <p className={cx('mt-2 text-[0.95rem] font-semibold', p.featured ? 'text-accent' : 'text-accent-ink')}>{p.days}</p>
                  </div>
                  <p className={cx('text-[0.975rem] leading-relaxed', p.featured ? 'text-white/80' : 'text-body')}>{p.text}</p>
                  <ul className="flex flex-col gap-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[0.95rem]">
                        <Check aria-hidden className={cx('size-4.5', p.featured ? 'text-accent' : 'text-accent-ink')} strokeWidth={2.6} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2">
                    {p.featured ? (
                      <ArrowLink to={`/audit?plan=${p.id}`} tone="light" className="w-full justify-between">
                        Start with a free audit
                      </ArrowLink>
                    ) : (
                      <ButtonLink to={`/audit?plan=${p.id}`} variant="secondary" className="w-full">
                        Start with a free audit
                      </ButtonLink>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
          <p className="mt-6 text-center text-[0.875rem] text-muted">{ENGAGEMENTS.note}</p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading eyebrow="Compare" title={SERVICES_PAGE.compareTitle} />
          <div role="region" aria-label="Comparison table" tabIndex={0} className="mt-10 overflow-x-auto rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[640px] text-left text-[0.95rem]">
              <caption className="sr-only">Fractional Head of People compared with an HR agency and a full-time hire</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-5 font-semibold text-muted">
                    <span className="sr-only">Criterion</span>
                  </th>
                  <th scope="col" className="bg-peach/60 p-5 font-semibold">
                    Peoplefirst
                  </th>
                  <th scope="col" className="p-5 font-semibold">
                    HR agency
                  </th>
                  <th scope="col" className="p-5 font-semibold">
                    Full-time hire
                  </th>
                </tr>
              </thead>
              <tbody>
                {SERVICES_PAGE.compare.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-0">
                    <th scope="row" className="p-5 font-semibold">
                      {row.label}
                    </th>
                    <td className="bg-peach/60 p-5 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Check aria-hidden className="size-4 text-accent-ink" strokeWidth={3} />
                        {row.fractional}
                      </span>
                    </td>
                    <td className="p-5 text-body">
                      <span className="inline-flex items-center gap-2">
                        <Minus aria-hidden className="size-4 text-muted" />
                        {row.agency}
                      </span>
                    </td>
                    <td className="p-5 text-body">{row.hire}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <CtaBand title={HOME.cta.title} text={HOME.cta.text} button={HOME.cta.button} />
    </>
  )
}
