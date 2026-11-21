import { motion } from 'motion/react'
import type { ReactNode } from 'react'

/** Fades children up once as they scroll into view. Reduced motion skips the movement (MotionConfig). */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -60px 0px' }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </Tag>
  )
}
