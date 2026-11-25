import { ArrowLink } from './Button'
import { Container } from './Container'
import { SocialProof } from './Proof'
import { Reveal } from './Reveal'

export function CtaBand({ title, text, button, proof = 'Trusted by 400+ creators' }: { title: string; text: string; button: string; proof?: string }) {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-paper px-6 py-14 text-center shadow-[var(--shadow-card)] sm:px-12 sm:py-20">
            <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-full opacity-70" />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
              <h2 className="text-[2.1rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[3rem]">{title}</h2>
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-body">{text}</p>
              <ArrowLink to="/signup" size="lg">
                {button}
              </ArrowLink>
              <SocialProof label={proof} />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
