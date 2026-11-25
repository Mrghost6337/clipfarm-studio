// Interface sounds for the desktop app. Original, synthesised audio
// (desktop/scripts/make-sounds.py, licence in desktop/assets/sounds/).
// One sound at a time: a new one stops the previous. Nothing loops.

export type SoundName = 'intro' | 'check' | 'ready' | 'start'

let current: HTMLAudioElement | null = null
let settings = { enabled: true, volume: 0.6 }

export function configureSound(next: { enabled: boolean; volume: number }) {
  settings = next
  if (!next.enabled) stopSound()
  else if (current) current.volume = next.volume
}

export function stopSound() {
  if (!current) return
  current.pause()
  current = null
}

/** Plays a cue if sound is on. Resolves when it starts (or immediately when muted). */
export async function playSound(name: SoundName) {
  if (!settings.enabled || settings.volume <= 0) return
  stopSound()
  const audio = new Audio(`/sounds/${name}.ogg`)
  audio.volume = settings.volume
  audio.loop = false
  current = audio
  audio.addEventListener('ended', () => {
    if (current === audio) current = null
  })
  try {
    await audio.play()
  } catch {
    /* the window may not allow audio yet; the cue is simply skipped */
  }
}
