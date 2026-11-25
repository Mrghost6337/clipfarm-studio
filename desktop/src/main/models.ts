import { net } from 'electron'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, statfsSync } from 'node:fs'
import path from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import type { ModelInfo, ModelProgress } from '../shared/ipc'
import { log } from './log'
import manifest from './models.json'

type ManifestModel = (typeof manifest.models)[number]

const SPEED_WINDOW_MS = 3000
const DISK_MARGIN = 200 * 1024 * 1024

function sha256(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Downloads Whisper models from Hugging Face at a pinned revision.
 * - Byte-range resume: partial files stay in downloads/<id>/ across pauses and restarts.
 * - Checks free disk space before starting.
 * - Verifies every file's size and SHA-256, then installs the whole folder
 *   with one rename (models/whisper/<name>), so a model is either complete or absent.
 */
export class ModelManager extends EventEmitter {
  private active = new Map<string, AbortController>()
  private progress = new Map<string, ModelProgress>()

  constructor(
    private readonly modelsDir: string,
    private readonly downloadsDir: string,
  ) {
    super()
  }

  private model(id: string): ManifestModel {
    const model = manifest.models.find((item) => item.id === id)
    if (!model) throw new Error('Unknown model')
    return model
  }

  installDir(model: ManifestModel) {
    return path.join(this.modelsDir, 'whisper', model.name)
  }

  private staging(model: ManifestModel) {
    return path.join(this.downloadsDir, model.id)
  }

  private partialBytes(model: ManifestModel) {
    const dir = this.staging(model)
    if (!existsSync(dir)) return 0
    return model.files.reduce((sum, file) => {
      const done = path.join(dir, file.path)
      const part = `${done}.part`
      if (existsSync(done)) return sum + statSync(done).size
      if (existsSync(part)) return sum + statSync(part).size
      return sum
    }, 0)
  }

  isInstalled(id: string) {
    const model = this.model(id)
    const dir = this.installDir(model)
    return model.files.every((file) => existsSync(path.join(dir, file.path)) && statSync(path.join(dir, file.path)).size === file.size)
  }

  list(): ModelInfo[] {
    return manifest.models.map((model) => {
      const installed = this.isInstalled(model.id)
      const current = this.progress.get(model.id)
      const partial = installed ? 0 : this.partialBytes(model)
      return {
        id: model.id,
        name: model.name,
        label: model.label,
        bytes: model.bytes,
        license: model.license,
        source: `https://huggingface.co/${model.repo}`,
        installed,
        progress: current ?? (partial > 0 ? { id: model.id, state: 'paused', received: partial, total: model.bytes, speed: 0, eta: null, error: null } : null),
      }
    })
  }

  private emitProgress(update: ModelProgress) {
    this.progress.set(update.id, update)
    this.emit('progress', update)
  }

  freeBytes() {
    mkdirSync(this.downloadsDir, { recursive: true })
    const stats = statfsSync(this.downloadsDir)
    return Number(stats.bavail) * Number(stats.bsize)
  }

  pause(id: string) {
    this.active.get(id)?.abort()
  }

  /** Deletes an installed model and any partial download. */
  remove(id: string) {
    const model = this.model(id)
    this.pause(id)
    rmSync(this.installDir(model), { recursive: true, force: true })
    rmSync(this.staging(model), { recursive: true, force: true })
    this.progress.delete(id)
    this.emit('progress', { id, state: 'idle', received: 0, total: model.bytes, speed: 0, eta: null, error: null } satisfies ModelProgress)
  }

  async download(id: string): Promise<ModelProgress> {
    const model = this.model(id)
    if (this.active.has(id)) return this.progress.get(id)!
    if (this.isInstalled(id)) {
      const done: ModelProgress = { id, state: 'installed', received: model.bytes, total: model.bytes, speed: 0, eta: 0, error: null }
      this.emitProgress(done)
      return done
    }
    const staging = this.staging(model)
    mkdirSync(staging, { recursive: true })
    const already = this.partialBytes(model)
    const needed = model.bytes - already + DISK_MARGIN
    const free = this.freeBytes()
    if (free < needed) {
      const failed: ModelProgress = { id, state: 'error', received: already, total: model.bytes, speed: 0, eta: null, error: `Not enough free disk space: ${(needed / 1e6).toFixed(0)} MB needed, ${(free / 1e6).toFixed(0)} MB free.` }
      this.emitProgress(failed)
      return failed
    }

    const controller = new AbortController()
    this.active.set(id, controller)
    let received = already
    const samples: Array<{ at: number; bytes: number }> = [{ at: Date.now(), bytes: received }]
    let lastEmit = 0
    const report = (state: ModelProgress['state'], force = false) => {
      const now = Date.now()
      samples.push({ at: now, bytes: received })
      while (samples.length > 2 && now - samples[0].at > SPEED_WINDOW_MS) samples.shift()
      const span = (now - samples[0].at) / 1000
      const speed = span > 0 ? (received - samples[0].bytes) / span : 0
      if (!force && now - lastEmit < 250) return
      lastEmit = now
      this.emitProgress({ id, state, received, total: model.bytes, speed, eta: speed > 0 ? (model.bytes - received) / speed : null, error: null })
    }

    try {
      for (const file of model.files) {
        const done = path.join(staging, file.path)
        if (existsSync(done) && statSync(done).size === file.size) continue
        const part = `${done}.part`
        let offset = existsSync(part) ? statSync(part).size : 0
        if (offset > file.size) {
          rmSync(part)
          received -= offset
          offset = 0
        }
        if (offset < file.size) {
          const url = `https://huggingface.co/${model.repo}/resolve/${model.revision}/${file.path}`
          const response = await net.fetch(url, { headers: offset ? { range: `bytes=${offset}-` } : {}, signal: controller.signal } as RequestInit)
          if (offset && response.status === 200) {
            // The server ignored the range: start this file again.
            received -= offset
            offset = 0
            rmSync(part, { force: true })
          } else if (!response.ok && response.status !== 206) {
            throw new Error(`Hugging Face answered ${response.status} for ${file.path}.`)
          }
          if (!response.body) throw new Error('Empty download')
          const counter = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
              received += chunk.length
              report('downloading')
              callback(null, chunk)
            },
          })
          await pipeline(Readable.fromWeb(response.body as never), counter, createWriteStream(part, { flags: offset ? 'a' : 'w' }), { signal: controller.signal })
        }
        if (statSync(part).size !== file.size) throw new Error(`${file.path} is incomplete. Try again.`)
        report('verifying', true)
        if ((await sha256(part)) !== file.sha256) {
          rmSync(part, { force: true })
          throw new Error(`${file.path} did not match its checksum and was deleted. Try again.`)
        }
        renameSync(part, done)
      }

      // Every file is verified: install the folder in one step.
      const target = this.installDir(model)
      mkdirSync(path.dirname(target), { recursive: true })
      const old = `${target}.old`
      rmSync(old, { recursive: true, force: true })
      if (existsSync(target)) renameSync(target, old)
      renameSync(staging, target)
      rmSync(old, { recursive: true, force: true })
      const installed: ModelProgress = { id, state: 'installed', received: model.bytes, total: model.bytes, speed: 0, eta: 0, error: null }
      this.emitProgress(installed)
      log(`models: installed ${id}`)
      return installed
    } catch (error) {
      const aborted = controller.signal.aborted
      const state: ModelProgress = {
        id,
        state: aborted ? 'paused' : 'error',
        received: this.partialBytes(model),
        total: model.bytes,
        speed: 0,
        eta: null,
        error: aborted ? null : error instanceof Error && /fetch|network|ENOTFOUND|ERR_/i.test(error.message) ? 'The download stopped: you appear to be offline. It continues from where it stopped when you retry.' : error instanceof Error ? error.message : String(error),
      }
      if (!aborted) log('models: download failed', id, String(error))
      this.emitProgress(state)
      return state
    } finally {
      this.active.delete(id)
    }
  }

  /** Partial downloads left from a previous session (to offer "Resume"). */
  pending(): string[] {
    if (!existsSync(this.downloadsDir)) return []
    return readdirSync(this.downloadsDir).filter((name) => manifest.models.some((model) => model.id === name))
  }
}
