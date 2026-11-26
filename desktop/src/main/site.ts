import { net } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'

import { log } from './log'
import { allowedMove, DEFAULT_SITE_ORIGIN } from './siteRules'

export { DEFAULT_SITE_ORIGIN }


/**
 * The website the app talks to. When the site moves to a new primary domain,
 * the old one redirects (307) every request; the app follows that once, saves
 * the new origin and uses it from then on. Only https targets on the same
 * registrable domain are followed, so a redirect can never send the account
 * token somewhere else. `CLIPFARM_SITE_ORIGIN` pins the origin (tests, dev).
 */
export class Site {
  private origin: string
  private readonly pinned: boolean

  constructor(private readonly file: string, envOrigin?: string) {
    this.pinned = !!envOrigin
    this.origin = clean(envOrigin) ?? this.load() ?? DEFAULT_SITE_ORIGIN
  }

  get() {
    return this.origin
  }

  private load(): string | null {
    try {
      const saved = clean((JSON.parse(readFileSync(this.file, 'utf8')) as { origin?: string }).origin)
      return saved && allowedMove(DEFAULT_SITE_ORIGIN, saved) ? saved : null
    } catch {
      return null
    }
  }

  /** Asks the site where it lives now. Never throws; offline keeps the current origin. */
  async resolve(): Promise<string> {
    if (this.pinned) return this.origin
    try {
      const location = await redirectOf(`${this.origin}/api/health`)
      if (location) {
        const next = clean(new URL(location, this.origin).origin)
        if (next && next !== this.origin && allowedMove(this.origin, next)) {
          log(`site: moved from ${this.origin} to ${next}`)
          this.origin = next
          const tmp = `${this.file}.tmp`
          writeFileSync(tmp, JSON.stringify({ origin: next, at: new Date().toISOString() }))
          renameSync(tmp, this.file)
        } else if (next !== this.origin) {
          log(`site: ignored a redirect to ${location}`)
        }
      }
    } catch (error) {
      log('site: could not check the site origin', String(error))
    }
    return this.origin
  }
}

/** Where a GET is redirected to, without following it (null when it is not redirected). */
function redirectOf(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, method: 'GET', redirect: 'manual' })
    const timer = setTimeout(() => {
      request.abort()
      reject(new Error('timed out'))
    }, 8000)
    request.on('redirect', (_status, _method, redirectUrl) => {
      clearTimeout(timer)
      request.abort()
      resolve(redirectUrl)
    })
    request.on('response', (response) => {
      clearTimeout(timer)
      response.on('data', () => undefined)
      resolve(null)
    })
    request.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    request.end()
  })
}

function clean(value: string | undefined | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
    return url.origin
  } catch {
    return null
  }
}
