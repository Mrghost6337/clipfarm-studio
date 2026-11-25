import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { Eyebrow } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { ABOUT, HOME } from '../content'
import { usePageTitle } from '../lib/title'

export function About() {
  usePageTitle('About')
  return (
    <>
      <section className="relative -mt-[84px] overflow-hidden pt-[130px] pb-20 sm:-mt-[100px] sm:pt-[170px]">
        <div aria-hidden className="page-grid absolute inset-0" />
        <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[60%] opacity-60" />
        <Container className="relative">
          <div className="flex max-w-3xl flex-col gap-7">
            <Eyebrow>{ABOUT.eyebrow}</Eyebrow>
            <h1 className="text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance sm:text-[3.5rem]">{ABOUT.title}</h1>
            {ABOUT.intro.map((p) => (
              <p key={p} className="max-w-2xl text-[1.0625rem] leading-relaxed text-body">
                {p}
              </p>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading eyebrow="Values" title={ABOUT.valuesTitle} />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT.values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.05}>
                <Card className="flex h-full flex-col gap-3">
                  <span className="text-[0.875rem] font-semibold text-accent-ink">0{i + 1}</span>
                  <h3 className="text-[1.25rem] font-semibold tracking-[-0.025em]">{v.title}</h3>
                  <p className="text-[0.95rem] leading-relaxed text-body">{v.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand title={HOME.cta.title} text={HOME.cta.text} button={HOME.cta.button} />
    </>
  )
}
