import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, session, shell, type IpcMainInvokeEvent } from 'electron'
import { appendFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { IpcValidationError, validateExternalUrl, validateLegalVersions, validateModelId, validateOpenPath, validatePairingId, validatePipelineFile, validateStatePatch, type Api, type AppInfo, type Channel, type Events, type ModelTest } from '../shared/ipc'
import { Auth } from './auth'
import { log, setAppLog } from './log'
import { Watcher } from './jobs'
import { ModelManager } from './models'
import { recommend, runPcCheck } from './pccheck'
import { appRoot, configurePaths, getDirs, rendererRoot } from './paths'
import { runPrepare } from './prepare'
import { APP_ORIGIN, handleProtocol, registerScheme } from './protocol'
import { Sidecar } from './sidecar'
import { StateStore } from './state'
import { Site } from './site'
import { Updater } from './updater'
import { Vault } from './vault'

// ---------------------------------------------------------------------------
// Process setup (before ready)
// ---------------------------------------------------------------------------

const SMOKE_TEST = process.argv.includes('--smoke-test')
/** Windows GUI apps have no console, so CI reads the smoke report from a file. */
const SMOKE_REPORT = process.argv.find((arg) => arg.startsWith('--smoke-report='))?.slice('--smoke-report='.length)

const dirs = configurePaths()
setAppLog(path.join(dirs.logs, 'app.log'))
registerScheme()
app.setAppUserModelId('studio.clipfarm.desktop')

if (!SMOKE_TEST && !app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

const store = new StateStore(dirs.state)
const site = new Site(path.join(dirs.root, 'site.json'), process.env.CLIPFARM_SITE_ORIGIN)
const sidecar = new Sidecar({
  dirs,
  siteOrigin: () => site.get(),
  extraOrigins: process.env.CLIPFARM_EXTRA_ORIGINS?.split(',').filter(Boolean),
  whisperModel: () => store.get().selectedModel?.replace(/^whisper-/, '') ?? null,
})
const models = new ModelManager(dirs.models, dirs.downloads)
const updater = new Updater(() => focusWindow())
const watcher = new Watcher({
  pipeline: () => ({ port: sidecar.getStatus().state === 'ready' ? sidecar.getStatus().port : null, token: sidecar.token }),
  siteOrigin: () => site.get(),
  accountToken: () => auth.token(),
  window: () => mainWindow,
  onOpenStudio: () => {
    focusWindow()
    send('navigate', '/studio')
  },
  dataDir: dirs.root,
})

const pipelineCall = async <T>(route: string, init?: RequestInit): Promise<T> => {
  const status = sidecar.getStatus()
  if (status.state !== 'ready') throw new Error('The pipeline is not running.')
  const response = await fetch(`http://127.0.0.1:${status.port}${route}`, { ...init, headers: { authorization: `Bearer ${sidecar.token}`, 'content-type': 'application/json' } })
  const data = (await response.json()) as T & { detail?: string }
  if (!response.ok) throw new Error(data.detail ?? `The pipeline answered ${response.status}.`)
  return data
}
let mainWindow: BrowserWindow | null = null
let quitting = false

const vault = new Vault(dirs.vault)
const auth = new Auth(vault, () => site.get(), () => focusWindow())

/** Brings the window to the front, e.g. after signing in through the browser. */
function focusWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  // Windows only lets a background app take focus briefly; this is the reliable way.
  mainWindow.setAlwaysOnTop(true)
  mainWindow.focus()
  mainWindow.setAlwaysOnTop(false)
  app.focus({ steal: true })
}

const deepLink = (argv: string[]) => argv.find((arg) => arg.startsWith('clipfarm://'))

// ---------------------------------------------------------------------------
// IPC: typed, validated, and only from our own page
// ---------------------------------------------------------------------------

function fromApp(event: IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? ''
  return url === APP_ORIGIN || url.startsWith(`${APP_ORIGIN}/`)
}

function handle<C extends Channel>(channel: C, fn: (arg: unknown, event: IpcMainInvokeEvent) => Promise<Api[C]['result']> | Api[C]['result']) {
  ipcMain.handle(channel, async (event, arg) => {
    if (!fromApp(event)) throw new Error('Blocked: IPC from an unknown page')
    try {
      return await fn(arg, event)
    } catch (error) {
      if (error instanceof IpcValidationError) log(`ipc: rejected ${channel}: ${error.message}`)
      throw error
    }
  })
}

export function send<E extends keyof Events>(event: E, payload: Events[E]) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(event, payload)
}

handle('app:info', (): AppInfo => ({ version: app.getVersion(), platform: process.platform, packaged: app.isPackaged, siteOrigin: site.get(), dataDir: dirs.root }))
handle('state:get', () => store.get())
handle('state:update', (arg) => store.update(validateStatePatch(arg)))
handle('pipeline:status', () => sidecar.getStatus())
handle('pipeline:restart', () => {
  sidecar.restart()
  return sidecar.getStatus()
})
handle('prepare:run', () => runPrepare(getDirs(), sidecar, (line) => send('prepare:line', line)))
handle('shell:open-external', async (arg) => {
  await shell.openExternal(validateExternalUrl(arg))
  return true
})
handle('shell:open-path', async (arg) => {
  const which = validateOpenPath(arg)
  const target = which === 'logs' ? dirs.logs : which === 'clips' ? path.join(dirs.pipeline, 'jobs') : dirs.root
  return (await shell.openPath(target)) === ''
})

handle('terms:record', async (arg) => {
  const versions = validateLegalVersions(arg)
  // Trust the account, not the window: the server must already have stored these versions.
  const user = await auth.fetchMe()
  if (!user || user.termsVersion !== versions.terms || user.privacyVersion !== versions.privacy) throw new Error('The account has not recorded this acceptance yet.')
  return store.update({ termsAccepted: { ...versions, at: String(user.termsAcceptedAt ?? new Date().toISOString()) } })
})
handle('pccheck:run', async () => {
  const result = await runPcCheck({ dataDir: dirs.root, pipelinePort: () => (sidecar.getStatus().state === 'ready' ? sidecar.getStatus().port : null), pipelineToken: sidecar.token, emit: (item) => send('pccheck:item', item) })
  store.update({ pcCheck: { allowed: true, completedAt: new Date().toISOString(), recommendedModel: result.recommendation.model } })
  return result
})
handle('pccheck:skip', () => {
  const recommendation = recommend({ memoryGb: 0, cores: 0, gflops: 0 }, false)
  store.update({ pcCheck: { allowed: false, completedAt: null, recommendedModel: recommendation.model } })
  return recommendation
})
handle('models:list', () => models.list())
handle('models:download', (arg) => models.download(validateModelId(arg)))
handle('models:pause', (arg) => {
  models.pause(validateModelId(arg))
  return true
})
handle('models:remove', (arg) => {
  const id = validateModelId(arg)
  if (store.get().selectedModel === id) throw new Error('This is the model in use. Choose another model first.')
  models.remove(id)
  return models.list()
})
handle('models:test', async (arg) => {
  const id = validateModelId(arg)
  if (!models.isInstalled(id)) throw new Error('Download the model first.')
  const status = sidecar.getStatus()
  if (status.state !== 'ready') throw new Error('The pipeline is not running yet.')
  const response = await fetch(`http://127.0.0.1:${status.port}/models/test`, {
    method: 'POST',
    headers: { authorization: `Bearer ${sidecar.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: id.replace(/^whisper-/, '') }),
  })
  const data = (await response.json()) as ModelTest & { detail?: string }
  if (!response.ok) throw new Error(data.detail ?? `The model test failed (${response.status}).`)
  if (data.ok) {
    const changed = store.get().selectedModel !== id
    store.update({ selectedModel: id })
    // The pipeline reads the model at start: restart it so new jobs use this one.
    if (changed) sidecar.restart()
  }
  return data
})
handle('shell:show-file', (arg) => {
  // /files/<job>/clips/<n>/<name> → the file on disk, inside the jobs folder only.
  const relative = validatePipelineFile(arg).replace(/^\/files\//, '')
  const file = path.join(dirs.pipeline, 'jobs', ...relative.split('/'))
  if (!existsSync(file)) return false
  shell.showItemInFolder(file)
  return true
})
handle('pairing:list', () => pipelineCall('/pairings'))
handle('pairing:revoke', async (arg) => {
  await pipelineCall(`/pairings/${validatePairingId(arg)}`, { method: 'DELETE' })
  return pipelineCall('/pairings')
})
handle('update:status', () => updater.getStatus())
handle('update:check', () => updater.check())
handle('update:install', () => updater.install())
handle('jobs:keep-awake', () => watcher.isKeepingAwake())
handle('data:delete-local', async () => {
  const options = {
    type: 'warning' as const,
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Delete local data',
    message: 'Delete all clips, downloads, models and jobs on this PC?',
    detail: `This removes ${dirs.root} except your sign-in. Clips synced to your account stay in your account. This cannot be undone.`,
    noLink: true,
  }
  const { response } = mainWindow ? await dialog.showMessageBox(mainWindow, options) : await dialog.showMessageBox(options)
  if (response !== 0) return false
  await sidecar.stop()
  for (const folder of [dirs.pipeline, dirs.models, dirs.downloads, dirs.fonts]) rmSync(folder, { recursive: true, force: true })
  store.update({ step: 'preparing', selectedModel: null, pcCheck: { allowed: null, completedAt: null, recommendedModel: null } })
  log('data: local data deleted by the user')
  app.relaunch()
  app.exit(0)
  return true
})
handle('auth:status', () => auth.getStatus())
handle('auth:start', async () => {
  await Promise.race([site.resolve(), new Promise((resolve) => setTimeout(resolve, 4000))])
  return auth.start()
})
handle('auth:cancel', () => {
  auth.cancel()
  return auth.getStatus()
})
handle('auth:sign-out', async () => {
  await auth.signOut()
  return auth.getStatus()
})

sidecar.on('status', (status) => send('pipeline:status', status))
auth.on('status', (status) => send('auth:status', status))
models.on('progress', (progress) => send('models:progress', progress))
updater.on('status', (status) => send('update:status', status))

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: '#1c1a14',
    title: 'Clipfarm Studio',
    icon: path.join(appRoot(), 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(appRoot(), 'dist', 'preload', 'index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      // The intro sound plays on every start, before any click.
      autoplayPolicy: 'no-user-gesture-required',
      devTools: !app.isPackaged || process.env.CLIPFARM_DEVTOOLS === '1',
    },
  })
  mainWindow = window

  // Never leave the app origin inside the window; links open in the browser.
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) {
      event.preventDefault()
      if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    }
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    mainWindow = null
  })
  void window.loadURL(`${APP_ORIGIN}/`)
  return window
}

function lockDownSession() {
  const ses = session.defaultSession
  // Exports save straight to Downloads\Clipfarm (no save dialog), then say where.
  ses.on('will-download', (_event, item) => {
    const folder = path.join(app.getPath('downloads'), 'Clipfarm')
    mkdirSync(folder, { recursive: true })
    const name = item.getFilename().replace(/[<>:"/\\|?*]/g, '_')
    let target = path.join(folder, name)
    for (let n = 2; existsSync(target); n++) target = path.join(folder, name.replace(/(\.[^.]+)?$/, ` (${n})$1`))
    item.setSavePath(target)
    item.once('done', (_e, state) => {
      log(`download: ${state} ${path.basename(target)}`)
      if (state !== 'completed' || !Notification.isSupported()) return
      const note = new Notification({ title: 'Saved to Downloads', body: `${path.basename(target)} is in Downloads\\Clipfarm.` })
      note.on('click', () => shell.showItemInFolder(target))
      note.show()
    })
  })
  // Only notifications and clipboard writes; no camera, mic, geolocation, etc.
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'notifications' || permission === 'clipboard-sanitized-write'))
  ses.setPermissionCheckHandler((_wc, permission) => permission === 'notifications' || permission === 'clipboard-sanitized-write')
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

app.on('second-instance', (_event, argv) => {
  const link = deepLink(argv)
  if (link) void auth.handleDeepLink(link)
  focusWindow()
})
app.on('open-url', (event, url) => {
  event.preventDefault()
  void auth.handleDeepLink(url)
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  lockDownSession()
  handleProtocol(rendererRoot(), {
    siteOrigin: () => site.get(),
    accountToken: () => auth.token(),
    onAccountUnauthorized: () => auth.expire(),
    onAccountReachable: (reachable) => auth.setOnline(reachable),
    cachedUser: () => auth.cachedUser(),
    onUser: (user) => auth.cacheUser(user),
    pipelinePort: () => (sidecar.getStatus().state === 'ready' ? sidecar.getStatus().port : null),
    pipelineToken: () => sidecar.token,
    webModelsDir: () => path.join(dirs.models, 'web'),
  })

  if (SMOKE_TEST) {
    await runSmokeTest()
    return
  }

  registerProtocolClient()
  // Follow a move of the website to a new primary domain before anything talks to it (max 4 s; offline keeps the saved one).
  await Promise.race([site.resolve(), new Promise((resolve) => setTimeout(resolve, 4000))])
  // The pipeline starts with the app once first-run preparation has been done.
  const step = store.get().step
  if (!['welcome', 'usage', 'preparing'].includes(step)) sidecar.start()
  await auth.restore()
  createWindow()
  watcher.start()
  updater.start()
  const link = deepLink(process.argv)
  if (link) void auth.handleDeepLink(link)
  log(`app: started ${app.getVersion()} data=${dirs.root}`)
})

/** clipfarm:// links open this app. The installer registers it too; this covers development on Windows. */
function registerProtocolClient() {
  if (app.isPackaged) app.setAsDefaultProtocolClient('clipfarm')
  else if (process.platform === 'win32') app.setAsDefaultProtocolClient('clipfarm', process.execPath, [appRoot()])
}

app.on('window-all-closed', () => app.quit())

app.on('before-quit', (event) => {
  if (quitting) return
  quitting = true
  event.preventDefault()
  watcher.stop()
  // Quit normally once the pipeline has stopped, so a downloaded update can install on quit.
  void sidecar.stop().finally(() => app.quit())
})

/**
 * `--smoke-test`: used by CI on a real Windows install. Runs the preparation
 * steps headlessly, checks the pipeline answers, prints a JSON report and exits
 * with 0 only if everything passed.
 */
async function runSmokeTest() {
  const report: Record<string, unknown> = { version: app.getVersion(), dataDir: dirs.root }
  const out = (line: string) => {
    console.log(line)
    if (SMOKE_REPORT) appendFileSync(SMOKE_REPORT, `${line}\n`)
  }
  const result = await runPrepare(dirs, sidecar, (line) => {
    if (line.state === 'done' || line.state === 'failed') out(`[prepare] ${line.state.padEnd(6)} ${line.label}${line.detail ? ` — ${line.detail}` : ''}`)
  })
  report.prepare = result.ok
  let ok = result.ok
  if (ok) {
    const status = sidecar.getStatus()
    const system = await fetch(`http://127.0.0.1:${status.port}/system`, { headers: { authorization: `Bearer ${sidecar.token}` } }).then((r) => r.json() as Promise<{ ok: boolean; checks: Array<{ key: string; ok: boolean; required: boolean }> }>)
    report.system = system.checks.filter((check) => check.required).map((check) => `${check.key}:${check.ok ? 'ok' : 'MISSING'}`)
    const unauthorized = await fetch(`http://127.0.0.1:${status.port}/jobs`)
    report.tokenRequired = unauthorized.status === 401
    ok = ok && system.ok && unauthorized.status === 401
  }
  out(`SMOKE ${ok ? 'PASSED' : 'FAILED'} ${JSON.stringify(report)}`)
  await sidecar.stop()
  app.exit(ok ? 0 : 1)
}
