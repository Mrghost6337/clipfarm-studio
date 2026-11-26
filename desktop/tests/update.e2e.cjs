// Windows CI: an installed app finds a newer version, downloads it in the
// background, shows the "Update ready" prompt, and "Install now" installs it
// silently and reopens the app — no manual reinstall.
// CLIPFARM_EXE=<installed exe> node tests/update.e2e.cjs <screens-dir>
// The workflow serves the newer build on http://127.0.0.1:8765 and points the
// installed app's resources/app-update.yml at it before this runs.
const { _electron: electron } = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OUT = process.argv[2] || path.join(os.tmpdir(), 'clipfarm-update')
fs.mkdirSync(OUT, { recursive: true })
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-update-'))
  const app = await electron.launch({ executablePath: process.env.CLIPFARM_EXE, env: { ...process.env, CLIPFARM_DATA_DIR: data } })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1280, height: 800 })
  const before = await page.evaluate(() => window.clipfarm.invoke('app:info'))
  check('the installed app runs the old version', before.version === '0.1.0', before.version)

  let status = null
  const seen = new Set()
  for (const deadline = Date.now() + 8 * 60 * 1000; Date.now() < deadline; ) {
    status = await page.evaluate(() => window.clipfarm.invoke('update:status'))
    seen.add(status.state)
    if (status.state === 'ready' || status.state === 'error') break
    await page.waitForTimeout(1000)
  }
  check('finds and downloads the new version in the background', status.state === 'ready' && status.version === '0.1.1', `${[...seen].join(' → ')} ${status.version ?? ''} ${status.error ?? ''}`)

  const prompt = page.getByRole('dialog', { name: 'Update ready' })
  await prompt.waitFor({ timeout: 20000 })
  check('shows "Update ready" with Install now and Later', (await prompt.getByRole('button', { name: 'Install now' }).count()) === 1 && (await prompt.getByRole('button', { name: 'Later' }).count()) === 1)
  await page.screenshot({ path: path.join(OUT, 'update-ready.png') })

  await prompt.getByRole('button', { name: 'Later' }).click()
  await page.waitForTimeout(600)
  check('Later hides the prompt', (await prompt.count()) === 0)
  const settings = await page.evaluate(() => window.clipfarm.invoke('update:status'))
  check('the update stays ready to install on close', settings.state === 'ready')

  // Install now (from the main process, as the prompt is hidden now): quits, installs silently, reopens.
  const exited = new Promise((resolve) => app.process().once('exit', resolve))
  await page.evaluate(() => window.clipfarm.invoke('update:install')).catch(() => undefined)
  const gone = await Promise.race([exited.then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 60000))])
  check('Install now closes the app to install', gone)
  process.exit(results.every(Boolean) ? 0 : 1)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
