import { app, BrowserWindow, ipcMain, Menu, session, shell, type IpcMainInvokeEvent } from 'electron'
import { appendFileSync } from 'node:fs'
import path from 'node:path'

import { IpcValidationError, validateExternalUrl, validateOpenPath, validateStatePatch, type Api, type AppInfo, type Channel, type Events } from '../shared/ipc'
import { Auth } from './auth'
import { log, setAppLog } from './log'
import { appRoot, configurePaths, getDirs, rendererRoot } from './paths'
import { runPrepare } from './prepare'
import { APP_ORIGIN, handleProtocol, registerScheme } from './protocol'
import { Sidecar } from './sidecar'
import { StateStore } from './state'
import { Vault } from './vault'

// ---------------------------------------------------------------------------
// Process setup (before ready)
// ---------------------------------------------------------------------------

const SITE_ORIGIN = (process.env.CLIPFARM_SITE_ORIGIN || 'https://fractional-hr-34cett.freebuff.site').replace(/\/$/, '')
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
const sidecar = new Sidecar({ dirs, siteOrigin: SITE_ORIGIN, extraOrigins: process.env.CLIPFARM_EXTRA_ORIGINS?.split(',').filter(Boolean) })
let mainWindow: BrowserWindow | null = null
let quitting = false

const vault = new Vault(dirs.vault)
const auth = new Auth(vault, () => SITE_ORIGIN, () => focusWindow())

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

handle('app:info', (): AppInfo => ({ version: app.getVersion(), platform: process.platform, packaged: app.isPackaged, siteOrigin: SITE_ORIGIN, dataDir: dirs.root }))
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

handle('auth:status', () => auth.getStatus())
handle('auth:start', () => auth.start())
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
    siteOrigin: () => SITE_ORIGIN,
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
  // The pipeline starts with the app once first-run preparation has been done.
  const step = store.get().step
  if (!['welcome', 'usage', 'preparing'].includes(step)) sidecar.start()
  await auth.restore()
  createWindow()
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
  void sidecar.stop().finally(() => app.exit(0))
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
