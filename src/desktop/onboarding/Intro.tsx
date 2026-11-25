import { motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'

import { LogoMark } from '../../components/Logo'
import { playSound } from '../sound'

const HIT = 1.05 // seconds: the moment the logo lands, matched to intro.ogg

/**
 * The signature start on every launch: the mark grows out of the dark and
 * lands on the beat of the intro sound, then the name appears.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  useEffect(() => {
    void playSound('intro')
    const timer = window.setTimeout(onDone, reduce ? 900 : 2300)
    return () => window.clearTimeout(timer)
  }, [onDone, reduce])

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-ink" aria-label="Clipfarm Studio is starting" role="img">
      <motion.div
        aria-hidden
        className="absolute size-[640px] rounded-full bg-[radial-gradient(circle,rgb(245_183_101/0.45),transparent_62%)]"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0, 1, 0.55], scale: [0.4, 0.4, 1.15, 1] }}
        transition={{ duration: 2.1, times: [0, HIT / 2.1 - 0.02, HIT / 2.1 + 0.06, 1], ease: 'easeOut' }}
      />
      <div className="relative flex flex-col items-center gap-5">
        <motion.span
          className="grid size-24 place-items-center rounded-[28px] bg-white/[0.06] text-apricot shadow-[0_30px_80px_-30px_rgb(245_183_101/0.6)]"
          initial={{ opacity: 0, scale: 0.55, y: 18, rotate: -8 }}
          animate={{ opacity: 1, scale: [0.55, 0.92, 1.06, 1], y: 0, rotate: 0 }}
          transition={{ duration: HIT + 0.35, times: [0, 0.72, 0.84, 1], ease: [0.22, 1, 0.36, 1] }}
        >
          <LogoMark className="size-14" />
        </motion.span>
        <motion.span
          className="text-[2.1rem] leading-none font-bold tracking-[-0.045em] text-white"
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: HIT + 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          Clipfarm Studio
        </motion.span>
      </div>
    </div>
  )
}
