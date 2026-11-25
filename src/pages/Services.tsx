import { Check } from 'lucide-react'
import { useState } from 'react'

import { ArrowLink } from '../components/Button'
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
import { ENGAGEMENTS, HOME, SERVICES, SERVICES_PAGE, SITE } from '../content'
import { cx } from '../lib/cx'
import { priceFor } from '../shared/account'
import { useRegion } from '../lib/region'
import { readJson, writeJson } from '../lib/storage'
import { usePageTitle } from '../lib/title'

type Billing = 'monthly' | 'quarterly'
const BILLING_KEY = `${SITE.storagePrefix}.billing`

export function Services() {
  usePageTitle('Services')
  const { format } = useRegion()
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
                    <h2 className="flex flex-wrap items-center gap-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">
                      {s.title}
                      {s.soon && <Tag tone="peach">Coming soon</Tag>}
                    </h2>
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
                { value: 'quarterly', label: 'Quarterly, save 20%' },
              ]}
            />
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {ENGAGEMENTS.plans.map((p) => {
              const price = priceFor(p, billing)
              return (
                <Card key={p.id} tone={p.featured ? 'ink' : 'paper'} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[1.4rem] font-semibold tracking-[-0.025em]">{p.name}</h3>
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.045em] tabular-nums">{format(price)}</span>
                      <span className={cx('text-[0.95rem]', p.featured ? 'text-white/75' : 'text-muted')}>/ month</span>
                    </p>
                    <p className={cx('mt-2 text-[0.95rem] font-semibold', p.featured ? 'text-accent' : 'text-accent-ink')}>{p.days}</p>
                    <p className={cx('mt-1 text-[0.8rem]', p.featured ? 'text-white/60' : 'text-muted')}>
                      {billing === 'quarterly' ? `${format(price * 3)} billed every 3 months` : 'Billed monthly'} · ≈ {format(price / p.limit)} per clip
                    </p>
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
                    <button
                      type="button"
                      disabled
                      className={cx(
                        'inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border text-[0.95rem] font-semibold',
                        p.featured ? 'border-white/25 text-white/70' : 'border-line-strong bg-sand text-muted',
                      )}
                    >
                      Checkout coming soon
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <ArrowLink to="/signup">Start on Free</ArrowLink>
            <p className="text-center text-[0.875rem] text-muted">{ENGAGEMENTS.note}</p>
          </div>
        </Container>
      </section>

      <CtaBand title={HOME.cta.title} text={HOME.cta.text} button={HOME.cta.button} />
    </>
  )
}
