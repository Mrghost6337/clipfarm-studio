import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { FOOTER, SITE } from '../content'
import { postJson } from '../lib/api'
import { readJson, writeJson } from '../lib/storage'
import { Button } from './Button'
import { Container } from './Container'
import { Logo } from './Logo'

const KEY = `${SITE.storagePrefix}.newsletter`

export function Footer() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(() => (readJson<string | null>(KEY, null) ? 'done' : 'idle'))
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('loading')
    const res = await postJson<{ ok: true }>('/api/subscribe', { email })
    if (res.ok) {
      writeJson(KEY, email.trim())
      setState('done')
    } else {
      setError(res.error)
      setState('error')
    }
  }
  return (
    <footer className="mt-auto bg-ink text-white">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.2fr_1fr] lg:py-20">
        <div className="flex max-w-md flex-col gap-6">
          <Logo tone="white" />
          <p className="text-[1.0625rem] leading-relaxed text-white/75">{FOOTER.blurb}</p>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{FOOTER.newsletterTitle}</h2>
            <p className="text-[0.95rem] text-white/75">{FOOTER.newsletterText}</p>
            {state === 'done' ? (
              <p role="status" className="text-[0.95rem] font-medium text-accent">
                {FOOTER.newsletterDone}
              </p>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label htmlFor="footer-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={state === 'error' || undefined}
                    aria-describedby={state === 'error' ? 'footer-email-e' : undefined}
                    className="h-12 min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-5 text-white placeholder:text-white/60 focus:border-white focus-visible:outline-[2.5px] focus-visible:outline-offset-2 focus-visible:outline-apricot"
                  />
                  <Button type="submit" variant="light" loading={state === 'loading'}>
                    {FOOTER.newsletterButton}
                  </Button>
                </div>
                {state === 'error' && (
                  <p id="footer-email-e" role="alert" className="pl-5 text-[0.85rem] text-[#ffb4a8]">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {FOOTER.columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h2 className="text-[0.9rem] font-semibold text-white/60">{col.title}</h2>
              <ul className="flex flex-col gap-1">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex min-h-10 min-w-10 items-center text-[0.975rem] text-white/90 hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
      <Container className="flex flex-col gap-2 border-t border-white/10 py-6 text-[0.85rem] text-white/60 sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} {SITE.name}. {FOOTER.legal}
        </span>
        <a href={`mailto:${SITE.email}`} className="inline-flex min-h-10 items-center hover:text-white">
          {SITE.email}
        </a>
      </Container>
    </footer>
  )
}
