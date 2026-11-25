import { app } from 'electron'
import { execFile } from 'node:child_process'
import { cpus, release, totalmem, version } from 'node:os'
import { statfsSync } from 'node:fs'
import { promisify } from 'node:util'

import type { PcCheckResult, PcFacts, PcItem, PcItemId, Recommendation } from '../shared/ipc'
import { log } from './log'

const run = promisify(execFile)

const LABELS: Record<PcItemId, string> = {
  windows: 'Windows version',
  cpu: 'Processor',
  memory: 'Memory',
  gpu: 'Graphics card',
  disk: 'Free disk space',
  ffmpeg: 'Video tools (ffmpeg and captions)',
  benchmark: 'Speed test',
}

const gb = (bytes: number) => Math.round((bytes / 1024 ** 3) * 10) / 10

function windowsName() {
  if (process.platform !== 'win32') return `${process.platform} ${release()}`
  const build = Number(release().split('.')[2] ?? 0)
  return `${build >= 22000 ? 'Windows 11' : 'Windows 10'} (build ${build}) · ${version()}`
}

/** GPU name and memory. On Windows the registry has the real 64-bit VRAM size (WMI caps it at 4 GB). */
async function gpuInfo(): Promise<{ name: string | null; vramGb: number | null }> {
  if (process.platform === 'win32') {
    try {
      const script = [
        "$c = @(Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM)",
        "$r = @(Get-ItemProperty 'HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*' -ErrorAction SilentlyContinue | Select-Object DriverDesc, 'HardwareInformation.qwMemorySize', 'HardwareInformation.MemorySize')",
        'ConvertTo-Json -Depth 3 -Compress @{ controllers = $c; registry = $r }',
      ].join('; ')
      const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 20000 })
      const data = JSON.parse(stdout) as {
        controllers: Array<{ Name?: string; AdapterRAM?: number }>
        registry: Array<{ DriverDesc?: string; 'HardwareInformation.qwMemorySize'?: number; 'HardwareInformation.MemorySize'?: number | number[] }>
      }
      // Prefer the adapter with the most memory (a dedicated card over integrated graphics).
      const candidates = data.registry
        .map((entry) => {
          const raw = entry['HardwareInformation.qwMemorySize'] ?? entry['HardwareInformation.MemorySize']
          const bytes = Array.isArray(raw) ? null : typeof raw === 'number' ? raw : null
          return { name: entry.DriverDesc ?? null, bytes }
        })
        .filter((entry) => entry.name)
      const best = candidates.sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0))[0]
      if (best) return { name: best.name, vramGb: best.bytes ? gb(best.bytes) : null }
      const controller = data.controllers[0]
      return { name: controller?.Name ?? null, vramGb: controller?.AdapterRAM ? gb(controller.AdapterRAM) : null }
    } catch (error) {
      log('pccheck: gpu query failed', String(error))
    }
  }
  try {
    const info = (await app.getGPUInfo('basic')) as { gpuDevice?: Array<{ vendorId: number; deviceId: number; active: boolean; deviceString?: string }> }
    const device = info.gpuDevice?.find((item) => item.active) ?? info.gpuDevice?.[0]
    return { name: device ? device.deviceString || `GPU ${device.vendorId.toString(16)}:${device.deviceId.toString(16)}` : null, vramGb: null }
  } catch (error) {
    log('pccheck: no GPU information', String(error))
    return { name: null, vramGb: null }
  }
}

/** Light over heavy: a larger model only when memory, cores and the measured speed all have room. */
export function recommend(facts: Pick<PcFacts, 'memoryGb' | 'cores' | 'gflops'>, allowed = true): Recommendation {
  if (!allowed) return { model: 'whisper-tiny', reason: 'You skipped the PC check, so Clipfarm uses the lightest model. Run the check in Settings to see if a larger one fits.' }
  const { memoryGb, cores, gflops } = facts
  if (memoryGb < 6 || cores < 4 || (gflops ?? 0) < 20) {
    return { model: 'whisper-tiny', reason: `With ${memoryGb} GB of memory and ${cores} cores, Tiny keeps transcription quick and leaves room for rendering.` }
  }
  if (memoryGb >= 12 && cores >= 8 && (gflops ?? 0) >= 60) {
    return { model: 'whisper-small', reason: `Your ${cores} cores and ${memoryGb} GB of memory run Small comfortably, and it makes fewer transcription mistakes than Base.` }
  }
  return { model: 'whisper-base', reason: `Base balances accuracy and speed for ${cores} cores and ${memoryGb} GB of memory; Small would slow your PC down during long VODs.` }
}

type Emit = (item: PcItem) => void

/**
 * Runs every check for real and reports each item as it goes. The benchmark
 * streams its own progress from the pipeline (/bench).
 */
export async function runPcCheck(options: { dataDir: string; pipelinePort: () => number | null; pipelineToken: string; emit: Emit }): Promise<PcCheckResult> {
  const items = new Map<PcItemId, PcItem>()
  const set = (id: PcItemId, patch: Partial<PcItem>) => {
    const next: PcItem = { id, label: LABELS[id], state: 'pending', progress: 0, detail: null, ...items.get(id), ...patch }
    items.set(id, next)
    options.emit(next)
  }
  for (const id of Object.keys(LABELS) as PcItemId[]) set(id, {})

  const facts: PcFacts = { os: '', cpu: '', cores: 0, memoryGb: 0, gpu: null, vramGb: null, freeDiskGb: 0, ffmpeg: false, encodeFps: null, gflops: null }

  set('windows', { state: 'running' })
  facts.os = windowsName()
  set('windows', { state: 'done', progress: 1, detail: facts.os })

  set('cpu', { state: 'running' })
  const cores = cpus()
  facts.cpu = cores[0]?.model?.trim() || 'Unknown processor'
  facts.cores = cores.length
  set('cpu', { state: 'done', progress: 1, detail: `${facts.cpu} · ${facts.cores} threads` })

  set('memory', { state: 'running' })
  facts.memoryGb = gb(totalmem())
  set('memory', { state: 'done', progress: 1, detail: `${facts.memoryGb} GB` })

  set('gpu', { state: 'running' })
  // Some drivers (and headless sessions) never answer; the check must not hang on them.
  const gpu = await Promise.race([gpuInfo(), new Promise<{ name: null; vramGb: null }>((resolve) => setTimeout(() => resolve({ name: null, vramGb: null }), 8000))])
  facts.gpu = gpu.name
  facts.vramGb = gpu.vramGb
  set('gpu', { state: 'done', progress: 1, detail: `${gpu.name ?? 'Not detected'}${gpu.vramGb ? ` · ${gpu.vramGb} GB video memory` : ''} · transcription runs on the processor` })

  set('disk', { state: 'running' })
  const stats = statfsSync(options.dataDir)
  facts.freeDiskGb = gb(Number(stats.bavail) * Number(stats.bsize))
  set('disk', { state: facts.freeDiskGb < 2 ? 'failed' : 'done', progress: 1, detail: `${facts.freeDiskGb} GB free${facts.freeDiskGb < 2 ? ': free up at least 2 GB for models and clips' : ''}` })

  const port = options.pipelinePort()
  const auth = { authorization: `Bearer ${options.pipelineToken}` }
  set('ffmpeg', { state: 'running' })
  try {
    if (!port) throw new Error('The pipeline is not running.')
    const system = (await (await fetch(`http://127.0.0.1:${port}/system`, { headers: auth })).json()) as { checks: Array<{ key: string; ok: boolean; detail: string }> }
    const ffmpeg = system.checks.find((check) => check.key === 'ffmpeg')
    const libass = system.checks.find((check) => check.key === 'libass')
    facts.ffmpeg = Boolean(ffmpeg?.ok && libass?.ok)
    set('ffmpeg', { state: facts.ffmpeg ? 'done' : 'failed', progress: 1, detail: facts.ffmpeg ? (ffmpeg?.detail ?? '').replace(/ Copyright.*/, '') : 'ffmpeg or caption rendering is missing. Reinstall Clipfarm Studio.' })
  } catch (error) {
    set('ffmpeg', { state: 'failed', progress: 1, detail: error instanceof Error ? error.message : String(error) })
  }

  set('benchmark', { state: 'running' })
  try {
    if (!port) throw new Error('The pipeline is not running.')
    const response = await fetch(`http://127.0.0.1:${port}/bench`, { headers: auth })
    if (!response.ok || !response.body) throw new Error(`The speed test did not start (${response.status}).`)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const raw of events) {
        if (raw.startsWith('event: error')) throw new Error(JSON.parse(raw.split('data: ')[1]).detail)
        const data = JSON.parse(raw.replace(/^data: /, '')) as { stage: string; progress: number; encodeFps?: number; gflops?: number; encodeRealtime?: number }
        // Encoding is the first half of the test, the CPU part the second.
        const overall = data.stage === 'encode' ? data.progress * 0.5 : data.stage === 'cpu' ? 0.5 + data.progress * 0.5 : 1
        if (data.encodeFps !== undefined) facts.encodeFps = data.encodeFps
        if (data.gflops !== undefined) facts.gflops = data.gflops
        set('benchmark', {
          state: data.stage === 'done' ? 'done' : 'running',
          progress: overall,
          detail: data.stage === 'done' ? `Encodes 1080×1920 video at ${data.encodeRealtime}× real time · ${data.gflops} GFLOPS` : data.stage === 'encode' ? 'Encoding a 1080×1920 test video' : 'Measuring processor speed',
        })
      }
    }
  } catch (error) {
    set('benchmark', { state: 'failed', progress: 1, detail: error instanceof Error ? error.message : String(error) })
  }

  const list = [...items.values()]
  return { ok: list.every((item) => item.state === 'done'), items: list, facts, recommendation: recommend(facts) }
}
