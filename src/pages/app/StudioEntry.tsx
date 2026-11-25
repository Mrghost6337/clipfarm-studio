import { ArrowLeft, Lock, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button, ButtonLink } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { StudioOnboarding, type StudioRuntime } from '../../components/StudioOnboarding'
import { useAuth } from '../../lib/auth'
import { usePageTitle } from '../../lib/title'
import { planById } from '../../shared/account'
import { Studio } from '../Studio'

type SavedSetup = { done: boolean; runtime?: StudioRuntime; completedAt?: string }

const readSetup = (key: string): SavedSetup => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SavedSetup) : { done: false }
  } catch {
    return { done: false }
  }
}

const saveSetup = (key: string, value: SavedSetup) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* the setup still completes for this visit */
  }
}

/**
 * The Studio route entry. First visit shows the two-step setup; after it is
 * finished the route renders the full Studio. Free accounts stay on the setup
 * screen until they have been through the download step.
 */
export function StudioEntry() {
  usePageTitle('Studio')
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const storageKey = `clipfarm.studio.onboarding.${user?.id ?? 'guest'}`
  const [done, setDone] = useState(() => readSetup(storageKey).done)
  const [open, setOpen] = useState(() => !readSetup(storageKey).done)

  useEffect(() => {
    if (loading) return
    const setup = readSetup(storageKey)
    setDone(setup.done)
    setOpen(!setup.done)
  }, [storageKey, loading])

  const plan = planById(user?.planId)
  const free = !user?.planId

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-sand" role="status" aria-label="Loading Studio">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden />
        </div>
      </div>
    )
  }

  if (done) return <Studio />

  function complete(runtime: StudioRuntime) {
    saveSetup(storageKey, { done: true, runtime, completedAt: new Date().toISOString() })
    setDone(true)
    setOpen(false)
  }

  function close() {
    if (done) {
      setOpen(false)
      return
    }
    navigate(user ? '/dashboard' : '/')
  }

  return (
    <>
      <div className="min-h-svh bg-sand">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-5">
          <Logo />
          <Link to={user ? '/dashboard' : '/'} className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" />
            {user ? 'Back to dashboard' : 'Back home'}
          </Link>
        </div>

        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-5 py-16 text-center sm:py-24">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-paper text-accent-ink shadow-[var(--shadow-card)]">
            {free ? <Lock className="size-6" /> : <Sparkles className="size-6" />}
          </span>
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Studio setup</p>
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">
            {free ? 'The Studio is locked' : 'One step before the Studio'}
          </h1>
          <p className="max-w-md text-[0.95rem] leading-relaxed text-body">
            {free
              ? 'Finish the download step to open the Studio. Desktop builds are coming soon, so we cannot detect an installation automatically yet.'
              : `Choose where Clip Farm runs before you enter the Studio. Your ${plan?.name ?? 'paid'} plan includes cloud processing.`}
          </p>
          <Button onClick={() => setOpen(true)}>{free ? 'Continue setup' : 'Choose how to run Clip Farm'}</Button>
          <ButtonLink to={user ? '/dashboard' : '/'} variant="secondary">
            {user ? 'Back to dashboard' : 'Back home'}
          </ButtonLink>
          <p className="mt-2 text-[0.76rem] text-muted">This setup is shown once. It takes less than a minute.</p>
        </div>
      </div>

      <StudioOnboarding
        open={open}
        paid={!free}
        planName={plan?.name ?? null}
        storageKey={storageKey}
        onClose={close}
        onComplete={complete}
      />
    </>
  )
}
