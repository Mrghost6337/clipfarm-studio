import { CalendarPlus, Clock, RefreshCw, Video } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'

import { ArrowButton, Button } from '../components/Button'
import { CheckList } from '../components/CheckItem'
import { Container } from '../components/Container'
import { Notice, SelectField, TextArea, TextField } from '../components/Field'
import { Modal } from '../components/Overlay'
import { Chip, Eyebrow } from '../components/Pill'
import { SocialProof } from '../components/Proof'
import { Stepper } from '../components/Stepper'
import { useToast } from '../components/Toast'
import { AUDIT, ENGAGEMENTS, IMAGES, SITE } from '../content'
import { FOCUS_AREAS, HEADCOUNTS, MAX_FOCUS, MAX_NOTES, STAGES, validateCompany, validateFocus, type Fields } from '../shared/audit'
import { postJson, requestJson } from '../lib/api'
import { cx } from '../lib/cx'
import { formatDay, formatDayLong, formatTime, timeZoneName } from '../lib/format'
import { readJson, removeKey, writeJson } from '../lib/storage'
import { usePageTitle } from '../lib/title'

type Draft = { name: string; email: string; company: string; role: string; headcount: string; stage: string; focus: string[]; notes: string; date: string; slot: string }
type Booking = { ref: string; slot: string; name: string; company: string; email: string }

const DRAFT_KEY = `${SITE.storagePrefix}.audit.draft`
const BOOKING_KEY = `${SITE.storagePrefix}.audit.booking`
const EMPTY: Draft = { name: '', email: '', company: '', role: '', headcount: '', stage: '', focus: [], notes: '', date: '', slot: '' }

function icsFor(b: Booking) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = new Date(new Date(b.slot).getTime() + 45 * 60000).toISOString()
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Peoplefirst Partners//Audit//EN', 'BEGIN:VEVENT', `UID:${b.ref}@peoplefirst.example`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(b.slot)}`, `DTEND:${stamp(end)}`, `SUMMARY:Free HR audit with ${SITE.name}`, `DESCRIPTION:Booking ${b.ref} for ${b.company}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}

function downloadIcs(b: Booking) {
  const url = URL.createObjectURL(new Blob([icsFor(b)], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `hr-audit-${b.ref}.ics`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Confirmation({ booking, onCancel, onAnother }: { booking: Booking; onCancel: () => void; onAnother: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  return (
    <div className="flex flex-col gap-6">
      <span className="round grid size-14 place-items-center rounded-full bg-accent text-ink">
        <CalendarPlus aria-hidden className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 ref={heading} tabIndex={-1} className="text-[2rem] leading-tight font-semibold tracking-[-0.035em] focus:outline-none">
          {AUDIT.successTitle}, {booking.name.split(' ')[0]}
        </h2>
        <p className="text-body">{AUDIT.successText}</p>
      </div>
      <dl className="grid gap-4 rounded-[var(--radius-lg)] bg-sand p-5 sm:grid-cols-2">
        <div>
          <dt className="text-[0.8125rem] font-semibold text-muted">When</dt>
          <dd className="font-semibold">
            {formatDayLong(booking.slot)}, {formatTime(booking.slot)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] font-semibold text-muted">Where</dt>
          <dd className="inline-flex items-center gap-1.5 font-semibold">
            <Video aria-hidden className="size-4" /> Video call, 45 min
          </dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] font-semibold text-muted">Company</dt>
          <dd className="font-semibold">{booking.company}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] font-semibold text-muted">Reference</dt>
          <dd className="font-semibold tabular-nums">{booking.ref}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => downloadIcs(booking)} icon={<CalendarPlus aria-hidden className="size-4" />}>
          {AUDIT.addToCalendar}
        </Button>
        <Button variant="secondary" onClick={onAnother}>
          {AUDIT.bookAnother}
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(true)} className="text-danger">
          {AUDIT.cancel}
        </Button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Cancel this booking?" description={`${formatDayLong(booking.slot)}, ${formatTime(booking.slot)}. You can book a new time afterwards.`}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirm(false)} data-autofocus>
            Keep booking
          </Button>
          <Button
            onClick={() => {
              setConfirm(false)
              onCancel()
            }}
          >
            Cancel booking
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function useSlots(date: string) {
  const [days, setDays] = useState<string[] | null>(null)
  const [slots, setSlots] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let live = true
    requestJson<{ days: string[] }>('/api/slots').then((r) => {
      if (!live) return
      if (r.ok) setDays(r.days)
      else setError(AUDIT.slotsError)
    })
    return () => {
      live = false
    }
  }, [nonce])
  useEffect(() => {
    if (!date) return
    let live = true
    setSlots(null)
    requestJson<{ slots: string[] }>(`/api/slots?date=${encodeURIComponent(date)}`).then((r) => {
      if (!live) return
      if (r.ok) {
        setSlots(r.slots)
        setError('')
      } else setError(r.status === 400 ? r.error : AUDIT.slotsError)
    })
    return () => {
      live = false
    }
  }, [date, nonce])
  const retry = useCallback(() => {
    setError('')
    setNonce((n) => n + 1)
  }, [])
  return { days, slots, error, retry }
}

export function Audit() {
  usePageTitle('Book a free HR audit')
  const toast = useToast()
  const [params] = useSearchParams()
  const plan = ENGAGEMENTS.plans.find((p) => p.id === params.get('plan'))
  const [booking, setBooking] = useState<Booking | null>(() => readJson<Booking | null>(BOOKING_KEY, null))
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY, ...readJson<Partial<Draft>>(DRAFT_KEY, {}) }))
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Fields>({})
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)
  const { days, slots, error: slotsError, retry } = useSlots(step === 2 ? draft.date : '')
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 2 && days?.length && !days.includes(draft.date)) setDraft((d) => ({ ...d, date: days[0], slot: '' }))
  }, [step, days, draft.date])
  useEffect(() => writeJson(DRAFT_KEY, { ...draft, slot: '' }), [draft])

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key as keyof Fields]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const goTo = (i: number) => {
    setStep(i)
    setFormError('')
    window.setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button[role=radio]')?.focus(), 50)
  }
  const fail = (f: Fields) => {
    setErrors(f)
    window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus(), 30)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (step === 0) {
      const f = validateCompany(draft)
      if (Object.keys(f).length) return fail(f)
      return goTo(1)
    }
    if (step === 1) {
      const f = validateFocus(draft)
      if (Object.keys(f).length) return fail(f)
      return goTo(2)
    }
    if (!draft.slot) return setErrors({ slot: 'Pick a time.' })
    setSending(true)
    const res = await postJson<{ ref: string; slot: string }>('/api/audit', { ...draft, plan: plan?.id })
    setSending(false)
    if (res.ok) {
      const b: Booking = { ref: res.ref, slot: res.slot, name: draft.name.trim(), company: draft.company.trim(), email: draft.email.trim() }
      writeJson(BOOKING_KEY, b)
      removeKey(DRAFT_KEY)
      setBooking(b)
      setDraft(EMPTY)
      setStep(0)
      return
    }
    setFormError(res.error)
    if (res.fields) {
      setErrors(res.fields)
      const keys = Object.keys(res.fields)
      if (keys.some((k) => ['name', 'email', 'company', 'headcount', 'stage'].includes(k))) setStep(0)
      else if (keys.some((k) => ['focus', 'notes'].includes(k))) setStep(1)
    }
    if (res.status === 409) {
      update('slot', '')
      retry()
    }
  }

  const cancel = () => {
    removeKey(BOOKING_KEY)
    setBooking(null)
    toast(AUDIT.cancelled)
  }

  const reschedule = () => {
    if (!booking) return
    removeKey(BOOKING_KEY)
    setDraft((d) => ({ ...d, name: booking.name, email: booking.email, company: booking.company, slot: '' }))
    setBooking(null)
    goTo(0)
  }

  return (
    <section className="relative -mt-[84px] overflow-hidden pt-[130px] pb-24 sm:-mt-[100px] sm:pt-[160px]">
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[55%] opacity-60" />
      <Container className="relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="flex flex-col gap-7">
          <Eyebrow>{AUDIT.eyebrow}</Eyebrow>
          <h1 className="text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.04em] text-balance sm:text-[3.6rem]">{AUDIT.title}</h1>
          <p className="max-w-lg text-[1.0625rem] leading-relaxed text-body">{AUDIT.text}</p>
          <CheckList items={AUDIT.includes} />
          <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-paper/80 p-4 shadow-[var(--shadow-card)] backdrop-blur sm:max-w-md">
            <img src={IMAGES.avatarFounder.src} alt="" width={56} height={56} className="round size-14 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="font-semibold">With Maya Lindqvist</span>
              <span className="inline-flex items-center gap-1.5 text-[0.9rem] text-muted">
                <Clock aria-hidden className="size-4" /> 45 minutes on video
              </span>
            </div>
          </div>
          <SocialProof label="Loved by founders globally" />
        </div>

        <div ref={panel} className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-raise)] sm:p-9">
          {booking ? (
            <Confirmation booking={booking} onCancel={cancel} onAnother={reschedule} />
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-7" aria-labelledby="audit-step">
              <Stepper steps={AUDIT.steps} current={step} onStep={goTo} />
              <div className="flex flex-col gap-1">
                <h2 id="audit-step" className="text-[1.6rem] font-semibold tracking-[-0.03em]">
                  {AUDIT.steps[step]}
                </h2>
                {plan && <p className="text-[0.9rem] text-accent-ink">Interested in the {plan.name} plan ({plan.days})</p>}
              </div>
              {formError && <Notice>{formError}</Notice>}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                  {step === 0 && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField label="Your name" autoComplete="name" value={draft.name} onChange={(e) => update('name', e.target.value)} error={errors.name} />
                      <TextField label="Work email" type="email" autoComplete="email" value={draft.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
                      <TextField label="Company" autoComplete="organization" value={draft.company} onChange={(e) => update('company', e.target.value)} error={errors.company} />
                      <TextField label="Your role" optional autoComplete="organization-title" value={draft.role} onChange={(e) => update('role', e.target.value)} />
                      <SelectField label="Team size" options={[...HEADCOUNTS]} placeholder="Choose" value={draft.headcount} onChange={(e) => update('headcount', e.target.value)} error={errors.headcount} />
                      <SelectField label="Stage" options={[...STAGES]} placeholder="Choose" value={draft.stage} onChange={(e) => update('stage', e.target.value)} error={errors.stage} />
                    </div>
                  )}
                  {step === 1 && (
                    <div className="flex flex-col gap-6">
                      <fieldset aria-describedby="focus-hint" aria-invalid={errors.focus ? true : undefined} className="flex flex-col gap-3">
                        <legend className="mb-3 text-[0.9rem] font-semibold text-ink-2">What should we look at?</legend>
                        <div className="flex flex-wrap gap-2">
                          {FOCUS_AREAS.map((a) => {
                            const on = draft.focus.includes(a)
                            return (
                              <Chip key={a} selected={on} disabled={!on && draft.focus.length >= MAX_FOCUS} onClick={() => update('focus', on ? draft.focus.filter((x) => x !== a) : [...draft.focus, a])}>
                                {a}
                              </Chip>
                            )
                          })}
                        </div>
                        <p id="focus-hint" className={cx('text-[0.85rem]', errors.focus ? 'font-medium text-danger' : 'text-muted')}>
                          {errors.focus ?? `${draft.focus.length} of up to ${MAX_FOCUS} picked`}
                        </p>
                      </fieldset>
                      <TextArea label="Anything we should know?" optional maxLength={MAX_NOTES} value={draft.notes} onChange={(e) => update('notes', e.target.value)} error={errors.notes} hint={`${draft.notes.length}/${MAX_NOTES}`} placeholder="Hiring plans, a recent round, what keeps you up at night" />
                    </div>
                  )}
                  {step === 2 && (
                    <div className="flex flex-col gap-6">
                      {slotsError ? (
                        <div className="flex flex-col items-start gap-3">
                          <Notice className="self-stretch">{slotsError}</Notice>
                          <Button variant="secondary" size="sm" onClick={retry} icon={<RefreshCw aria-hidden className="size-4" />}>
                            {AUDIT.retry}
                          </Button>
                        </div>
                      ) : !days ? (
                        <SlotSkeleton />
                      ) : (
                        <>
                          <div role="radiogroup" aria-label="Day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2">
                            {days.map((d) => {
                              const on = d === draft.date
                              return (
                                <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDraft((x) => ({ ...x, date: d, slot: '' }))} className={cx('flex h-[68px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] border text-center transition-colors', on ? 'border-ink bg-ink text-white' : 'border-line-strong bg-paper hover:border-ink')}>
                                  <span className={cx('text-[0.75rem] font-medium', on ? 'text-white/75' : 'text-muted')}>{formatDay(d).split(' ')[0].replace(',', '')}</span>
                                  <span className="text-[1.05rem] font-semibold">{formatDay(d).split(' ').slice(1).join(' ')}</span>
                                </button>
                              )
                            })}
                          </div>
                          <fieldset className="flex flex-col gap-3">
                            <legend className="mb-3 flex w-full items-baseline justify-between gap-2 text-[0.9rem] font-semibold text-ink-2">
                              <span>{draft.date ? formatDayLong(`${draft.date}T12:00:00Z`) : 'Pick a day'}</span>
                              <span className="text-[0.8rem] font-normal text-muted">
                                {AUDIT.timezoneNote} ({timeZoneName()})
                              </span>
                            </legend>
                            {!slots ? (
                              <SlotSkeleton rows={1} label={AUDIT.loadingSlots} />
                            ) : slots.length === 0 ? (
                              <Notice tone="info">{AUDIT.noSlots}</Notice>
                            ) : (
                              <div role="radiogroup" aria-label="Time" aria-invalid={errors.slot ? true : undefined} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {slots.map((s) => {
                                  const on = s === draft.slot
                                  return (
                                    <button key={s} type="button" role="radio" aria-checked={on} onClick={() => update('slot', s)} className={cx('h-11 rounded-full border text-[0.9rem] font-semibold tabular-nums transition-colors', on ? 'border-ink bg-ink text-white' : 'border-line-strong bg-paper hover:border-ink')}>
                                      {formatTime(s)}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            {errors.slot && <p className="text-[0.85rem] font-medium text-danger">{errors.slot}</p>}
                          </fieldset>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {step > 0 && (
                    <Button variant="secondary" onClick={() => goTo(step - 1)}>
                      Back
                    </Button>
                  )}
                  <span className="text-[0.8125rem] text-muted">{AUDIT.draftSaved}</span>
                </div>
                <ArrowButton type="submit" loading={sending} className="justify-between">
                  {step < 2 ? 'Continue' : 'Book my audit'}
                </ArrowButton>
              </div>
            </form>
          )}
        </div>
      </Container>
    </section>
  )
}

function SlotSkeleton({ rows = 2, label = AUDIT.loadingSlots }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, j) => (
            <span key={j} className="h-11 animate-pulse rounded-full bg-ink/6" />
          ))}
        </div>
      ))}
    </div>
  )
}
