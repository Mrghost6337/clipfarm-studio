import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs'
import path from 'node:path'

import type { PrepareLine } from '../shared/ipc'
import type { Dirs } from './paths'
import { sidecarLayout } from './paths'
import type { Sidecar } from './sidecar'

export type Manifest = { version: string; files: Array<{ path: string; size: number; sha256: string }> }

export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/** Copies a file next to its target, verifies the hash, then renames it into place. */
async function installVerified(source: string, target: string, expected?: string) {
  mkdirSync(path.dirname(target), { recursive: true })
  const sourceHash = expected ?? (await sha256File(source))
  if (existsSync(target) && (await sha256File(target)) === sourceHash) return 'already installed'
  const tmp = `${target}.part`
  copyFileSync(source, tmp)
  const copied = await sha256File(tmp)
  if (copied !== sourceHash) throw new Error(`${path.basename(source)} did not verify after copying.`)
  renameSync(tmp, target)
  return 'installed'
}

type Emit = (line: PrepareLine) => void

/**
 * The real work behind the "Preparing" screen. Every line reports what it did;
 * a failure stops the run and the screen offers a retry.
 */
export async function runPrepare(dirs: Dirs, sidecar: Sidecar, emit: Emit): Promise<{ ok: boolean; lines: PrepareLine[] }> {
  const layout = sidecarLayout()
  const exe = process.platform === 'win32' ? '.exe' : ''
  const lines = new Map<string, PrepareLine>()
  const update = (line: PrepareLine) => {
    lines.set(line.id, line)
    emit(line)
  }
  const steps: Array<{ id: string; label: string; run: (progress: (p: number, detail?: string) => void) => Promise<string> }> = [
    {
      id: 'runtime',
      label: 'Checking the bundled runtime',
      run: async (progress) => {
        if (!existsSync(layout.python)) throw new Error('The Python runtime is missing. Reinstall Clipfarm Studio.')
        if (existsSync(layout.manifest)) {
          const manifest = JSON.parse(readFileSync(layout.manifest, 'utf8')) as Manifest
          const total = manifest.files.reduce((sum, file) => sum + file.size, 0)
          let done = 0
          for (const file of manifest.files) {
            const full = path.join(layout.root, file.path)
            if (!existsSync(full)) throw new Error(`${file.path} is missing. Reinstall Clipfarm Studio.`)
            if ((await sha256File(full)) !== file.sha256) throw new Error(`${file.path} is damaged. Reinstall Clipfarm Studio.`)
            done += file.size
            progress(total ? done / total : 1, `${manifest.files.length.toLocaleString()} files`)
          }
        }
        const check = spawnSync(layout.python, ['-c', 'import fastapi, uvicorn, faster_whisper, cv2, yt_dlp, numpy; print("ok")'], { cwd: layout.cwd, windowsHide: true, encoding: 'utf8', env: sidecar.env(), timeout: 120_000 })
        if (check.status !== 0) throw new Error(`The runtime could not load its libraries: ${(check.stderr || '').trim().split('\n').pop()}`)
        return existsSync(layout.manifest) ? 'Verified' : 'Libraries load'
      },
    },
    {
      id: 'ffmpeg',
      label: 'Checking ffmpeg and caption rendering',
      run: async () => {
        const ffmpeg = path.join(layout.bin, `ffmpeg${exe}`)
        if (!existsSync(ffmpeg)) throw new Error('ffmpeg is missing. Reinstall Clipfarm Studio.')
        const filters = spawnSync(ffmpeg, ['-hide_banner', '-filters'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
        if (filters.status !== 0 || !/\sass\s/.test(filters.stdout)) throw new Error('This ffmpeg cannot render captions (no libass).')
        const version = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 }).stdout.split('\n')[0]
        const deno = path.join(layout.bin, `deno${exe}`)
        const denoOk = existsSync(deno) && spawnSync(deno, ['--version'], { windowsHide: true, timeout: 30_000 }).status === 0
        return `${version.replace(/ Copyright.*/, '')}${denoOk ? ' · Deno ready for YouTube' : ''}`
      },
    },
    {
      id: 'face',
      label: 'Installing the face model',
      run: async () => installVerified(layout.faceModel, path.join(dirs.models, path.basename(layout.faceModel))),
    },
    {
      id: 'fonts',
      label: 'Installing caption fonts',
      run: async (progress) => {
        const fonts = readdirSync(layout.fonts).filter((name) => name.endsWith('.ttf'))
        if (!fonts.length) throw new Error('The caption fonts are missing. Reinstall Clipfarm Studio.')
        for (const [index, name] of fonts.entries()) {
          await installVerified(path.join(layout.fonts, name), path.join(dirs.fonts, name))
          progress((index + 1) / fonts.length)
        }
        return `${fonts.length} fonts`
      },
    },
    {
      id: 'folders',
      label: 'Creating your folders',
      run: async () => {
        for (const folder of [dirs.pipeline, dirs.models, dirs.downloads, dirs.secrets, dirs.vault, dirs.logs]) mkdirSync(folder, { recursive: true })
        return dirs.root
      },
    },
    {
      id: 'pipeline',
      label: 'Starting the pipeline',
      run: async () => {
        if (sidecar.getStatus().state !== 'ready') sidecar.restart()
        const started = Date.now()
        while (Date.now() - started < 120_000) {
          const status = sidecar.getStatus()
          if (status.state === 'ready') return `Running on 127.0.0.1:${status.port}`
          if (status.state === 'failed') throw new Error(status.error ?? 'The pipeline did not start.')
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
        throw new Error('The pipeline did not start within two minutes.')
      },
    },
    {
      id: 'database',
      label: 'Opening the job database',
      run: async () => {
        const status = sidecar.getStatus()
        const response = await fetch(`http://127.0.0.1:${status.port}/jobs?limit=1`, { headers: { authorization: `Bearer ${sidecar.token}` } })
        if (!response.ok) throw new Error(`The job database did not answer (${response.status}).`)
        const config = (await (await fetch(`http://127.0.0.1:${status.port}/config`, { headers: { authorization: `Bearer ${sidecar.token}` } })).json()) as { presets: string[] }
        return `Ready · ${config.presets.length} caption presets`
      },
    },
  ]

  for (const step of steps) update({ id: step.id, label: step.label, state: 'pending' })
  for (const step of steps) {
    update({ id: step.id, label: step.label, state: 'running', progress: 0 })
    try {
      const detail = await step.run((progress, detail) => update({ id: step.id, label: step.label, state: 'running', progress, detail }))
      update({ id: step.id, label: step.label, state: 'done', progress: 1, detail })
    } catch (error) {
      update({ id: step.id, label: step.label, state: 'failed', detail: error instanceof Error ? error.message : String(error) })
      return { ok: false, lines: [...lines.values()] }
    }
  }
  return { ok: true, lines: [...lines.values()] }
}
