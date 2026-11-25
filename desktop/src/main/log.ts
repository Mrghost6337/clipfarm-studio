import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'

const MAX_BYTES = 5 * 1024 * 1024

/** Append-only log with one rotation (file.log → file.1.log at 5 MB). Never logs tokens. */
export class LogFile {
  constructor(readonly file: string) {
    mkdirSync(path.dirname(file), { recursive: true })
  }

  write(line: string) {
    try {
      if (existsSync(this.file) && statSync(this.file).size > MAX_BYTES) renameSync(this.file, this.file.replace(/\.log$/, '.1.log'))
      appendFileSync(this.file, `${new Date().toISOString()} ${redact(line).replace(/\s+$/, '')}\n`)
    } catch {
      /* logging must never crash the app */
    }
  }
}

/** Strips bearer tokens and pairing secrets before anything reaches a log file. */
export function redact(text: string) {
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi, '$1[redacted]')
    .replace(/((?:token|secret|ticket|code|verifier)["'=:\s]+)[A-Za-z0-9._~+/=-]{16,}/gi, '$1[redacted]')
}

let appLog: LogFile | null = null
export const setAppLog = (file: string) => {
  appLog = new LogFile(file)
}
export const log = (...parts: unknown[]) => {
  const line = parts.map((part) => (part instanceof Error ? `${part.message}\n${part.stack ?? ''}` : typeof part === 'string' ? part : JSON.stringify(part))).join(' ')
  appLog?.write(line)
  if (process.env.CLIPFARM_LOG_STDOUT === '1') console.log(redact(line))
}
