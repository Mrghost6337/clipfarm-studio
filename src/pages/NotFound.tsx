import { ArrowLink, ButtonLink } from '../components/Button'
import { Container } from '../components/Container'
import { NOT_FOUND } from '../content'
import { usePageTitle } from '../lib/title'

export function NotFound() {
  usePageTitle('Page not found')
  return (
    <section className="relative -mt-[84px] overflow-hidden pt-[180px] pb-28 sm:-mt-[100px]">
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[70%] opacity-70" />
      <Container className="relative flex flex-col items-center gap-6 text-center">
        <p className="text-[6rem] leading-none font-semibold tracking-[-0.06em] text-ink/15 sm:text-[9rem]">404</p>
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[3rem]">{NOT_FOUND.title}</h1>
        <p className="max-w-md text-[1.0625rem] text-body">{NOT_FOUND.text}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <ArrowLink to="/signup">{NOT_FOUND.cta}</ArrowLink>
          <ButtonLink to="/" variant="secondary">
            {NOT_FOUND.home}
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
