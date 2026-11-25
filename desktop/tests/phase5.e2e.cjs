// Phase 5 end-to-end: the main app with a real local job, export, account
// sync, settings, browser pairing with the app, and single instance.
// Needs: a signed-in profile from tests/phase3.e2e.cjs (CLIPFARM_PROFILE),
// the Worker (CLIPFARM_SITE) and the production website on CLIPFARM_WEB.
const { _electron: electron, chromium } = require('playwright')
const { execFileSync, spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const SITE = process.env.CLIPFARM_SITE || 'http://localhost:5357'
const WEB = process.env.CLIPFARM_WEB || 'http://localhost:4173'
const OUT = process.argv[2] || path.join(os.tmpdir(), 'clipfarm-e2e')
const REPO = path.join(__dirname, '..', '..')
fs.mkdirSync(OUT, { recursive: true })
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const electronPath = require(path.join(__dirname, '..', 'node_modules', 'electron'))
const args = [path.join(__dirname, '..'), ...(process.platform === 'linux' ? ['--no-sandbox'] : [])]

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-main-'))
  fs.cpSync(process.env.CLIPFARM_PROFILE, data, { recursive: true })
  fs.rmSync(path.join(data, 'app', 'SingletonLock'), { force: true })
  const env = { ...process.env, CLIPFARM_DATA_DIR: data, CLIPFARM_SITE_ORIGIN: SITE, CLIPFARM_ALLOW_BASIC_VAULT: '1', CLIPFARM_EXTRA_ORIGINS: WEB }
  const app = await electron.launch({ executablePath: electronPath, args, env })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1280, height: 800 })

  await page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ }).waitFor({ timeout: 90000 })
  await page.getByText('Whisper Tiny is installed and in use').waitFor({ timeout: 30000 })
  check('home shows greeting, pipeline and the model in use', (await page.getByText(/Running on port/).count()) > 0)
  await page.screenshot({ path: `${OUT}/p5-home-empty.png` })

  // Upload a real video → real job → Studio
  const clipsBefore = (await page.evaluate(async () => (await fetch('/api/dashboard')).json())).summary.clips
  await page.locator('input[type=file]').setInputFiles(path.join(REPO, 'pipeline', 'sample', 'sample.mp4'))
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 60000 })
  let awake = false
  let done = null
  const deadline = Date.now() + 8 * 60 * 1000
  while (Date.now() < deadline) {
    awake = awake || (await page.evaluate(() => window.clipfarm.invoke('jobs:keep-awake')))
    const jobs = await page.evaluate(async () => (await fetch('/pipeline-api/jobs?limit=1')).json())
    if (jobs[0]?.status === 'done' || jobs[0]?.status === 'failed') {
      done = jobs[0]
      break
    }
    await page.waitForTimeout(1500)
  }
  check('upload ran a real job to the end', done?.status === 'done' && done.result.clips.length > 0, `${done?.status} · ${done?.result?.clips.length} clips · ${done?.error ?? ''}`)
  check('the PC was kept awake while it ran', awake)
  check('the upload keeps its file name as the project title', done?.title === 'sample' && done?.result?.video.title === 'sample', `${done?.title} / ${done?.result?.video.title}`)
  const clipFile = path.join(data, 'pipeline', 'jobs', done.id, 'clips', done.result.clips[0].id, 'clip.mp4')
  const probe = execFileSync(path.join(REPO, '.tools', 'ffprobe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', clipFile]).toString().trim()
  check('rendered clip is 1080×1920 H.264', probe === 'h264,1080,1920', probe)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/p5-studio-job.png` })

  // Export → saved to Downloads\Clipfarm without a dialog
  const downloads = path.join(await app.evaluate(({ app: electronApp }) => electronApp.getPath('downloads')), 'Clipfarm')
  const before = fs.existsSync(downloads) ? fs.readdirSync(downloads).length : 0
  await page.getByRole('button', { name: 'Export' }).click()
  await page.waitForFunction(() => true, null, { timeout: 1000 })
  let saved = []
  for (let i = 0; i < 40 && saved.length <= before; i++) {
    await page.waitForTimeout(500)
    saved = fs.existsSync(downloads) ? fs.readdirSync(downloads) : []
  }
  const exported = saved.filter((name) => name.endsWith('.mp4')).map((name) => path.join(downloads, name)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
  const exportProbe = exported ? execFileSync(path.join(REPO, '.tools', 'ffprobe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', exported]).toString().trim() : ''
  check('Export saves a playable MP4 to Downloads\\Clipfarm', exportProbe === 'h264,1080,1920', exported)

  // Account sync of the clip details
  let synced = null
  for (let i = 0; i < 30; i++) {
    const dash = await page.evaluate(async () => (await fetch('/api/dashboard')).json())
    if (dash.summary?.clips > clipsBefore) {
      synced = dash
      break
    }
    await page.waitForTimeout(1000)
  }
  check('finished clips synced to the account (details only)', !!synced && synced.summary.clips - clipsBefore === done.result.clips.length, `${clipsBefore} → ${synced?.summary.clips}`)
  const log = fs.readFileSync(path.join(data, 'logs', 'app.log'), 'utf8')
  check('a "Clips ready" notification was raised', /notify: Clips ready/.test(log))

  await page.goto('app://clipfarm/dashboard')
  await page.getByText('Recent clips on this PC').waitFor()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/p5-home.png` })
  await page.getByRole('link', { name: 'Clips', exact: true }).click()
  await page.getByText(done.result.clips[0].title).first().waitFor({ timeout: 20000 })
  check('Clips page lists the synced clip', true)
  await page.screenshot({ path: `${OUT}/p5-clips.png` })

  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByRole('heading', { name: 'Signed-in apps' }).waitFor()
  await page.getByText('This PC', { exact: true }).waitFor({ timeout: 15000 })
  check('settings list this device', true)
  check('settings show the model in use', (await page.locator('#models').getByText('In use').count()) === 1)
  await page.screenshot({ path: `${OUT}/p5-settings.png`, fullPage: true })

  // A browser on the website pairs with the app's pipeline; the app asks the user.
  await app.evaluate(({ dialog }) => {
    globalThis.__asked = []
    dialog.showMessageBox = async (...a) => {
      globalThis.__asked.push(String((a[1] ?? a[0]).message))
      return { response: 0, checkboxChecked: false }
    }
  })
  const browser = await chromium.launch()
  const tab = await browser.newPage()
  await tab.goto(`${WEB}/local`)
  await tab.getByRole('button', { name: 'Connect this browser' }).click({ timeout: 30000 })
  await tab.getByLabel('Video or channel link').waitFor({ timeout: 30000 })
  const asked = await app.evaluate(() => globalThis.__asked)
  check('the app asked before a browser could connect', asked.some((m) => m.includes(WEB)), asked.join(' | '))
  const host = await tab.evaluate(async () => {
    for (const port of [8787, 8788, 8789, 8790, 8791]) {
      try {
        const data = await (await fetch(`http://127.0.0.1:${port}/health`)).json()
        if (data.service === 'clipfarm-pipeline') return data.host
      } catch {}
    }
    return null
  })
  check('the browser is connected to the desktop app', host === 'desktop')
  await tab.screenshot({ path: `${OUT}/p5-browser-connected.png` })
  await page.reload()
  await page.getByRole('heading', { name: 'Connected browsers' }).waitFor()
  await page.locator('#browsers').getByRole('button', { name: 'Disconnect' }).first().click()
  await tab.reload()
  await tab.getByRole('button', { name: 'Connect this browser' }).waitFor({ timeout: 30000 })
  check('disconnecting in Settings revokes the browser', true)
  await browser.close()

  // Single instance: a second launch hands over and exits.
  const second = spawn(electronPath, args, { env })
  const exitCode = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve('still running'), 15000)
    second.on('exit', (code) => {
      clearTimeout(timer)
      resolve(code)
    })
  })
  check('a second launch exits and focuses the running app', exitCode === 0, String(exitCode))

  await app.close()
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
