import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import type { PipelineStatus } from '../shared/ipc'
import { log, LogFile } from './log'
import type { Dirs } from './paths'
import { sidecarLayout } from './paths'

const HEALTH_TIMEOUT_MS = 90_000
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 20_000]
const MAX_RESTARTS_IN_WINDOW = 5
const RESTART_WINDOW_MS = 3 * 60_000

type Options = { dirs: Dirs; siteOrigin: string; extraOrigins?: string[] }

/**
 * Runs the Python pipeline as a child process on 127.0.0.1, with a fresh
 * launch token every start. Restarts it after a crash with backoff, gives up
 * after five crashes in three minutes, and stops the whole process tree on quit.
 */
export class Sidecar extends EventEmitter {
  readonly token = randomBytes(32).toString('base64url')
  private child: ChildProcess | null = null
  private status: PipelineStatus
  private crashes: number[] = []
  private stopping = false
  private restartTimer: NodeJS.Timeout | null = null
  private readonly out: LogFile

  constructor(private readonly options: Options) {
    super()
    this.out = new LogFile(path.join(options.dirs.logs, 'pipeline.log'))
    this.status = { state: 'stopped', port: null, restarts: 0, error: null, logFile: this.out.file }
  }

  getStatus(): PipelineStatus {
    return { ...this.status }
  }

  private set(patch: Partial<PipelineStatus>) {
    this.status = { ...this.status, ...patch }
    this.emit('status', this.getStatus())
  }

  env(): NodeJS.ProcessEnv {
    const layout = sidecarLayout()
    const { dirs } = this.options
    const exe = process.platform === 'win32' ? '.exe' : ''
    const env: NodeJS.ProcessEnv = {
      // A clean environment: only what the pipeline needs, plus the OS basics.
      SYSTEMROOT: process.env.SYSTEMROOT,
      WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE,
      LOCALAPPDATA: process.env.LOCALAPPDATA,
      APPDATA: process.env.APPDATA,
      LANG: process.env.LANG,
      PATH: [layout.bin, process.env.PATH ?? ''].join(path.delimiter),
      PYTHONUNBUFFERED: '1',
      PYTHONNOUSERSITE: '1',
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONIOENCODING: 'utf-8',
      HF_HUB_OFFLINE: '1',
      HF_HUB_DISABLE_TELEMETRY: '1',
      PIPELINE_MANAGED: '1',
      PIPELINE_HOST_APP: 'desktop',
      PIPELINE_LAUNCH_TOKEN: this.token,
      PIPELINE_DATA: dirs.pipeline,
      PIPELINE_MODELS: dirs.models,
      PIPELINE_FONTS: existsSync(dirs.fonts) ? dirs.fonts : layout.fonts,
      PIPELINE_SECRETS: dirs.secrets,
      PIPELINE_ENV_FILE: path.join(dirs.root, 'pipeline.env'),
      FFMPEG_PATH: path.join(layout.bin, `ffmpeg${exe}`),
      FFPROBE_PATH: path.join(layout.bin, `ffprobe${exe}`),
      CLIPFARM_SITE_ORIGIN: this.options.siteOrigin,
      PIPELINE_ALLOWED_ORIGINS: (this.options.extraOrigins ?? []).join(','),
    }
    if (!existsSync(env.FFMPEG_PATH!)) delete env.FFMPEG_PATH
    if (!existsSync(env.FFPROBE_PATH!)) delete env.FFPROBE_PATH
    for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key]
    return env
  }

  start() {
    if (this.child) return
    this.stopping = false
    const layout = sidecarLayout()
    for (const folder of [this.options.dirs.pipeline, this.options.dirs.models, this.options.dirs.secrets]) mkdirSync(folder, { recursive: true })
    if (!existsSync(layout.python)) {
      this.set({ state: 'failed', error: `The pipeline runtime is missing (${layout.python}). Reinstall Clipfarm Studio.` })
      return
    }
    this.set({ state: this.status.restarts ? 'restarting' : 'starting', port: null, error: null })
    log('sidecar: starting', layout.python)
    const child = spawn(layout.python, ['-m', 'pipeline.cli', 'serve'], { cwd: layout.cwd, env: this.env(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    this.child = child
    const started = Date.now()
    let buffer = ''
    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      this.out.write(text)
      buffer = (buffer + text).slice(-4000)
      const match = /Clipfarm pipeline on http:\/\/127\.0\.0\.1:(\d+)/.exec(buffer)
      if (match && this.status.port === null) {
        const port = Number(match[1])
        this.status.port = port
        void this.waitHealthy(port, started, child)
      }
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('error', (error) => {
      log('sidecar: spawn error', error)
      this.set({ error: error.message })
    })
    child.on('exit', (code, signal) => {
      if (this.child === child) this.child = null
      log(`sidecar: exited code=${code} signal=${signal}`)
      if (this.stopping) {
        this.set({ state: 'stopped', port: null })
        return
      }
      this.scheduleRestart(`The pipeline stopped unexpectedly (exit code ${code ?? signal}).`)
    })
  }

  private async waitHealthy(port: number, started: number, child: ChildProcess) {
    while (this.child === child && Date.now() - started < HEALTH_TIMEOUT_MS) {
      if (await this.health(port)) {
        this.set({ state: 'ready', port, error: null })
        log(`sidecar: ready on ${port}`)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    if (this.child === child) {
      log('sidecar: health check timed out')
      this.set({ error: 'The pipeline did not answer its health check.' })
      this.kill(child)
    }
  }

  async health(port = this.status.port): Promise<boolean> {
    if (!port) return false
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) })
      const data = (await response.json()) as { service?: string }
      return response.ok && data.service === 'clipfarm-pipeline'
    } catch {
      return false
    }
  }

  private scheduleRestart(reason: string) {
    const now = Date.now()
    this.crashes = [...this.crashes.filter((at) => now - at < RESTART_WINDOW_MS), now]
    if (this.crashes.length > MAX_RESTARTS_IN_WINDOW) {
      this.set({ state: 'failed', port: null, error: `${reason} It crashed ${this.crashes.length} times in a row, so it was not restarted again.` })
      return
    }
    const delay = BACKOFF_MS[Math.min(this.crashes.length - 1, BACKOFF_MS.length - 1)]
    this.set({ state: 'restarting', port: null, error: reason, restarts: this.status.restarts + 1 })
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.start()
    }, delay)
  }

  /** Manual restart from the UI (also after "failed"). */
  restart() {
    this.crashes = []
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.restartTimer = null
    const child = this.child
    if (child) {
      this.stopping = true
      child.once('exit', () => {
        this.stopping = false
        this.start()
      })
      this.kill(child)
    } else {
      this.start()
    }
  }

  private kill(child: ChildProcess) {
    if (child.exitCode !== null || child.pid === undefined) return
    if (process.platform === 'win32') {
      // Kill the whole tree: uvicorn and any ffmpeg it spawned.
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
    } else {
      child.kill('SIGTERM')
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
      }, 5000).unref()
    }
  }

  /** Stops the pipeline and waits for it to exit (used on quit). */
  async stop(): Promise<void> {
    this.stopping = true
    if (this.restartTimer) clearTimeout(this.restartTimer)
    const child = this.child
    if (!child || child.exitCode !== null) {
      this.set({ state: 'stopped', port: null })
      return
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 7000)
      child.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
      this.kill(child)
    })
  }
}
