// The app follows the live site's move to its primary domain and signs in there.
// Uses the real live site (no CLIPFARM_SITE_ORIGIN): node tests/site-move.e2e.cjs
const { _electron: electron } = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OLD = 'https://fractional-hr-34cett.freebuff.site'
const NEW = 'https://clipfarm.freebuff.site'
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-site-'))
  // An app that still has the old domain saved (like the 0.1.0 beta).
  fs.writeFileSync(path.join(data, 'site.json'), JSON.stringify({ origin: OLD }))
  const env = { ...process.env, CLIPFARM_DATA_DIR: data, CLIPFARM_ALLOW_BASIC_VAULT: '1' }
  delete env.CLIPFARM_SITE_ORIGIN
  const app = await electron.launch({ executablePath: require(path.join(__dirname, '..', 'node_modules', 'electron')), args: [path.join(__dirname, '..'), ...(process.platform === 'linux' ? ['--no-sandbox'] : [])], env })
  const page = await app.firstWindow()
  await page.waitForFunction(() => !!window.clipfarm)
  let info = null
  for (let i = 0; i < 30; i++) {
    info = await page.evaluate(() => window.clipfarm.invoke('app:info'))
    if (info.siteOrigin === NEW) break
    await page.waitForTimeout(500)
  }
  check('follows the 307 to the primary domain', info.siteOrigin === NEW, info.siteOrigin)
  const saved = JSON.parse(fs.readFileSync(path.join(data, 'site.json'), 'utf8')).origin
  check('remembers the new domain', saved === NEW, saved)

  const status = await page.evaluate(() => window.clipfarm.invoke('auth:start'))
  check('browser sign-in opens on the primary domain', status.url?.startsWith(`${NEW}/desktop/authorize?`), status.url)
  await page.evaluate(() => window.clipfarm.invoke('auth:cancel'))

  // The API proxy reaches the new Worker (JSON, not the platform's 409 text).
  const health = await page.evaluate(async () => { const r = await fetch('/api/health'); return { status: r.status, body: await r.text() } })
  check('API calls reach the Worker on the primary domain', health.status === 200 && health.body.includes('"ok":true'), JSON.stringify(health))
  const token = await page.evaluate(async () => { const r = await fetch('/api/auth/app/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'a'.repeat(64), verifier: 'b'.repeat(43) }) }); return { status: r.status, body: await r.text() } })
  check('the token exchange answers JSON (no 409 "Use the primary site domain")', token.status !== 409 && token.body.startsWith('{'), `${token.status} ${token.body}`)

  await app.close()
  process.exit(results.every(Boolean) ? 0 : 1)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
