import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

import type { Api, Channel, Events } from '../shared/ipc'

// The only bridge between the page and the main process. It exposes named
// calls and event subscriptions; no ipcRenderer, Node or Electron objects leak.

const ALLOWED_EVENTS: ReadonlyArray<keyof Events> = ['pipeline:status', 'prepare:line']

const invoke = <C extends Channel>(channel: C, arg?: Api[C]['arg']) => ipcRenderer.invoke(channel, arg) as Promise<Api[C]['result']>

function on<E extends keyof Events>(event: E, listener: (payload: Events[E]) => void) {
  if (!ALLOWED_EVENTS.includes(event)) throw new Error('Unknown event')
  const wrapped = (_: IpcRendererEvent, payload: Events[E]) => listener(payload)
  ipcRenderer.on(event, wrapped)
  return () => {
    ipcRenderer.removeListener(event, wrapped)
  }
}

const bridge = {
  invoke,
  on,
}

export type Bridge = typeof bridge

contextBridge.exposeInMainWorld('clipfarm', bridge)
