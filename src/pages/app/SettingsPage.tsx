import { ArrowUpRight, Cookie, Globe2, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { AppLoading, useRequireAuth } from '../../components/AuthGate'
import { Button, ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { CONSENT_KEY, getConsent, openCookieSettings, type ConsentRecord } from '../../components/CookieConsent'
import { SelectField } from '../../components/Field'
import { Tag } from '../../components/Pill'
import { useRegion } from '../../lib/region'
import { removeKey } from '../../lib/storage'
import { usePageTitle } from '../../lib/title'
import { planById, priceFor } from '../../shared/account'
import { COUNTRIES, CURRENCIES, LANGUAGES, RATES_NOTE, type CurrencyCode } from '../../shared/region'

export function SettingsPage() {
  usePageTitle('Settings')
  const { user, ready, signOut } = useRequireAuth({ onboarded: true, plan: true })
  const navigate = useNavigate()
  const { country, currency, language, detected, setCountry, setCurrency, setLanguage, useDetected, format, formatDate } = useRegion()
  const [consent, setConsent] = useState<ConsentRecord | null>(() => getConsent())

  useEffect(() => {
    const sync = () => setConsent(getConsent())
    window.addEventListener('clipfarm:consent', sync)
    return () => window.removeEventListener('clipfarm:consent', sync)
  }, [])

  if (!ready || !user) return <AppLoading label="Loading settings" rows={3} />

  const plan = planById(user.planId)
  const billing = user.billing ?? 'monthly'
  const price = plan ? priceFor(plan, billing) : 0
  const renewsAt = user.planStartedAt ? new Date(new Date(user.planStartedAt).getTime() + 30 * 24 * 3600 * 1000).toISOString() : null

  async function leave() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Settings</p>
        <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">Workspace settings</h1>
        <p className="text-[0.95rem] text-body">Your channel, region, plan and privacy choices — everything the studio works from.</p>
      </header>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
              <Globe2 className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Region, language & currency</h2>
              <p className="text-[0.85rem] text-muted">Detected from this browser: {detected.name}. Prices, dates and numbers follow your choice.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={useDetected}>
            Use detected
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Country"
            options={COUNTRIES.map((entry) => entry.name)}
            value={country.name}
            onChange={(event) => setCountry(COUNTRIES.find((entry) => entry.name === event.target.value)?.code ?? country.code)}
            hint={`Detected: ${detected.name}`}
          />
          <SelectField
            label="Language"
            options={LANGUAGES.map((entry) => entry.label)}
            value={LANGUAGES.find((entry) => entry.code === language)?.label ?? 'English'}
            onChange={(event) => setLanguage(LANGUAGES.find((entry) => entry.label === event.target.value)?.code ?? 'en')}
            hint="Formats prices, dates and numbers."
          />
          <SelectField
            label="Currency"
            options={CURRENCIES.map((entry) => entry.name)}
            value={CURRENCIES.find((entry) => entry.code === currency)?.name ?? 'US Dollar'}
            onChange={(event) => setCurrency((CURRENCIES.find((entry) => entry.name === event.target.value)?.code ?? 'USD') as CurrencyCode)}
            hint="Shown on every price."
          />
        </div>
        <p className="text-[0.78rem] leading-relaxed text-muted">
          {RATES_NOTE} Example: Creator is {format(49)} per month in your currency.
        </p>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Channel setup</h2>
            <p className="text-[0.85rem] text-muted">Used by the detector to weight clip focus and caption style.</p>
          </div>
          <ButtonLink to="/onboarding" variant="secondary" size="sm" icon={<ArrowUpRight aria-hidden className="size-4" />}>
            Edit setup
          </ButtonLink>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Channel', user.channel ?? 'Not set'],
            ['Platform', user.platform ?? 'Not set'],
            ['Audience', user.audience ?? 'Not set'],
            ['Posting cadence', user.cadence ?? 'Not set'],
            ['Caption style', user.captionStyle ?? 'Not set'],
            ['Clip focus', user.clipAreas.length ? user.clipAreas.join(', ') : 'Not set'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--radius-md)] bg-sand p-3.5">
              <dt className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">{label}</dt>
              <dd className="mt-1 text-[0.92rem] font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Plan & billing</h2>
            <p className="text-[0.85rem] text-muted">{plan ? `${plan.limit} clips a month, billed ${billing}.` : 'No plan selected.'}</p>
          </div>
          {plan && <Tag tone="peach">{plan.name}</Tag>}
        </div>
        {plan ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
              <p className="text-[0.72rem] font-semibold text-muted uppercase">Monthly price</p>
              <p className="mt-1 text-[1.15rem] font-semibold tabular-nums">{format(price)}</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
              <p className="text-[0.72rem] font-semibold text-muted uppercase">Billed</p>
              <p className="mt-1 text-[1.15rem] font-semibold">{billing === 'quarterly' ? `${format(price * 3)} / 3 months` : 'Monthly'}</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
              <p className="text-[0.72rem] font-semibold text-muted uppercase">Clip limit</p>
              <p className="mt-1 text-[1.15rem] font-semibold tabular-nums">{plan.limit}</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
              <p className="text-[0.72rem] font-semibold text-muted uppercase">Renews</p>
              <p className="mt-1 text-[1.15rem] font-semibold">{renewsAt ? formatDate(renewsAt) : '—'}</p>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink to="/plans" variant="secondary">
            {plan ? 'Change plan' : 'Choose a plan'}
          </ButtonLink>
          {billing === 'quarterly' && plan ? (
            <p className="text-[0.82rem] font-medium text-success">Quarterly billing saves {format(plan.price - price)} a month.</p>
          ) : (
            <p className="text-[0.82rem] text-muted">Switch to quarterly and save 20%.</p>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
              <Cookie className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Privacy & cookies</h2>
              <p className="text-[0.85rem] text-muted">
                {consent
                  ? consent.choice === 'all'
                    ? `All cookies accepted on ${formatDate(consent.at)}.`
                    : `Essential cookies only, chosen on ${formatDate(consent.at)}.`
                  : 'No choice saved yet — the banner will ask on your next visit.'}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              removeKey(CONSENT_KEY)
              setConsent(null)
              openCookieSettings()
            }}
          >
            Change cookie settings
          </Button>
        </div>
        <p className="text-[0.8rem] leading-relaxed text-muted">
          One essential cookie keeps you signed in. Country, currency and popup choices are stored in this browser only. No ad trackers and no third-party analytics are loaded.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Account</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
            <dt className="text-[0.72rem] font-semibold text-muted uppercase">Name</dt>
            <dd className="mt-1 text-[0.92rem] font-semibold">{user.name}</dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
            <dt className="text-[0.72rem] font-semibold text-muted uppercase">Email</dt>
            <dd className="mt-1 truncate text-[0.92rem] font-semibold">{user.email}</dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
            <dt className="text-[0.72rem] font-semibold text-muted uppercase">Member since</dt>
            <dd className="mt-1 text-[0.92rem] font-semibold">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-sand p-3.5">
            <dt className="text-[0.72rem] font-semibold text-muted uppercase">Role</dt>
            <dd className="mt-1 text-[0.92rem] font-semibold">{user.role === 'admin' ? 'Admin' : 'Member'}</dd>
          </div>
        </dl>
        <div>
          <Button variant="secondary" icon={<LogOut aria-hidden className="size-4" />} onClick={leave}>
            Log out
          </Button>
        </div>
      </Card>
    </div>
  )
}
