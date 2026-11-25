import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { ArrowButton, Button } from '../components/Button'
import { AppLoading, useRequireAuth } from '../components/AuthGate'
import { Container } from '../components/Container'
import { Notice, SelectField, TextField } from '../components/Field'
import { Chip, Eyebrow } from '../components/Pill'
import { Stepper } from '../components/Stepper'
import { useToast } from '../components/Toast'
import { usePageTitle } from '../lib/title'
import { AUDIENCES, CADENCES, CAPTION_STYLES, CLIP_AREAS, MAX_FOCUS, PLATFORMS } from '../shared/account'

const STEPS = ['Your channel', 'Clip style']

export function Onboarding() {
  usePageTitle('Set up your channel')
  const { user, ready, saveProfile } = useRequireAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const editing = Boolean(user?.onboardedAt)

  const [step, setStep] = useState(0)
  const [channel, setChannel] = useState('')
  const [platform, setPlatform] = useState('')
  const [audience, setAudience] = useState('')
  const [cadence, setCadence] = useState('')
  const [areas, setAreas] = useState<string[]>([])
  const [captionStyle, setCaptionStyle] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [skipping, setSkipping] = useState(false)

  useEffect(() => {
    if (!user) return
    setChannel((v) => v || user.channel || '')
    setPlatform((v) => v || user.platform || '')
    setAudience((v) => v || user.audience || '')
    setCadence((v) => v || user.cadence || '')
    setAreas((v) => (v.length ? v : user.clipAreas))
    setCaptionStyle((v) => v || user.captionStyle || '')
  }, [user])

  if (!ready || !user) return <AppLoading label="Loading your setup" />


  const toggleArea = (area: string) => {
    setAreas((list) => (list.includes(area) ? list.filter((a) => a !== area) : list.length >= MAX_FOCUS ? list : [...list, area]))
    setFields((f) => ({ ...f, clipAreas: '' }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (step === 0) {
      const next: Record<string, string> = {}
      if (channel.trim().length < 2) next.channel = 'Enter your channel name.'
      if (!platform) next.platform = 'Choose your platform.'
      if (!audience) next.audience = 'Choose your audience size.'
      if (!cadence) next.cadence = 'Choose a posting cadence.'
      setFields(next)
      if (!Object.keys(next).length) setStep(1)
      return
    }
    setSending(true)
    const res = await saveProfile({ channel, platform, audience, clipAreas: areas, captionStyle, cadence })
    setSending(false)
    if (!res.ok) {
      setError(res.error)
      setFields(res.fields ?? {})
      if (res.fields?.channel || res.fields?.platform || res.fields?.audience || res.fields?.cadence) setStep(0)
      return
    }
    toast(editing ? 'Channel settings saved' : 'Channel set up')
    navigate('/dashboard')
  }

  async function skip() {
    setSkipping(true)
    await saveProfile({ skip: true })
    setSkipping(false)
    navigate('/dashboard')
  }

  return (
    <section className="relative -mt-[84px] overflow-hidden pt-[130px] pb-24 sm:-mt-[100px] sm:pt-[160px]">
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[55%] opacity-60" />
      <Container className="relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="flex flex-col gap-7">
          <Eyebrow>{editing ? 'Channel settings' : 'Channel setup'}</Eyebrow>
          <h1 className="text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.04em] text-balance sm:text-[3.4rem]">
            {editing ? 'Tune your channel' : `Let’s set up ${user.name.split(' ')[0]}’s channel`}
          </h1>
          <p className="max-w-lg text-[1.0625rem] leading-relaxed text-body">
            Tell us about your channel. You can change it any time.
          </p>
          <ul className="flex flex-col gap-3 text-[0.95rem] text-ink-2">
            <li className="flex items-center gap-3">
              <span aria-hidden className="round size-2 rounded-full bg-accent" /> Your handle and platform
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="round size-2 rounded-full bg-accent" /> Clip focus and caption style
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="round size-2 rounded-full bg-accent" /> Then choose a plan
            </li>
          </ul>
          <Link to="/dashboard" className="inline-flex min-h-10 items-center self-start font-semibold text-ink-2 underline decoration-accent decoration-2 underline-offset-6 hover:text-ink">
            Skip to dashboard for now
          </Link>
        </div>

        <div className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-raise)] sm:p-9">
          <Stepper steps={STEPS} current={step} onStep={setStep} />
          <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em]">{STEPS[step]}</h2>
              <p className="text-[0.95rem] text-body">{step === 0 ? 'Where should the clips go, and how often?' : 'What should every clip look and feel like?'}</p>
            </div>

            {error && <Notice>{error}</Notice>}

            {step === 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Channel name" autoComplete="organization" value={channel} onChange={(e) => setChannel(e.target.value)} error={fields.channel} placeholder="NightOwl" />
                <SelectField label="Platform" options={[...PLATFORMS]} placeholder="Choose" value={platform} onChange={(e) => setPlatform(e.target.value)} error={fields.platform} />
                <SelectField label="Audience size" options={[...AUDIENCES]} placeholder="Choose" value={audience} onChange={(e) => setAudience(e.target.value)} error={fields.audience} />
                <SelectField label="Posting cadence" options={[...CADENCES]} placeholder="Choose" value={cadence} onChange={(e) => setCadence(e.target.value)} error={fields.cadence} />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-3 text-[0.9rem] font-semibold text-ink-2">What should we clip?</legend>
                  <div className="flex flex-wrap gap-2">
                    {CLIP_AREAS.map((area) => {
                      const on = areas.includes(area)
                      return (
                        <Chip key={area} selected={on} disabled={!on && areas.length >= MAX_FOCUS} onClick={() => toggleArea(area)}>
                          {area}
                        </Chip>
                      )
                    })}
                  </div>
                  <p className={fields.clipAreas ? 'text-[0.85rem] font-medium text-danger' : 'text-[0.85rem] text-muted'}>{fields.clipAreas || `${areas.length} of up to ${MAX_FOCUS} picked`}</p>
                </fieldset>
                <SelectField label="Caption style" options={[...CAPTION_STYLES]} placeholder="Choose" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)} error={fields.captionStyle} />
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep(0)}>
                    Back
                  </Button>
                )}
                {!editing && (
                  <Button variant="ghost" loading={skipping} onClick={skip}>
                    Skip
                  </Button>
                )}
              </div>
              <ArrowButton type="submit" loading={sending} className="justify-between">
                {step === 0 ? 'Continue' : editing ? 'Save settings' : 'Choose a plan'}
              </ArrowButton>
            </div>
          </form>
        </div>
      </Container>
    </section>
  )
}
