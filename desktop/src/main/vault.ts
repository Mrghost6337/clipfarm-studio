import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { log } from './log'

/**
 * Secrets at rest, encrypted with the operating system: DPAPI on Windows
 * (tied to the Windows user), Keychain on macOS. On Linux without a keyring
 * Electron falls back to a fixed key ("basic_text"), which is not real
 * protection, so the vault then keeps secrets in memory only (sign in again
 * after a restart) unless CLIPFARM_ALLOW_BASIC_VAULT=1 is set for tests.
 */
export class Vault {
  private memory = new Map<string, string>()

  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true })
    // Tests on Linux without a keyring opt in to Electron's fixed-key fallback.
    // Never set in a real build: Windows always uses DPAPI.
    if (process.platform === 'linux' && process.env.CLIPFARM_ALLOW_BASIC_VAULT === '1') {
      ;(safeStorage as unknown as { setUsePlainTextEncryption?: (value: boolean) => void }).setUsePlainTextEncryption?.(true)
    }
  }

  get persistent() {
    if (!safeStorage.isEncryptionAvailable()) return false
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') return process.env.CLIPFARM_ALLOW_BASIC_VAULT === '1'
    return true
  }

  private file(name: string) {
    if (!/^[a-z-]+$/.test(name)) throw new Error('bad vault key')
    return path.join(this.dir, `${name}.bin`)
  }

  set(name: string, value: string) {
    this.memory.set(name, value)
    if (!this.persistent) {
      log(`vault: ${name} kept in memory only (no OS encryption available)`)
      return
    }
    const target = this.file(name)
    const tmp = `${target}.tmp`
    writeFileSync(tmp, safeStorage.encryptString(value))
    renameSync(tmp, target)
  }

  get(name: string): string | null {
    if (this.memory.has(name)) return this.memory.get(name)!
    const file = this.file(name)
    if (!this.persistent || !existsSync(file)) return null
    try {
      const value = safeStorage.decryptString(readFileSync(file))
      this.memory.set(name, value)
      return value
    } catch (error) {
      log('vault: could not decrypt', name, String(error))
      return null
    }
  }

  delete(name: string) {
    this.memory.delete(name)
    rmSync(this.file(name), { force: true })
  }
}
