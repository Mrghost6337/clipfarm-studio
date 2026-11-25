import { ArrowUpRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { SITE } from '../content'
import { postJson } from '../lib/api'
import { readJson, writeJson } from '../lib/storage'
import { Button } from './Button'
import { Container } from './Container'
import { Logo } from './Logo'

const KEY = `${SITE.storagePrefix}.newsletter`

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Studio', to: '/studio' },
      { label: 'How it works', to: '/product' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Features', to: '/product#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Guides', to: '/resources/guides' },
      { label: 'FAQ', to: '/resources/faq' },
      { label: 'Changelog', to: '/resources/changelog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Start free', to: '/signup' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Terms of service', to: '/terms' },
      { label: 'Content rights', to: '/terms#rights' },
      { label: 'Cookie settings', to: '/privacy' },
    ],
  },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(() => (readJson<string | null>(KEY, null) ? 'done' : 'idle'))
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setState('loading')
    const result = await postJson<{ ok: true }>('/api/subscribe', { email })
    if (result.ok) {
      writeJson(KEY, email.trim())
      setState('done')
    } else {
      setError(result.error)
      setState('error')
    }
  }

  return (
    <footer className="mt-auto bg-ink text-white">
      <Container className="grid gap-12 py-14 lg:grid-cols-[1.15fr_1.85fr] lg:py-18">
        <div className="flex max-w-sm flex-col gap-5">
          <Logo tone="white" />
          <p className="text-[0.95rem] leading-relaxed text-white/70">
            Turn long videos into vertical clips with face tracking, word-synced captions and exports for Shorts, Reels and TikTok. Local-first, free by default.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-[0.85rem] font-semibold text-white">The Clip Notes</p>
            {state === 'done' ? (
              <p role="status" className="text-[0.85rem] font-medium text-accent">
                You’re on the list. First teardown lands Thursday.
              </p>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
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
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={state === 'error' || undefined}
                    className="h-11 min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-4 text-[0.9rem] text-white placeholder:text-white/45 focus:border-white focus-visible:outline-apricot"
                  />
                  <Button type="submit" variant="light" size="sm" loading={state === 'loading'} className="shrink-0">
                    Subscribe
                  </Button>
                </div>
                {state === 'error' && (
                  <p role="alert" className="pl-4 text-[0.78rem] text-[#ffb4a8]">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
              <h2 className="text-[0.78rem] font-semibold tracking-[0.08em] text-white/45 uppercase">{column.title}</h2>
              <ul className="flex flex-col">
                {column.links.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="inline-flex min-h-9 items-center text-[0.9rem] text-white/85 hover:text-accent">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col gap-4 border-t border-white/10 py-6 text-[0.8rem] text-white/55 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {SITE.name}. Clip only content you own or have the rights to use.
        </p>
        <div className="flex items-center gap-1">
          <a href="https://www.youtube.com/@ClipfarmStudio" target="_blank" rel="noreferrer" aria-label="Clipfarm on YouTube" className="round grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" /></svg>
          </a>
          <a href="https://www.instagram.com/clipfarmstudio" target="_blank" rel="noreferrer" aria-label="Clipfarm on Instagram" className="round grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.3 2.4.4.6.2 1 .5 1.5 1s.8.9 1 1.5c.2.5.3 1.2.4 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.4 2.4-.2.6-.5 1-1 1.5s-.9.8-1.5 1c-.5.2-1.2.3-2.4.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.4-.4-.6-.2-1-.5-1.5-1s-.8-.9-1-1.5c-.2-.5-.3-1.2-.4-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.9.4-2.4.2-.6.5-1 1-1.5s.9-.8 1.5-1c.5-.2 1.2-.3 2.4-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.8.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.7-.3.3-.5.7-.7 1.2-.2.4-.3 1-.4 2.1-.1 1.3-.1 1.7-.1 4.8s0 3.5.1 4.8c.1 1.1.2 1.7.4 2.1.2.5.4.9.7 1.2.3.3.7.5 1.2.7.4.2 1 .3 2.1.4 1.3.1 1.7.1 4.8.1s3.5 0 4.8-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.7.3-.3.5-.7.7-1.2.2-.4.3-1 .4-2.1.1-1.3.1-1.7.1-4.8s0-3.5-.1-4.8c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.7-1.2-.3-.3-.7-.5-1.2-.7-.4-.2-1-.3-2.1-.4-1.3-.1-1.7-.1-4.8-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm6.2-2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z" /></svg>
          </a>
          <a href={`mailto:${SITE.email}`} className="ml-2 inline-flex items-center gap-1 text-white/70 hover:text-white">
            {SITE.email}
            <ArrowUpRight aria-hidden className="size-3" />
          </a>
        </div>
      </Container>
    </footer>
  )
}
