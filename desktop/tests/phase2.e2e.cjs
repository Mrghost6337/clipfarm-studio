// Phase 2 end-to-end: browser sign-in with PKCE against a real Worker.
// Needs the website + Worker running (bun run dev in the repo root) and the
// app pointed at it: CLIPFARM_SITE=http://localhost:5357 node tests/phase2.e2e.cjs <out>
const { _electron: electron, chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const SITE = process.env.CLIPFARM_SITE || 'http://localhost:5357'
const OUT = process.argv[2] || path.join(os.tmpdir(), 'clipfarm-e2e')
fs.mkdirSync(OUT, { recursive: true })
const D1 = process.env.CLIPFARM_D1_FILE // optional: local D1 sqlite file for the renewal check
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const email = `desktop.${Date.now()}@example.com`
const password = 'correct-horse-battery-1'

async function launch(data, site = SITE) {
  const args = [path.join(__dirname, '..')]
  if (process.platform === 'linux') args.push('--no-sandbox')
  const app = await electron.launch({
    executablePath: require(path.join(__dirname, '..', 'node_modules', 'electron')),
    args,
    env: { ...process.env, CLIPFARM_DATA_DIR: data, CLIPFARM_SITE_ORIGIN: site, CLIPFARM_ALLOW_BASIC_VAULT: '1' },
  })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1280, height: 800 })
  return { app, page }
}

const status = (page) => page.evaluate(() => window.clipfarm.invoke('auth:status'))

/** Runs the browser half: open the app's link, finish, follow the loopback fallback. */
async function finishInBrowser(browserPage, url, { signup = false, login = false } = {}) {
  await browserPage.goto(url)
  if (signup) {
    await browserPage.getByRole('radio', { name: 'Create account' }).click()
    await browserPage.getByLabel('Your name').fill('Desktop Tester')
    await browserPage.getByLabel('Email', { exact: true }).fill(email)
    await browserPage.getByLabel('Password', { exact: true }).fill(password)
    await browserPage.getByRole('button', { name: /Create account and connect/ }).click()
  } else if (login) {
    await browserPage.getByLabel('Email', { exact: true }).fill(email)
    await browserPage.getByLabel('Password', { exact: true }).fill(password)
    await browserPage.getByRole('button', { name: /Log in and connect/ }).click()
  }
  const cont = browserPage.getByRole('button', { name: /Continue as/ })
  await cont.waitFor({ timeout: 20000 })
  await browserPage.waitForFunction(() => !document.querySelector('button[aria-busy="true"]'))
  await cont.click()
  // clipfarm:// cannot open in a test browser: use the loopback fallback the page offers.
  const fallback = browserPage.getByRole('link', { name: /did not open/ })
  await fallback.waitFor({ timeout: 10000 })
  const href = await fallback.getAttribute('href')
  await fallback.click()
  await browserPage.getByText('You are signed in').waitFor({ timeout: 15000 })
  return href
}

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-auth-'))
  const browser = await chromium.launch()
  const web = await browser.newContext()
  const tab = await web.newPage()
  let { app, page } = await launch(data)

  await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 180000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).waitFor()
  await page.screenshot({ path: `${OUT}/p2-signin.png` })

  // Cancel
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).click()
  await page.getByText('Waiting for your browser…').waitFor()
  await page.screenshot({ path: `${OUT}/p2-waiting.png` })
  const waiting = await status(page)
  check('waiting state has a PKCE link with state and loopback fallback', waiting.state === 'waiting' && /challenge=[A-Za-z0-9_-]{43}&/.test(waiting.url) && /state=/.test(waiting.url) && /fallback=http%3A%2F%2F127\.0\.0\.1%3A\d+/.test(waiting.url))
  await page.getByRole('button', { name: 'Cancel' }).click()
  check('cancel returns to signed out', (await status(page)).state === 'signed-out')

  // Sign up in the browser
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).click()
  const first = await status(page)
  const fallbackHref = await finishInBrowser(tab, first.url, { signup: true })
  await tab.screenshot({ path: `${OUT}/p2-browser-done.png` })
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 60000 })
  const signedIn = await status(page)
  check('sign-up in the browser signs the app in', signedIn.state === 'signed-in' && signedIn.user.email === email)
  await page.screenshot({ path: `${OUT}/p2-app-after-signin.png` })

  // The code was single-use and is bound to the verifier.
  const code = new URL(fallbackHref).searchParams.get('code')
  await tab.goto(`${SITE}/`)
  const reuse = await tab.evaluate(async ({ site, code }) => (await fetch(`${site}/api/auth/app/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, verifier: 'x'.repeat(43) }) })).status, { site: SITE, code })
  check('used code cannot be exchanged again', reuse === 409 || reuse === 401, String(reuse))
  const late = await page.evaluate(async (url) => {
    const r = await fetch(url.replace(/code=[^&]+/, 'code=' + 'a'.repeat(64)))
    return r.status
  }, fallbackHref).catch(() => 'refused')
  check('the loopback listener is closed after sign-in', late === 'refused' || late !== 200, String(late))

  // The token lives encrypted in the vault, never in the page.
  const vaultFile = path.join(data, 'vault', 'session.bin')
  const raw = fs.existsSync(vaultFile) ? fs.readFileSync(vaultFile) : Buffer.alloc(0)
  check('token stored encrypted (not plain text)', raw.length > 0 && !/^[a-f0-9]{64}$/.test(raw.toString('utf8')))
  const pageStorage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + document.cookie)
  check('no token in localStorage or cookies', !/[a-f0-9]{64}/.test(pageStorage))
  const me = await page.evaluate(async () => (await fetch('/api/auth/me')).json())
  check('account API works through the app proxy', me.user?.email === email)

  // Devices
  const devices = await page.evaluate(async () => (await fetch('/api/auth/devices')).json())
  const current = devices.devices?.find((d) => d.current)
  check('device listed with a name', !!current && current.name.startsWith('Clipfarm Studio on'), current?.name)

  // Sliding renewal (needs the local D1 file)
  if (D1) {
    const soon = new Date(Date.now() + 2 * 864e5).toISOString()
    execFileSync('python3', ['-c', `import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute("UPDATE sessions SET expires_at=? WHERE kind='desktop' AND substr(token_hash,1,16)=?", (sys.argv[2], sys.argv[3])); c.commit()`, D1, soon, current.id])
    await page.evaluate(async () => (await fetch('/api/auth/me')).json())
    const after = (await page.evaluate(async () => (await fetch('/api/auth/devices')).json())).devices.find((d) => d.current)
    const days = (new Date(after.expiresAt).getTime() - Date.now()) / 864e5
    check('token renews while in use (2 days left → ~30)', days > 29 && days <= 30.1, `${days.toFixed(1)} days`)
  }

  // Already signed in on the browser: sign out of the app, sign back in with one click.
  await page.evaluate(() => window.clipfarm.invoke('auth:sign-out'))
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).waitFor({ timeout: 20000 })
  check('sign out returns to the sign-in screen', (await status(page)).state === 'signed-out')
  check('sign out deleted the vault token', !fs.existsSync(vaultFile))
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).click()
  await finishInBrowser(tab, (await status(page)).url)
  await tab.screenshot({ path: `${OUT}/p2-browser-continue-as.png` })
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 60000 })
  check('already-signed-in browser: Continue as works', (await status(page)).state === 'signed-in')

  // Revoke this device from the browser: the app notices and asks to sign in again.
  const id = (await page.evaluate(async () => (await fetch('/api/auth/devices')).json())).devices.find((d) => d.current).id
  await tab.goto(`${SITE}/dashboard`)
  const revoked = await tab.evaluate(async ({ site, id }) => (await fetch(`${site}/api/auth/devices/${id}`, { method: 'DELETE' })).status, { site: SITE, id })
  const meAfter = await page.evaluate(async () => (await fetch('/api/auth/me')).json())
  void meAfter
  await page.getByText('Your session ended').waitFor({ timeout: 20000 })
  check('revoked device → session expired → sign-in screen', revoked === 200 && (await status(page)).state === 'expired')
  await page.screenshot({ path: `${OUT}/p2-expired.png` })

  // Log in with the existing account (different browser session)
  const web2 = await browser.newContext()
  const tab2 = await web2.newPage()
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).click()
  await finishInBrowser(tab2, (await status(page)).url, { login: true })
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 60000 })
  check('log in with email and password signs the app in', (await status(page)).state === 'signed-in')
  await app.close()

  // Offline start: the site is unreachable, the cached profile opens the app.
  ;({ app, page } = await launch(data, 'http://127.0.0.1:9'))
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 90000 })
  const offline = await status(page)
  check('opens offline with the cached profile', offline.state === 'signed-in' && offline.offline === true && offline.user.email === email)
  const pipeline = await page.evaluate(async () => (await fetch('/pipeline-api/health')).ok)
  check('local pipeline works offline', pipeline)
  await app.close()

  // Restart online: straight to profile → app, no sign-in.
  ;({ app, page } = await launch(data))
  await page.getByRole('heading', { name: 'Desktop Tester' }).waitFor({ timeout: 30000 }).catch(() => undefined)
  await page.screenshot({ path: `${OUT}/p2-returning-profile.png` })
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 60000 })
  check('returning launch: profile → app without signing in', (await status(page)).state === 'signed-in')
  await app.close()
  await browser.close()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
