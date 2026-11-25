import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { SITE } from '../content'
import { Container } from './Container'
import { Logo } from './Logo'

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
  return (
    <footer className="mt-auto bg-ink text-white">
      <Container className="grid gap-12 py-14 lg:grid-cols-[1.15fr_1.85fr] lg:py-18">
        <div className="flex max-w-sm flex-col gap-5">
          <Logo tone="white" />
          <p className="text-[0.95rem] leading-relaxed text-white/70">
            Turn long videos into vertical clips with face tracking, word-synced captions and exports for Shorts, Reels and TikTok. Local-first, free by default.
          </p>
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
        {SITE.email && (
          <a href={`mailto:${SITE.email}`} className="inline-flex min-h-9 items-center gap-1 text-white/70 hover:text-white">
            {SITE.email}
            <ArrowUpRight aria-hidden className="size-3" />
          </a>
        )}
      </Container>
    </footer>
  )
}
