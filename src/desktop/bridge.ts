// Typed access to the desktop bridge exposed by desktop/src/preload. Only
// present inside the Windows app; the website never imports this file.
import type { Api, Channel, Events } from '../../desktop/src/shared/ipc'

export type * from '../../desktop/src/shared/ipc'

type Bridge = {
  invoke<C extends Channel>(channel: C, arg?: Api[C]['arg']): Promise<Api[C]['result']>
  on<E extends keyof Events>(event: E, listener: (payload: Events[E]) => void): () => void
}

declare global {
  interface Window {
    clipfarm?: Bridge
  }
}

export const isDesktop = () => typeof window !== 'undefined' && !!window.clipfarm

export function bridge(): Bridge {
  if (!window.clipfarm) throw new Error('The desktop bridge is not available.')
  return window.clipfarm
}

export const invoke = <C extends Channel>(channel: C, arg?: Api[C]['arg']) => bridge().invoke(channel, arg)
export const on = <E extends keyof Events>(event: E, listener: (payload: Events[E]) => void) => bridge().on(event, listener)
