import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { ArrowButton } from '../components/Button'
import { CheckList } from '../components/CheckItem'
import { Container } from '../components/Container'
import { Notice, TextField } from '../components/Field'
import { Eyebrow } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Segmented } from '../components/Segmented'
import { nextRoute, useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/title'

type Mode = 'login' | 'signup'

/** Google's official multicolour G. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.9 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.9c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.2 7.3-10.3 7.3-17.5Z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1Z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.9l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.4 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  )
}

function GoogleButton() {
  return (
    <a
      href="/api/auth/google"
      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-paper px-6 text-[0.95rem] font-semibold text-ink shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] hover:border-ink hover:bg-sand active:scale-[0.98] focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-ink"
    >
      <GoogleMark />
      Continue with Google
    </a>
  )
}

export function Login() {
  usePageTitle('Log in')
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const mode: Mode = pathname === '/signup' || params.get('mode') === 'signup' ? 'signup' : 'login'
  const auth = useAuth()
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!auth.loading && auth.user) navigate(nextRoute(auth.user), { replace: true })
  }, [auth.loading, auth.user, navigate])

  useEffect(() => {
    heading.current?.focus()
  }, [mode])

  const switchMode = (next: Mode) => {
    setFields({})
    setError('')
    if (params.has('error')) setParams(new URLSearchParams(), { replace: true })
    navigate(next === 'signup' ? '/signup' : '/login')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setFields({})
    setSending(true)
    const res = mode === 'login' ? await auth.signIn(email.trim(), password) : await auth.signUp(name.trim(), email.trim(), password)
    setSending(false)
    if (res.ok) {
      navigate(nextRoute(res.user))
      return
    }
    setError(res.error)
    if (res.fields) setFields(res.fields)
  }

  return (
    <section className="relative -mt-[84px] overflow-hidden pt-[130px] pb-24 sm:-mt-[100px] sm:pt-[160px]">
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[55%] opacity-60" />
      <Container className="relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal className="flex flex-col gap-7">
          <Eyebrow>Account</Eyebrow>
          <h1 className="text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.04em] text-balance sm:text-[3.4rem]">Every VOD, clip and payout in one place.</h1>
          <p className="max-w-lg text-[1.0625rem] leading-relaxed text-body">
            An account keeps your channel details, your clip history and the next VOD pass together. Booking a free pass still works without one.
          </p>
          <CheckList items={['See every VOD and the clips it produced', 'Track views and earnings per channel', 'Book the next pass without retyping your handle']} />
          <Link to="/services#plans" className="inline-flex min-h-10 items-center gap-2 self-start font-semibold underline decoration-accent decoration-2 underline-offset-6 hover:decoration-ink">
            Not ready? Compare the plans <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Reveal>

        <div className="rounded-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-raise)] sm:p-9">
          <Segmented<Mode>
            label="Log in or create an account"
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'login', label: 'Log in' },
              { value: 'signup', label: 'Create account' },
            ]}
          />

          <div className="mt-7 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 ref={heading} tabIndex={-1} className="text-[1.6rem] font-semibold tracking-[-0.03em] focus:outline-none">
                {mode === 'login' ? 'Welcome back' : 'Start clipping'}
              </h2>
              <p className="text-[0.95rem] text-body">
                {mode === 'login' ? 'Log in to see your channels and clips.' : 'One account for every channel you clip.'}
              </p>
            </div>

            <GoogleButton />
            <p className="text-center text-[0.8125rem] text-muted">We only use your Google name and email address.</p>

            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[0.8125rem] font-medium text-muted">or use email</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            {params.get('error') === 'google' && (
              <Notice>
                Google sign-in is not configured yet. Set <code className="font-semibold">GOOGLE_CLIENT_ID</code> and <code className="font-semibold">GOOGLE_CLIENT_SECRET</code> on the Worker and add{' '}
                <code className="font-semibold">{window.location.origin}/api/auth/google/callback</code> as a Google redirect URI. Email sign-up below works right now.
              </Notice>
            )}
            {error && <Notice>{error}</Notice>}

            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              {mode === 'signup' && <TextField label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} />}
              <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} />
              <TextField
                label="Password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fields.password}
                hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              />
              <ArrowButton type="submit" loading={sending} className="justify-between">
                {mode === 'login' ? 'Log in' : 'Create account'}
              </ArrowButton>
            </form>

            <p className="text-[0.8125rem] leading-relaxed text-muted">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  By creating an account you agree to clip only footage you have the rights to use. Already have one?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

      </Container>
    </section>
  )
}
