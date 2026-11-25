import { Check } from 'lucide-react'
import { useState } from 'react'

import { AppLoading, useRequireAuth } from '../components/AuthGate'
import { ArrowLink } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { Notice } from '../components/Field'
import { Eyebrow, Tag } from '../components/Pill'
import { Segmented } from '../components/Segmented'
import { usePageTitle } from '../lib/title'
import { cx } from '../lib/cx'
import { useRegion } from '../lib/region'
import { BILLINGS, CHECKOUT_AVAILABLE, FREE_PLAN, planById, PLANS, priceFor, type Billing } from '../shared/account'

export function Plans() {
  usePageTitle('Choose your plan')
  const { user, ready } = useRequireAuth({ onboarded: true })
  const { format, currency } = useRegion()
  const [billing, setBilling] = useState<Billing>(user?.billing ?? 'monthly')

  if (!ready || !user) return <AppLoading label="Loading your plans" rows={2} />

  const requested = planById(user.requestedPlanId)

  return (
    <section className="relative -mt-[84px] overflow-hidden pt-[130px] pb-24 sm:-mt-[100px] sm:pt-[160px]">
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[55%] opacity-60" />
      <Container className="relative">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <Eyebrow>Plans</Eyebrow>
          <h1 className="text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.04em] text-balance sm:text-[3.4rem]">Plans for every channel size</h1>
          <p className="text-[1.0625rem] leading-relaxed text-body">
            {CHECKOUT_AVAILABLE
              ? 'Quarterly billing saves 20%.'
              : `Paid plans open when checkout launches. Until then your account is on Free: ${FREE_PLAN.limit} clips a month, nothing to pay.`}
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

        {requested && !user.planId && (
          <Notice tone="info" className="mx-auto mt-8 max-w-xl">
            You picked {requested.name} earlier. It is not active and nothing was charged, because checkout is not available yet. You are on the Free plan.
          </Notice>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = priceFor(plan, billing)
            const current = user.planId === plan.id
            const featured = Boolean(plan.featured)
            return (
              <Card key={plan.id} tone={featured ? 'ink' : 'paper'} className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[1.4rem] font-semibold tracking-[-0.025em]">{plan.name}</h2>
                  {current ? <Tag tone="peach">Current plan</Tag> : null}
                </div>
                <div>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.045em] tabular-nums">{format(price)}</span>
                    <span className={cx('text-[0.95rem]', featured ? 'text-white/75' : 'text-muted')}>/ month</span>
                  </p>
                  <p className={cx('mt-2 text-[0.95rem] font-semibold', featured ? 'text-accent' : 'text-accent-ink')}>{plan.days}</p>
                  <p className={cx('mt-1 text-[0.8rem]', featured ? 'text-white/60' : 'text-muted')}>
                    {billing === 'quarterly' ? `${format(price * 3)} billed every 3 months` : 'Billed monthly'} · ≈ {format(price / plan.limit)} per clip
                  </p>
                </div>
                <p className={cx('text-[0.975rem] leading-relaxed', featured ? 'text-white/80' : 'text-body')}>{plan.text}</p>
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-[0.95rem]">
                      <Check aria-hidden className={cx('size-4.5', featured ? 'text-accent' : 'text-accent-ink')} strokeWidth={2.6} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  {current ? (
                    <ArrowLink to="/dashboard" tone="light" className="w-full justify-between">
                      Go to dashboard
                    </ArrowLink>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className={cx(
                        'inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border text-[0.95rem] font-semibold',
                        featured ? 'border-white/25 text-white/70' : 'border-line-strong bg-sand text-muted',
                      )}
                    >
                      Checkout coming soon
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <ArrowLink to="/dashboard">Continue on Free</ArrowLink>
          <p className="text-center text-[0.875rem] text-muted">Prices shown in {currency}. Paid plans will be charged in USD.</p>
        </div>
      </Container>
    </section>
  )
}
