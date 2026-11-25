import { Check } from 'lucide-react'
import { useState } from 'react'

import { ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { Eyebrow, Tag } from '../components/Pill'
import { Segmented } from '../components/Segmented'
import { cx } from '../lib/cx'
import { useRegion } from '../lib/region'
import { usePageTitle } from '../lib/title'
import { BILLINGS, CHECKOUT_AVAILABLE, FREE_PLAN, PLANS, priceFor, type Billing } from '../shared/account'

// Every price, limit and feature here comes from src/shared/account.ts.

const FREE_FEATURES = ['Highlight finding, captions and face tracking', '1080×1920 exports with SRT, VTT and ASS files', 'Runs on your computer, no card']

const FAQ = [
  {
    q: 'What counts as a clip?',
    a: 'One clip the detector writes to your library. Re-rendering the same clip with another caption preset or layout does not use another one.',
  },
  {
    q: 'Do I need to pay to try it?',
    a: `No. Free gives you ${FREE_PLAN.limit} clips a month and runs the full local pipeline: download, transcript, moment detection, face tracking and render. No card is required.`,
  },
  {
    q: 'When can I upgrade?',
    a: 'Paid plans open when checkout launches. Until then every account is on Free, and nothing is charged.',
  },
  {
    q: 'Which platforms can clips be posted to?',
    a: 'Download and copy-caption always work. YouTube Shorts upload works with your own Google credentials. TikTok and Instagram direct posting need an approved developer app, so the Studio opens their official upload page instead.',
  },
  {
    q: 'What content am I allowed to clip?',
    a: 'Only videos you own or have permission to clip. Clipfarm does not support reposting other creators’ footage.',
  },
]

export function Pricing() {
  usePageTitle('Pricing')
  const { format, currency } = useRegion()
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <>
      <section className="relative overflow-hidden pt-16 pb-14 sm:pt-24">
        <div aria-hidden className="page-grid absolute inset-0" />
        <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[50%] opacity-50" />
        <Container className="relative">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="text-[2.5rem] leading-[1.03] font-semibold tracking-[-0.045em] text-balance sm:text-[3.4rem]">Start free. Upgrade when the clips earn it.</h1>
            <p className="max-w-xl text-[1.02rem] leading-relaxed text-body">
              {CHECKOUT_AVAILABLE ? 'Prices in USD.' : `Every account starts on Free. Paid plans open when checkout launches; nothing is charged until then.`}
            </p>
            <Segmented<Billing>
              label="Billing period"
              value={billing}
              onChange={setBilling}
              options={[
                { value: BILLINGS[0], label: 'Monthly' },
                { value: BILLINGS[1], label: 'Quarterly, save 20%' },
              ]}
            />
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Card className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-[1.3rem] font-semibold tracking-[-0.02em]">{FREE_PLAN.name}</h2>
                <p className="text-[0.9rem] text-muted">Try the whole pipeline.</p>
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="text-[2.7rem] leading-none font-semibold tracking-[-0.05em] tabular-nums">{format(0)}</span>
                <span className="text-[0.9rem] text-muted">/ month</span>
              </p>
              <ul className="flex flex-col gap-2.5">
                {[`${FREE_PLAN.limit} clips a month`, ...FREE_FEATURES].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[0.9rem]">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={2.8} />
                    {feature}
                  </li>
                ))}
              </ul>
              <ButtonLink to="/signup" className="mt-auto w-full">
                Start free
              </ButtonLink>
            </Card>

            {PLANS.map((plan) => {
              const price = priceFor(plan, billing)
              return (
                <Card key={plan.id} tone={plan.featured ? 'ink' : 'paper'} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-[1.3rem] font-semibold tracking-[-0.02em]">{plan.name}</h2>
                      {!CHECKOUT_AVAILABLE && <Tag tone="peach">Coming soon</Tag>}
                    </div>
                    <p className={cx('text-[0.9rem]', plan.featured ? 'text-white/70' : 'text-muted')}>{plan.text}</p>
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[2.7rem] leading-none font-semibold tracking-[-0.05em] tabular-nums">{format(price)}</span>
                      <span className={cx('text-[0.9rem]', plan.featured ? 'text-white/60' : 'text-muted')}>/ month</span>
                    </p>
                    <p className={cx('mt-2 text-[0.78rem]', plan.featured ? 'text-white/55' : 'text-muted')}>
                      {billing === 'quarterly' ? `${format(price * 3)} billed every 3 months` : 'Billed monthly'}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[0.9rem]">
                        <Check aria-hidden className={cx('mt-0.5 size-4 shrink-0', plan.featured ? 'text-accent' : 'text-accent-ink')} strokeWidth={2.8} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled
                    className={cx(
                      'mt-auto inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border text-[0.95rem] font-semibold',
                      plan.featured ? 'border-white/25 text-white/70' : 'border-line-strong bg-sand text-muted',
                    )}
                  >
                    Checkout coming soon
                  </button>
                </Card>
              )
            })}
          </div>
          <p className="mt-8 text-center text-[0.82rem] text-muted">
            Limits reset on the 1st of each month. Prices shown in {currency}; paid plans will be charged in USD.
          </p>
        </Container>
      </section>

      <section className="py-14">
        <Container className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="flex flex-col gap-3">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.035em]">Limits, billing and rights</h2>
          </div>
          <div className="flex flex-col divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[0.98rem] font-semibold">
                  {item.q}
                  <span aria-hidden className="text-[1.2rem] leading-none text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-body">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand title={`${FREE_PLAN.limit} clips free. No card.`} text="Run the full pipeline on a short video and download the MP4 before you decide anything." button="Start free" />
    </>
  )
}
