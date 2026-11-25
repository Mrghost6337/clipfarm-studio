import { ArrowRight, Plus } from 'lucide-react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Link } from 'react-router'

import { ArrowLink, ButtonLink } from '../components/Button'
import { QuoteBlock, ServiceCard } from '../components/Cards'
import { Stat } from '../components/Card'
import { CheckPoint } from '../components/CheckItem'
import { CreatorCard, CreatorChip } from '../components/CreatorCard'
import { Container } from '../components/Container'
import { GtaClipRail } from '../components/GtaClipRail'
import { CtaBand } from '../components/CtaBand'
import { Accordion } from '../components/Accordion'
import { Badge, CheckPill, Tag } from '../components/Pill'
import { Marquee } from '../components/Marquee'
import { SocialProof } from '../components/Proof'
import { Reveal } from '../components/Reveal'
import { Scribble } from '../components/Scribble'
import { SectionHeading } from '../components/SectionHeading'
import { CREATORS, CREATORS_NOTE, FAQS, GTA, HERO, HOME, IMAGES, PLAN_PAGE, SERVICES, TOOLS } from '../content'
import { usePageTitle } from '../lib/title'

const rise = (delay: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const } })

function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 130, damping: 26, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-apricot via-accent to-accent-ink"
    />
  )
}

function Hero() {
  return (
    <section className="relative -mt-[80px] overflow-hidden pt-[124px] sm:-mt-[100px] sm:pt-[150px]">
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="absolute inset-x-[-10%] bottom-0 h-[68%] animate-glow motion-reduce:animate-none">
        <div className="hero-glow size-full" />
      </div>
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center px-5 text-center sm:px-8">
        <motion.div {...rise(0)}>
          <Badge avatar={IMAGES.avatarFounder}>{HERO.badge}</Badge>
        </motion.div>
        <motion.h1 {...rise(0.08)} className="mt-6 text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.022em] text-balance text-ink sm:text-[3.6rem] lg:text-[4.15rem] lg:leading-[1.13]">
          {HERO.title[0]}
          <br className="hidden sm:block" /> {HERO.title[1]}
        </motion.h1>
        <motion.p {...rise(0.16)} className="mt-6 max-w-[620px] text-[1rem] sm:text-[1.0625rem] leading-[1.6] text-pretty text-body">
          {HERO.text}
        </motion.p>
        <motion.div {...rise(0.24)} className="relative mt-12">
          <ArrowLink to={HERO.cta.to} size="lg">
            {HERO.cta.label}
          </ArrowLink>
          <span className="absolute top-1/2 left-[calc(100%+10px)] hidden -translate-y-1/2 md:block">
            <Scribble note={HERO.note} />
          </span>
        </motion.div>
        <motion.div {...rise(0.32)} className="mt-6">
          <SocialProof label={HERO.proof} />
        </motion.div>
      </div>
      <Marquee className="relative mx-auto mt-[68px] max-w-[1324px] [--gap:14px]" label="What you get">
        {HERO.pills.map((p) => (
          <CheckPill key={p}>{p}</CheckPill>
        ))}
      </Marquee>
      <Container wide className="relative grid gap-10 pt-12 pb-20 md:grid-cols-3 md:gap-8 md:pb-[80px]">
        {HERO.points.map((p, i) => (
          <Reveal key={p} delay={i * 0.08}>
            <CheckPoint className="max-w-[420px]">{p}</CheckPoint>
          </Reveal>
        ))}
      </Container>
    </section>
  )
}

function Launch() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%'])
  return (
    <section ref={ref} className="pt-10 pb-2 sm:pt-14">
      <Container wide>
        <Reveal>
          <Link
            to="/gta-6"
            className="group relative block overflow-hidden rounded-[var(--radius-xl)] bg-ink text-white shadow-[var(--shadow-raise)] focus-visible:outline-[2.5px] focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            <motion.div aria-hidden style={{ y }} className="absolute inset-x-0 -inset-y-[8%]">
              <img
                src={IMAGES.gtaTrailer2.src}
                alt=""
                width={1568}
                height={672}
                loading="lazy"
                className="size-full object-cover opacity-60 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
              />
            </motion.div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/10" />
            <div className="relative flex flex-col gap-4 p-7 sm:p-10 lg:max-w-[62%] lg:p-12">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-11 items-center rounded-[14px] border border-white/20 bg-white/10 px-3 text-[1rem] font-black tracking-[-0.04em]">GTA VI</span>
                <Tag tone="peach">{GTA.badge}</Tag>
                <span className="text-[0.8rem] font-medium tracking-[0.06em] text-white/65 uppercase">GTA VI · {GTA.launched}</span>
              </div>
              <h2 className="text-[1.8rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-[2.4rem]">GTA VI is out. Clip the launch.</h2>
              <p className="max-w-[520px] text-[0.975rem] leading-relaxed text-white/75">
                Paste a Leonida VOD and the detector cuts the first reaction, the cop chase and the heist fail — vertical, captioned and scored.
              </p>
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-[0.9rem] font-semibold text-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
                Open the GTA VI hub <ArrowRight aria-hidden className="size-4" />
              </span>
            </div>
          </Link>
        </Reveal>
      </Container>
    </section>
  )
}

function Trusted() {
  return (
    <section aria-labelledby="trusted" className="py-16 sm:py-[72px]">
      <h2 id="trusted" className="text-center text-[1.125rem] font-medium text-ink-2">
        {HOME.trusted}
      </h2>
      <Marquee slow className="mx-auto mt-8 max-w-[1324px] [--gap:14px]" label="Channels Clipfarm clips for">
        {CREATORS.map((creator) => (
          <CreatorChip key={creator.name} creator={creator} />
        ))}
      </Marquee>
    </section>
  )
}

function Services() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={HOME.services.eyebrow}
            title={HOME.services.title}
            text={HOME.services.text}
            action={
              <ButtonLink to="/services" variant="secondary" icon={null}>
                {HOME.services.link} <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            }
          />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.06}>
              <ServiceCard service={s} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}

function Plan() {
  return (
    <section className="py-20 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <Reveal className="relative">
          <img src={IMAGES.workshop.src} alt={IMAGES.workshop.alt} loading="lazy" width={1400} height={933} className="aspect-[4/3.4] w-full rounded-[var(--radius-xl)] object-cover shadow-[var(--shadow-card)]" />
          <div className="absolute right-4 bottom-4 left-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-paper/95 p-4 shadow-[var(--shadow-card)] backdrop-blur sm:right-auto sm:max-w-xs">
            <span className="text-[2rem] leading-none font-semibold tracking-[-0.05em]">20</span>
            <span className="text-[0.9rem] leading-snug text-body">vertical clips out of every VOD, captioned and tracked</span>
          </div>
        </Reveal>
        <div className="flex flex-col gap-10">
          <Reveal>
            <SectionHeading eyebrow={HOME.plan.eyebrow} title={HOME.plan.title} text={HOME.plan.text} />
          </Reveal>
          <ol className="flex flex-col gap-3">
            {PLAN_PAGE.phases.map((ph, i) => (
              <Reveal as="li" key={ph.id} delay={i * 0.06} className="flex gap-5 rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)]">
                  <span className="round grid size-11 shrink-0 place-items-center rounded-full bg-ink text-[1.05rem] font-semibold text-white">{i + 1}</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em]">{ph.name}</h3>
                      <span className="text-[0.875rem] font-semibold text-accent-ink">{ph.days}</span>
                    </div>
                    <p className="text-[0.95rem] text-body">{ph.goal}</p>
                  </div>
              </Reveal>
            ))}
          </ol>
          <Link to="/pipeline" className="inline-flex min-h-10 items-center gap-2 self-start font-semibold underline decoration-accent decoration-2 underline-offset-6 hover:decoration-ink">
            {HOME.plan.link} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  )
}

function Stats() {
  return (
    <section className="py-8">
      <Container>
        <Reveal>
          <div className="grid gap-8 rounded-[var(--radius-xl)] bg-ink px-8 py-12 sm:grid-cols-2 sm:px-12 lg:grid-cols-4">
            {HOME.stats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} tone="white" />
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

function Stack() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={HOME.stack.eyebrow}
            title={HOME.stack.title}
            text={HOME.stack.text}
            action={
              <ButtonLink to="/toolkit" variant="secondary">
                {HOME.stack.link} <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            }
          />
        </Reveal>
      </Container>
      <Marquee slow className="mx-auto mt-12 max-w-[1324px] [--gap:10px]" label="Tools in the pipeline">
        {TOOLS.map((t) => (
          <span key={t.n} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-paper/70 px-4 text-[0.9rem] font-medium text-ink-2">
            <span className="text-[0.75rem] font-semibold text-muted tabular-nums">{t.n}</span>
            {t.name}
          </span>
        ))}
      </Marquee>
    </section>
  )
}

function Cases() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={HOME.cases.eyebrow}
            title={HOME.cases.title}
            text={HOME.cases.text}
            action={
              <ButtonLink to="/case-studies" variant="secondary">
                {HOME.cases.link} <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            }
          />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CREATORS.slice(0, 8).map((creator, i) => (
            <Reveal key={creator.name} delay={(i % 3) * 0.06}>
              <CreatorCard creator={creator} className="h-full" />
            </Reveal>
          ))}
          <Reveal delay={0.12}>
            <Link
              to="/signup"
              className="group flex h-full min-h-[232px] flex-col items-start justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-white/40 p-6 transition-[transform,border-color,background-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-ink hover:bg-white/80 hover:shadow-[var(--shadow-card)]"
            >
              <span aria-hidden className="grid size-11 place-items-center rounded-full bg-peach text-accent-ink">
                <Plus className="size-5" />
              </span>
              <p className="text-[1.05rem] font-semibold tracking-[-0.02em]">Your channel next</p>
              <p className="text-[0.88rem] leading-relaxed text-body">Send one VOD and get ten clips back in 48 hours. The first pass is free.</p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-accent-ink">
                Start free <ArrowRight aria-hidden className="size-3.5" />
              </span>
            </Link>
          </Reveal>
        </div>
        <p className="mt-6 max-w-3xl text-[0.78rem] leading-relaxed text-muted">{CREATORS_NOTE}</p>
        <Reveal>
          <div className="mt-16 rounded-[var(--radius-xl)] bg-peach/70 p-8 sm:p-14">
            <QuoteBlock {...HOME.quote} avatar={IMAGES.avatars[0]} className="max-w-4xl" />
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title={HOME.faqTitle} />
        </Reveal>
        <Accordion items={FAQS} />
      </Container>
    </section>
  )
}

export function Home() {
  usePageTitle()
  return (
    <>
      <ReadingProgress />
      <Hero />
      <Launch />
      <GtaClipRail />
      <Trusted />
      <Services />
      <Plan />
      <Stats />
      <Stack />
      <Cases />
      <Faq />
      <CtaBand title={HOME.cta.title} text={HOME.cta.text} button={HOME.cta.button} />
    </>
  )
}
