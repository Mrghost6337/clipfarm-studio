import { app, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import { EventEmitter } from 'node:events'

import type { UpdateStatus } from '../shared/ipc'
import { log } from './log'
import { notesText } from './releaseNotes'

/** How often a running app looks for a new release (one small latest.yml request). */
const CHECK_EVERY = 30 * 60 * 1000
const FIRST_CHECK = 10_000

/**
 * Auto-update from the public releases repository configured in
 * electron-builder.yml (publish: github). No token ships in the app: it only
 * reads public releases.
 *
 * Flow: a new release is found → it downloads in the background (only the
 * changed blocks when possible) → a Windows notification and an in-app prompt
 * offer "Install now" or "Later". "Later" installs it silently the next time
 * the app quits, so nobody has to download and run the installer again.
 */
export class Updater extends EventEmitter {
  private status: UpdateStatus = {
    state: app.isPackaged ? 'idle' : 'unavailable',
    version: null,
    progress: null,
    notes: null,
    error: app.isPackaged ? null : 'Updates are checked by the installed app, not when running from source.',
    checkedAt: null,
  }
  private timer: NodeJS.Timeout | null = null
  private notified: string | null = null

  constructor(private readonly onOpen: () => void = () => undefined) {
    super()
    if (!app.isPackaged) return
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    autoUpdater.logger = { info: (m: unknown) => log('update:', String(m)), warn: (m: unknown) => log('update warn:', String(m)), error: (m: unknown) => log('update error:', String(m)), debug: () => undefined }
    autoUpdater.on('checking-for-update', () => {
      // A download in progress or a finished one keeps its state while re-checking.
      if (this.status.state !== 'downloading' && this.status.state !== 'ready') this.set({ state: 'checking', error: null })
    })
    autoUpdater.on('update-available', (info) => this.set({ state: 'downloading', version: info.version, progress: 0, notes: notesText(info.releaseNotes) }))
    autoUpdater.on('update-not-available', () => this.set({ state: 'none', checkedAt: new Date().toISOString() }))
    autoUpdater.on('download-progress', (progress) => this.set({ state: 'downloading', progress: progress.percent / 100 }))
    autoUpdater.on('update-downloaded', (info) => {
      this.set({ state: 'ready', version: info.version, progress: 1, notes: notesText(info.releaseNotes) ?? this.status.notes, checkedAt: new Date().toISOString() })
      this.notify(info.version)
    })
    autoUpdater.on('error', (error) => {
      // A failed check while an update waits to be installed must not hide it.
      if (this.status.state === 'ready') return log('update: check failed while an update is ready', String(error))
      this.set({ state: 'error', error: friendly(error), checkedAt: new Date().toISOString() })
    })
  }

  getStatus() {
    return { ...this.status }
  }

  private set(patch: Partial<UpdateStatus>) {
    this.status = { ...this.status, ...patch }
    this.emit('status', this.getStatus())
  }

  private notify(version: string) {
    if (this.notified === version || !Notification.isSupported()) return
    this.notified = version
    const notification = new Notification({ title: 'Update ready', body: `Clipfarm Studio ${version} is ready. Open the app to install it now, or it installs when you close the app.` })
    notification.on('click', () => this.onOpen())
    notification.show()
  }

  start() {
    if (!app.isPackaged || this.timer) return
    setTimeout(() => void this.check(), FIRST_CHECK)
    this.timer = setInterval(() => void this.check(), CHECK_EVERY)
  }

  async check() {
    if (!app.isPackaged || this.status.state === 'downloading' || this.status.state === 'ready') return this.getStatus()
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.set({ state: 'error', error: friendly(error) })
    }
    return this.getStatus()
  }

  /** Quits, installs silently and starts the new version. */
  install() {
    if (this.status.state !== 'ready') return false
    log(`update: installing ${this.status.version} now`)
    // isSilent: no installer window; isForceRunAfter: reopen the app afterwards.
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
    return true
  }
}

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/404|Not Found|Unable to find latest version|No published versions/i.test(message)) return 'No release has been published yet.'
  if (/ENOTFOUND|ERR_INTERNET|ERR_NAME|network|ETIMEDOUT/i.test(message)) return 'You appear to be offline. Updates are checked again later.'
  return message.split('\n')[0].slice(0, 200)
}
