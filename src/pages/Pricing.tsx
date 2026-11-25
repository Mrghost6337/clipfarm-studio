import { Check, Minus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { Eyebrow } from '../components/Pill'
import { usePageTitle } from '../lib/title'
import { cx } from '../lib/cx'

type Tier = {
  id: string
  name: string
  monthly: number
  yearly: number
  tagline: string
  clips: string
  video: string
  cta: string
  to: string
  featured?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    yearly: 0,
    tagline: 'Try the whole pipeline on a short video.',
    clips: '3 clips / month',
    video: 'Videos up to 15 min',
    cta: 'Start free',
    to: '/signup',
    features: ['1080×1920 exports', 'Word-synced captions', '3 caption presets', 'Download MP4 + SRT/VTT', 'No card required'],
  },
  {
    id: 'creator',
    name: 'Creator',
    monthly: 49,
    yearly: 39,
    tagline: 'For a channel posting every day.',
    clips: '60 clips / month',
    video: 'Videos up to 90 min',
    cta: 'Choose Creator',
    to: '/signup',
    featured: true,
    features: ['Everything in Free', 'Face tracking + auto layouts', 'Custom caption style', 'YouTube Shorts upload', 'Priority render queue', 'Email support'],
  },
  {
    id: 'network',
    name: 'Network',
    monthly: 129,
    yearly: 103,
    tagline: 'For teams clipping a whole roster.',
    clips: '200 clips / month',
    video: 'Videos up to 4 hours',
    cta: 'Choose Network',
    to: '/signup',
    features: ['Everything in Creator', '5 team seats', 'Channel library + bulk clip', 'Per-platform publish status', 'Shared caption presets', 'Priority support'],
  },
]

const COMPARE: Array<{ label: string; values: Array<string | boolean> }> = [
  { label: 'Clips per month', values: ['3', '60', '200'] },
  { label: 'Longest source video', values: ['15 min', '90 min', '4 hours'] },
  { label: '1080×1920 export', values: [true, true, true] },
  { label: 'Word-synced captions', values: [true, true, true] },
  { label: 'Face tracking + layouts', values: [false, true, true] },
  { label: 'Custom caption style', values: [false, true, true] },
  { label: 'YouTube Shorts upload', values: [false, true, true] },
  { label: 'Channel library + bulk clip', values: [false, false, true] },
  { label: 'Team seats', values: ['1', '1', '5'] },
  { label: 'Support', values: ['Community', 'Email', 'Priority'] },
]

const FAQ = [
  {
    q: 'What counts as a clip?',
    a: 'One finished vertical video. Re-rendering the same moment with another caption preset does not use another clip; starting a new analysis does.',
  },
  {
    q: 'Why is there a maximum video length?',
    a: 'Transcription cost grows with length. Free covers 15 minutes, Creator 90 minutes and Network 4 hours. Longer VODs can be trimmed before upload, or split and analyzed in parts.',
  },
  {
    q: 'Do I need to pay to try it?',
    a: 'No. Free runs the full pipeline — download, transcript, moment detection, face tracking, render and download — on up to three clips a month. No card is required.',
  },
  {
    q: 'Can I cancel or change plans?',
    a: 'Yes. Change plan or cancel from Billing at any time. Monthly plans stop at the end of the current month; yearly plans are billed 12 months at the discounted rate.',
  },
  {
    q: 'Which platforms can clips be posted to?',
    a: 'Download and copy-caption always work. YouTube Shorts upload works with your own OAuth credentials. TikTok and Instagram direct posting need an approved developer app, so the Studio opens their official upload page instead.',
  },
  {
    q: 'What content am I allowed to clip?',
    a: 'Only videos you own or have permission to clip. Clipfarm does not support reposting other creators’ footage, and every workspace shows the rights notice before a job starts.',
  },
]

export function Pricing() {
  usePageTitle('Pricing')
  const [yearly, setYearly] = useState(false)

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
              One pipeline, three honest limits. No setup fee, no annual contract, no per-seat surprises. Prices in USD; taxes calculated at checkout.
            </p>
            <div className="mt-2 inline-flex items-center rounded-full border border-line-strong bg-paper p-1" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} className={cx('h-9 rounded-full px-4 text-[0.85rem] font-semibold transition', !yearly ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')}>
                Monthly
              </button>
              <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} className={cx('h-9 rounded-full px-4 text-[0.85rem] font-semibold transition', yearly ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')}>
                Yearly <span className={cx('ml-1 text-[0.72rem]', yearly ? 'text-accent' : 'text-accent-ink')}>−20%</span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {TIERS.map((tier) => {
              const price = yearly ? tier.yearly : tier.monthly
              return (
                <Card key={tier.id} tone={tier.featured ? 'ink' : 'paper'} className={cx('relative flex flex-col gap-6', tier.featured && 'lg:-mt-3 lg:mb-3')}>
                  {tier.featured && <span className="absolute -top-3 left-7 inline-flex h-7 items-center rounded-full bg-accent px-3 text-[0.7rem] font-bold tracking-[0.08em] text-ink uppercase">Most popular</span>}
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[1.3rem] font-semibold tracking-[-0.02em]">{tier.name}</h2>
                    <p className={cx('text-[0.9rem]', tier.featured ? 'text-white/70' : 'text-muted')}>{tier.tagline}</p>
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[2.7rem] leading-none font-semibold tracking-[-0.05em] tabular-nums">${price}</span>
                      <span className={cx('text-[0.9rem]', tier.featured ? 'text-white/60' : 'text-muted')}>/ month</span>
                    </p>
                    <p className={cx('mt-2 text-[0.78rem]', tier.featured ? 'text-white/55' : 'text-muted')}>
                      {tier.monthly === 0 ? 'Free forever' : yearly ? `$${price * 12} billed yearly` : 'Billed monthly, cancel anytime'}
                    </p>
                  </div>
                  <div className={cx('grid grid-cols-2 gap-3 rounded-[var(--radius-md)] p-3 text-[0.8rem]', tier.featured ? 'bg-white/10' : 'bg-sand')}>
                    <span className="flex flex-col gap-0.5">
                      <b className="font-semibold">{tier.clips}</b>
                      <span className={tier.featured ? 'text-white/60' : 'text-muted'}>AI-selected</span>
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <b className="font-semibold">{tier.video}</b>
                      <span className={tier.featured ? 'text-white/60' : 'text-muted'}>source limit</span>
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[0.9rem]">
                        <Check aria-hidden className={cx('mt-0.5 size-4 shrink-0', tier.featured ? 'text-accent' : 'text-accent-ink')} strokeWidth={2.8} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink to={tier.to} variant={tier.featured ? 'light' : tier.id === 'free' ? 'primary' : 'secondary'} className="mt-auto w-full">
                    {tier.cta}
                  </ButtonLink>
                </Card>
              )
            })}
          </div>
          <p className="mt-8 text-center text-[0.82rem] text-muted">
            Limits are per workspace and reset monthly. A clip only counts when an export finishes. Need more? <Link to="/contact" className="font-semibold text-ink underline decoration-accent underline-offset-4">Talk to us</Link>.
          </p>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="mb-7 flex flex-col gap-2">
            <Eyebrow>Compare</Eyebrow>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.035em]">What is in each plan</h2>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-paper">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-4 text-[0.8rem] font-semibold text-muted">Feature</th>
                  {TIERS.map((tier) => (
                    <th key={tier.id} scope="col" className="p-4 text-[0.9rem] font-semibold">{tier.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-0">
                    <th scope="row" className="p-4 text-[0.85rem] font-medium text-ink-2">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${index}`} className="p-4 text-[0.85rem]">
                        {typeof value === 'boolean' ? (
                          value ? <Check aria-label="Included" className="size-4 text-success" strokeWidth={2.8} /> : <Minus aria-label="Not included" className="size-4 text-muted" />
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="flex flex-col gap-3">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.035em]">Limits, billing and rights</h2>
            <p className="text-[0.92rem] leading-relaxed text-body">Still unsure which plan fits? Tell us your channel size and cadence and we will recommend one — including “stay on Free”.</p>
            <Link to="/contact" className="text-[0.88rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">Ask a question</Link>
          </div>
          <div className="flex flex-col divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.98rem] font-semibold">
                  {item.q}
                  <span aria-hidden className="text-[1.2rem] leading-none text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-body">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand title="Three clips free. No card." text="Run the full pipeline on a short video and download the MP4 before you decide anything." button="Start free" />
    </>
  )
}
