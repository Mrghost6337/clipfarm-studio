import type { ReactNode } from 'react'

import { cx } from '../lib/cx'
import { Container } from './Container'
import { SectionHeading } from './SectionHeading'

/** Inner-page header: the heading over a softer version of the home glow. */
export function PageHero({ eyebrow, title, text, children, className }: { eyebrow: string; title: ReactNode; text?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={cx('relative -mt-[84px] overflow-hidden pt-[150px] sm:-mt-[100px] sm:pt-[180px] pb-16 sm:pb-20', className)}>
      <div aria-hidden className="page-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[70%] opacity-55" />
      <Container className="relative">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} text={text} align="center" className="mx-auto" />
        {children}
      </Container>
    </section>
  )
}
