import { readFileSync, renameSync, writeFileSync } from 'node:fs'

import { FIRST_RUN_STEPS, type AppState } from '../shared/ipc'

export const DEFAULT_STATE: AppState = {
  step: 'welcome',
  usage: null,
  workMode: null,
  pcCheck: { allowed: null, completedAt: null, recommendedModel: null },
  selectedModel: null,
  sound: { enabled: true, volume: 0.6 },
  termsAccepted: null,
}

/** First-run progress and preferences, saved atomically after every change. */
export class StateStore {
  private value: AppState

  constructor(private readonly file: string) {
    this.value = this.load()
  }

  private load(): AppState {
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<AppState>
      const merged: AppState = { ...DEFAULT_STATE, ...raw, pcCheck: { ...DEFAULT_STATE.pcCheck, ...(raw.pcCheck ?? {}) }, sound: { ...DEFAULT_STATE.sound, ...(raw.sound ?? {}) } }
      if (!FIRST_RUN_STEPS.includes(merged.step)) merged.step = 'welcome'
      return merged
    } catch {
      return { ...DEFAULT_STATE }
    }
  }

  get(): AppState {
    return structuredClone(this.value)
  }

  update(patch: Partial<AppState>): AppState {
    this.value = { ...this.value, ...patch }
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(this.value, null, 2))
    renameSync(tmp, this.file)
    return this.get()
  }
}
