import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { EventEmitter } from 'node:events'

import type { UpdateStatus } from '../shared/ipc'
import { log } from './log'

const SIX_HOURS = 6 * 60 * 60 * 1000

/**
 * Auto-update from the public releases repository configured in
 * electron-builder.yml (publish: github). No token ships in the app: it only
 * reads public releases. Updates download in the background and install on
 * the next restart, or right away when the user clicks "Restart to update".
 */
export class Updater extends EventEmitter {
  private status: UpdateStatus = { state: app.isPackaged ? 'idle' : 'unavailable', version: null, progress: null, error: app.isPackaged ? null : 'Updates are checked by the installed app, not when running from source.', checkedAt: null }
  private timer: NodeJS.Timeout | null = null

  constructor() {
    super()
    if (!app.isPackaged) return
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = { info: (m: unknown) => log('update:', String(m)), warn: (m: unknown) => log('update warn:', String(m)), error: (m: unknown) => log('update error:', String(m)), debug: () => undefined }
    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking', error: null }))
    autoUpdater.on('update-available', (info) => this.set({ state: 'downloading', version: info.version, progress: 0 }))
    autoUpdater.on('update-not-available', () => this.set({ state: 'none', checkedAt: new Date().toISOString() }))
    autoUpdater.on('download-progress', (progress) => this.set({ state: 'downloading', progress: progress.percent / 100 }))
    autoUpdater.on('update-downloaded', (info) => this.set({ state: 'ready', version: info.version, progress: 1, checkedAt: new Date().toISOString() }))
    autoUpdater.on('error', (error) => this.set({ state: 'error', error: friendly(error), checkedAt: new Date().toISOString() }))
  }

  getStatus() {
    return { ...this.status }
  }

  private set(patch: Partial<UpdateStatus>) {
    this.status = { ...this.status, ...patch }
    this.emit('status', this.getStatus())
  }

  start() {
    if (!app.isPackaged || this.timer) return
    setTimeout(() => void this.check(), 15_000)
    this.timer = setInterval(() => void this.check(), SIX_HOURS)
  }

  async check() {
    if (!app.isPackaged) return this.getStatus()
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.set({ state: 'error', error: friendly(error) })
    }
    return this.getStatus()
  }

  install() {
    if (this.status.state === 'ready') autoUpdater.quitAndInstall(false, true)
  }
}

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/404|Not Found|Unable to find latest version|No published versions/i.test(message)) return 'No release has been published yet.'
  if (/ENOTFOUND|ERR_INTERNET|ERR_NAME|network|ETIMEDOUT/i.test(message)) return 'You appear to be offline. Updates are checked again later.'
  return message.split('\n')[0].slice(0, 200)
}
