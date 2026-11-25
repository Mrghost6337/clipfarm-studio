import { motion } from 'motion/react'
import { useState } from 'react'

import { ArrowButton } from '../../components/Button'
import { useAuth } from '../../lib/auth'
import { playSound } from '../sound'
import { Avatar } from './Avatar'

/** Step 9: the hand-off into the app. */
export function Ready({ onStart }: { onStart: () => void }) {
  const { user } = useAuth()
  const [leaving, setLeaving] = useState(false)
  const first = user?.name.split(' ')[0] ?? ''

  function start() {
    setLeaving(true)
    void playSound('start')
    window.setTimeout(onStart, 420)
  }

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-ink text-white">
      <motion.div aria-hidden className="absolute inset-x-[-10%] bottom-0 h-[70%]" animate={{ opacity: leaving ? 1 : 0.75, scale: leaving ? 1.15 : 1 }} transition={{ duration: 0.5 }}>
        <div className="hero-glow size-full opacity-60" />
      </motion.div>
      <motion.div className="relative flex flex-col items-center gap-6 text-center" animate={{ opacity: leaving ? 0 : 1, y: leaving ? -16 : 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        {user && <Avatar name={user.name} email={user.email} url={user.avatarUrl} size={84} className="ring-4 ring-white/15" />}
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl text-[3.4rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">
          You’re ready to go{first ? `, ${first}` : ''}
        </motion.h1>
        <p className="text-[1.0625rem] text-white/70">Paste a link or drop a video, and Clipfarm does the rest.</p>
        <ArrowButton size="lg" tone="light" onClick={start} autoFocus>
          Start
        </ArrowButton>
      </motion.div>
    </div>
  )
}
