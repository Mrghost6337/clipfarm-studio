import { ArrowUpRight } from 'lucide-react'

import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { PageHero } from '../components/PageHero'
import { Reveal } from '../components/Reveal'
import { TOOLKIT, TOOLS, type ToolGroup } from '../content'
import { usePageTitle } from '../lib/title'

export function Toolkit() {
  usePageTitle('Toolkit')
  return (
    <>
      <PageHero eyebrow={TOOLKIT.eyebrow} title={TOOLKIT.title} text={TOOLKIT.text} />

      <Container>
        <Reveal>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-[var(--radius-xl)] bg-ink px-6 py-6 text-center text-[1rem] font-semibold tracking-[-0.01em] text-white sm:text-[1.15rem]">
            {TOOLKIT.tagline.split(' → ').map((step, i, all) => (
              <span key={step} className="inline-flex items-center gap-3">
                <span>{step}</span>
                {i < all.length - 1 && (
                  <span aria-hidden className="text-accent">
                    →
                  </span>
                )}
              </span>
            ))}
          </p>
        </Reveal>
      </Container>

      <section className="py-14 sm:py-16">
        <Container className="flex flex-col gap-16">
          {TOOLKIT.groups.map((group: ToolGroup) => {
            const tools = TOOLS.filter((t) => t.group === group)
            return (
              <div key={group} className="flex flex-col gap-6">
                <Reveal>
                  <div className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-baseline sm:justify-between">
                    <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em]">{group}</h2>
                    <p className="max-w-md text-[0.975rem] leading-relaxed text-body">{TOOLKIT.groupText[group]}</p>
                  </div>
                </Reveal>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool, i) => (
                    <Reveal key={tool.name} delay={(i % 3) * 0.05}>
                      <a
                        href={tool.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex h-full flex-col gap-4 rounded-[var(--radius-lg)] bg-paper p-6 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-raise)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[0.875rem] font-semibold text-muted tabular-nums">{tool.n}</span>
                          <span aria-hidden className="round grid size-9 place-items-center rounded-full bg-ink/5 transition-[background-color,color,transform] duration-[var(--duration-base)] group-hover:rotate-45 group-hover:bg-ink group-hover:text-white">
                            <ArrowUpRight className="size-4" />
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-[1.15rem] leading-snug font-semibold tracking-[-0.02em]">{tool.name}</h3>
                          <p className="text-[0.95rem] leading-relaxed text-body">{tool.does}</p>
                        </div>
                        <span className="mt-auto text-[0.8125rem] font-semibold text-accent-ink">
                          {TOOLKIT.linkLabel}
                          <span className="sr-only">: {tool.name} (opens in a new tab)</span>
                        </span>
                      </a>
                    </Reveal>
                  ))}
                </div>
              </div>
            )
          })}
        </Container>
        <Container>
          <p className="mt-14 text-[0.875rem] text-muted">{TOOLKIT.note}</p>
        </Container>
      </section>

      <CtaBand title={TOOLKIT.cta.title} text={TOOLKIT.cta.text} button={TOOLKIT.cta.button} />
    </>
  )
}
