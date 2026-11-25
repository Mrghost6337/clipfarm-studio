import { BrowserWindow, dialog, net, Notification, powerSaveBlocker } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { log } from './log'

type Job = {
  id: string
  url: string
  status: string
  stage: string
  title: string | null
  thumbnail: string | null
  duration: number | null
  result: {
    video: { title: string; url: string; platform: string; thumbnail: string | null; duration: number | null; channel?: string | null; sourcePath?: string }
    transcript: { words: Array<{ start: number; end: number; text: string }> }
    clips: Array<{ id: string; title: string; start: number; end: number; score: number; caption: string; reason: string }>
  } | null
}

type PairRequest = { id: string; code: string; origin: string; name: string }

type Options = {
  pipeline: () => { port: number | null; token: string }
  siteOrigin: () => string
  accountToken: () => string | null
  window: () => BrowserWindow | null
  onOpenStudio: () => void
  dataDir: string
}

const POLL_MS = 2500
const ACTIVE = new Set(['queued', 'running'])

/**
 * Watches the local pipeline from the main process:
 * - keeps Windows awake while a job runs (powerSaveBlocker),
 * - shows a notification when a job finishes or fails,
 * - syncs a finished job's clip details to the account (the video stays on
 *   this PC), retrying later when offline,
 * - asks the user (native dialog) before a browser may use this pipeline.
 */
export class Watcher {
  private seen = new Map<string, string>()
  private blocker: number | null = null
  private timer: NodeJS.Timeout | null = null
  private asked = new Set<string>()
  private readonly syncFile: string
  private primed = false

  constructor(private readonly options: Options) {
    this.syncFile = path.join(options.dataDir, 'sync-queue.json')
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), POLL_MS)
    void this.tick()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.setAwake(false)
  }

  private async api<T>(route: string, init?: RequestInit): Promise<T | null> {
    const { port, token } = this.options.pipeline()
    if (!port) return null
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) } })
      return response.ok ? ((await response.json()) as T) : null
    } catch {
      return null
    }
  }

  private setAwake(on: boolean) {
    if (on && this.blocker === null) {
      this.blocker = powerSaveBlocker.start('prevent-app-suspension')
      log('jobs: keeping the PC awake while a job runs')
    } else if (!on && this.blocker !== null) {
      powerSaveBlocker.stop(this.blocker)
      this.blocker = null
      log('jobs: sleep allowed again')
    }
  }

  isKeepingAwake() {
    return this.blocker !== null && powerSaveBlocker.isStarted(this.blocker)
  }

  private async tick() {
    const jobs = await this.api<Job[]>('/jobs?limit=30')
    if (jobs) {
      this.setAwake(jobs.some((job) => ACTIVE.has(job.status)))
      for (const job of jobs) {
        const before = this.seen.get(job.id)
        this.seen.set(job.id, job.status)
        // The first poll only learns the current state; it does not notify about old jobs.
        if (!this.primed || before === job.status) continue
        if (job.status === 'done' && before && ACTIVE.has(before)) {
          this.notify('Clips ready', `${job.result?.clips.length ?? 0} clips from “${job.title ?? job.result?.video.title ?? 'your video'}”.`)
          this.queueSync(job.id)
        } else if (job.status === 'failed' && before && ACTIVE.has(before)) {
          this.notify('A job did not finish', `“${job.title ?? job.url}” failed. Open the Studio to see why and retry.`)
        }
      }
      this.primed = true
    }
    await this.flushSync()
    await this.checkPairing()
  }

  private notify(title: string, body: string) {
    log(`notify: ${title} — ${body}`)
    if (!Notification.isSupported()) return
    const notification = new Notification({ title, body, silent: false })
    notification.on('click', () => this.options.onOpenStudio())
    notification.show()
  }

  // ---------------------------------------------------------------- sync

  private readQueue(): string[] {
    try {
      return existsSync(this.syncFile) ? (JSON.parse(readFileSync(this.syncFile, 'utf8')) as string[]) : []
    } catch {
      return []
    }
  }

  private writeQueue(queue: string[]) {
    writeFileSync(this.syncFile, JSON.stringify([...new Set(queue)]))
  }

  queueSync(jobId: string) {
    this.writeQueue([...this.readQueue(), jobId])
  }

  /** Sends the details of finished jobs to the account. Only metadata: titles, times, scores, captions. */
  async syncJob(jobId: string): Promise<boolean> {
    const token = this.options.accountToken()
    if (!token) return false
    const job = await this.api<Job>(`/jobs/${jobId}`)
    if (!job?.result) return true // nothing to sync (deleted or not finished): drop it
    const words = job.result.transcript?.words ?? []
    const video = job.result.video
    const isWeb = /^https?:\/\//.test(job.url)
    const body = {
      jobId,
      url: isWeb ? job.url : '',
      fileName: isWeb ? '' : path.basename(job.url),
      title: video.title ?? job.title,
      author: video.channel ?? null,
      thumbnail: video.thumbnail,
      duration: video.duration ?? job.duration,
      clips: job.result.clips.map((clip) => {
        const inside = words.filter((word) => word.start >= clip.start && word.end <= clip.end)
        // Caption cues: groups of up to 4 words, like the burned-in captions.
        const cues: Array<{ start: number; end: number; text: string }> = []
        for (let i = 0; i < inside.length; i += 4) {
          const group = inside.slice(i, i + 4)
          cues.push({ start: group[0].start - clip.start, end: group[group.length - 1].end - clip.start, text: group.map((word) => word.text.trim()).join(' ') })
        }
        return { title: clip.title, start: clip.start, end: clip.end, score: clip.score, excerpt: inside.map((word) => word.text.trim()).join(' ').slice(0, 600), cues }
      }),
    }
    try {
      const response = await net.fetch(`${this.options.siteOrigin()}/api/clips/import`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        bypassCustomProtocolHandlers: true,
      } as RequestInit)
      if (response.ok) log(`sync: job ${jobId} synced`)
      else log(`sync: job ${jobId} answered ${response.status}`)
      // 4xx other than auth will not get better by retrying.
      return response.ok || (response.status >= 400 && response.status < 500 && response.status !== 401)
    } catch {
      return false // offline: keep it queued
    }
  }

  private async flushSync() {
    const queue = this.readQueue()
    if (!queue.length) return
    const left: string[] = []
    for (const id of queue) if (!(await this.syncJob(id))) left.push(id)
    if (left.length !== queue.length) this.writeQueue(left)
  }

  // ------------------------------------------------------------- pairing

  /** A browser asked to use this PC's pipeline: ask the user, once per request. */
  private async checkPairing() {
    const pending = await this.api<PairRequest[]>('/pair/requests')
    for (const request of pending ?? []) {
      if (this.asked.has(request.id)) continue
      this.asked.add(request.id)
      const window = this.options.window()
      const options = {
        type: 'question' as const,
        buttons: ['Allow', 'Deny'],
        defaultId: 1,
        cancelId: 1,
        title: 'Connect a browser to Clipfarm',
        message: `Allow ${request.origin} to use Clipfarm on this PC?`,
        detail: `${request.name} asked to connect. Code: ${request.code}\n\nOnly allow this if you just clicked “Connect this browser” on the Clipfarm website and the code matches. You can disconnect it later in Settings.`,
        noLink: true,
      }
      const { response } = window ? await dialog.showMessageBox(window, options) : await dialog.showMessageBox(options)
      await this.api(`/pair/requests/${response === 0 ? 'approve' : 'deny'}`, { method: 'POST', body: JSON.stringify({ code: request.code }) })
      log(`pairing: ${response === 0 ? 'approved' : 'denied'} ${request.origin}`)
    }
  }
}
