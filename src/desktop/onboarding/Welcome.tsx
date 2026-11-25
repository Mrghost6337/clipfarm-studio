import { Volume2, VolumeX } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import { ArrowButton } from '../../components/Button'
import { LogoMark } from '../../components/Logo'
import { Modal } from '../../components/Overlay'
import { Scribble } from '../../components/Scribble'
import type { SoundSettings } from '../bridge'
import { Wall, useWallManifest } from './Wall'

const ease = [0.22, 1, 0.36, 1] as const

/** Step 1: the cover wall, the mark and "Start free". */
export function Welcome({ sound, onSound, onStart }: { sound: SoundSettings; onSound: (next: SoundSettings) => void; onStart: () => void }) {
  const covers = useWallManifest()
  const [credits, setCredits] = useState(false)
  const sources = covers ? [...new Map(covers.map((cover) => [cover.source.title, cover.source])).values()] : []

  return (
    <div className="relative min-h-svh overflow-hidden bg-ink text-white">
      {covers && covers.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease }}>
          <Wall covers={covers} />
        </motion.div>
      )}
      {/* Ink vignette: dark in the middle so the mark and button stay readable. */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_52%_48%_at_50%_50%,rgb(28_26_20/0.97)_0%,rgb(28_26_20/0.86)_45%,rgb(28_26_20/0.45)_78%,rgb(28_26_20/0.25)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink to-transparent" />

      <button
        type="button"
        onClick={() => onSound({ ...sound, enabled: !sound.enabled })}
        aria-label={sound.enabled ? 'Mute sounds' : 'Turn sounds on'}
        aria-pressed={!sound.enabled}
        className="round absolute top-6 right-6 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white/85 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
      >
        {sound.enabled ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
      </button>

      <main className="relative z-[1] grid min-h-svh place-items-center px-8">
        <div className="flex flex-col items-center text-center">
          <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease }} className="grid size-20 place-items-center rounded-[24px] bg-white/[0.07] text-apricot">
            <LogoMark className="size-12" />
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease }} className="mt-6 text-[3.5rem] leading-[1.04] font-semibold tracking-[-0.04em]">
            Clipfarm Studio
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7, ease }} className="mt-3 max-w-md text-[1.0625rem] leading-relaxed text-white/70">
            Long streams in. Vertical, captioned clips out, made on your own PC.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.7, ease }} className="relative mt-10">
            <ArrowButton size="lg" tone="light" onClick={onStart} autoFocus>
              Start free
            </ArrowButton>
            <span className="absolute top-1/2 left-[calc(100%+10px)] -translate-y-1/2 [&_*]:!text-apricot">
              <Scribble note="It’s free!" />
            </span>
          </motion.div>
        </div>
      </main>

      {sources.length > 0 && (
        <footer className="absolute inset-x-0 bottom-0 z-[1] flex items-center justify-center gap-2 px-8 pb-5 text-center text-[0.75rem] text-white/55">
          <span>
            Covers: clips made by the Clipfarm pipeline from {sources.map((source) => source.title).join(', ')}. Not an endorsement.
          </span>
          <button type="button" onClick={() => setCredits(true)} className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-white/75 underline decoration-white/30 underline-offset-4 hover:text-white">
            Credits
          </button>
        </footer>
      )}

      <Modal open={credits} onClose={() => setCredits(false)} title="Cover credits" description="Every cover is a vertical clip rendered by Clipfarm from an openly licensed film.">
        <ul className="flex flex-col gap-3 text-[0.9rem] text-body">
          {sources.map((source) => (
            <li key={source.title}>
              <span className="font-semibold text-ink">{source.title}</span> by {source.author}.{' '}
              {source.license && (
                <a href={source.licenseUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-ink underline underline-offset-4">
                  {source.license}
                </a>
              )}
              {' · '}
              <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-accent-ink underline underline-offset-4">
                Source
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.8rem] text-muted">Changes: cut to short vertical clips, cropped to 9:16, captions added by Clipfarm. The filmmakers do not endorse Clipfarm.</p>
      </Modal>
    </div>
  )
}
