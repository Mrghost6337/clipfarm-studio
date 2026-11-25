// Records a walkthrough of the real app: first run, browser sign-in, PC check,
// model download, terms, then Home, a real clip job in the Studio, Clips and Settings.
// CLIPFARM_SITE=http://localhost:5357 node tests/demo-recording.cjs <out-dir>
// Writes app.webm, browser.webm and marks.json (seconds since the app video started).
const { _electron: electron, chromium } = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const SITE = process.env.CLIPFARM_SITE || 'http://localhost:5357'
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'clipfarm-demo'))
const REPO = path.join(__dirname, '..', '..')
const SIZE = { width: 1280, height: 800 }
fs.mkdirSync(OUT, { recursive: true })

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-demo-'))
  const started = Date.now()
  const marks = {}
  const mark = (name) => (marks[name] = (Date.now() - started) / 1000)
  const app = await electron.launch({
    executablePath: require(path.join(__dirname, '..', 'node_modules', 'electron')),
    args: [path.join(__dirname, '..'), ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env: { ...process.env, CLIPFARM_DATA_DIR: data, CLIPFARM_SITE_ORIGIN: SITE, CLIPFARM_ALLOW_BASIC_VAULT: '1' },
    recordVideo: { dir: path.join(OUT, 'raw-app'), size: SIZE },
  })
  const page = await app.firstWindow()
  await page.setViewportSize(SIZE)
  const pause = (ms) => page.waitForTimeout(ms)
  // In-app navigation through the router (a full reload would replay the intro).
  const go = (to) => page.evaluate((to) => { history.pushState({}, '', to); dispatchEvent(new PopStateEvent('popstate')) }, to)
  process.on('unhandledRejection', () => undefined)
  globalThis.__shot = () => page.screenshot({ path: path.join(OUT, 'error.png') }).catch(() => undefined)

  // Intro and welcome wall
  await page.getByRole('button', { name: 'Start free' }).waitFor({ timeout: 60000 })
  await pause(3500)
  await page.getByRole('button', { name: 'Credits' }).click()
  await pause(3000)
  await page.keyboard.press('Escape')
  await pause(800)
  await page.getByRole('button', { name: 'Start free' }).click()

  // Usage choice
  await page.getByRole('heading', { name: 'How will you use Clipfarm?' }).waitFor()
  await pause(3000)
  await page.getByRole('button', { name: 'Continue with Local' }).click()

  // Preparing (real checks)
  await page.getByRole('heading', { name: 'Done' }).waitFor({ timeout: 180000 })
  await pause(2500)
  await page.getByRole('button', { name: 'Continue' }).click()

  // Browser sign-in
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).waitFor()
  await pause(2500)
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).click()
  await pause(1500)
  mark('browserStart')
  const url = (await page.evaluate(() => window.clipfarm.invoke('auth:status'))).url
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: path.join(OUT, 'raw-browser'), size: SIZE } })
  await context.addInitScript(() => localStorage.setItem('clipfarm.consent', JSON.stringify({ choice: 'essential', at: new Date().toISOString() })))
  const tab = await context.newPage()
  await tab.goto(url)
  await tab.waitForTimeout(1500)
  await tab.getByRole('radio', { name: 'Create account' }).click()
  await tab.getByLabel('Your name').pressSequentially('Robin Demo', { delay: 60 })
  await tab.getByLabel('Email', { exact: true }).pressSequentially(`robin.demo.${Date.now()}@example.com`, { delay: 30 })
  await tab.getByLabel('Password', { exact: true }).pressSequentially('correct-horse-battery-1', { delay: 30 })
  await tab.waitForTimeout(600)
  await tab.getByRole('button', { name: /Create account and connect/ }).click()
  await tab.getByRole('button', { name: /Continue as/ }).waitFor({ timeout: 20000 })
  await tab.waitForFunction(() => !document.querySelector('button[aria-busy="true"]'))
  await tab.waitForTimeout(1500)
  await tab.getByRole('button', { name: /Continue as/ }).click()
  await tab.getByRole('link', { name: /did not open/ }).waitFor()
  await tab.waitForTimeout(2000)
  await tab.getByRole('link', { name: /did not open/ }).click()
  await tab.waitForTimeout(1500)
  mark('browserEnd')

  // Profile → PC check
  await page.getByRole('heading', { name: 'Check this PC?' }).waitFor({ timeout: 60000 })
  await pause(2500)
  await page.getByRole('button', { name: 'Check this PC', exact: true }).click()
  await page.getByText('Recommended model').waitFor({ timeout: 180000 })
  await pause(4000)
  await page.getByRole('button', { name: 'Continue with Local' }).click()

  // Model download, verify, test
  await page.getByRole('heading', { name: 'Downloading your models' }).waitFor({ timeout: 30000 })
  await page.getByRole('radio', { name: /Whisper Tiny/ }).click()
  await pause(1500)
  await page.getByRole('button', { name: 'Download' }).click()
  mark('downloadStart')
  await page.getByText('Test passed').waitFor({ timeout: 300000 })
  mark('downloadEnd')
  await pause(3500)
  await page.getByRole('button', { name: 'Continue' }).click()

  // Terms and privacy
  await page.getByRole('heading', { name: 'Terms and privacy' }).waitFor({ timeout: 60000 })
  await pause(2500)
  await page.getByRole('radio', { name: 'Privacy Policy' }).click()
  await pause(2000)
  await page.getByText('I have read and accept').click()
  await pause(800)
  await page.getByRole('button', { name: 'Accept and continue' }).click()

  // Ready → app
  await page.getByRole('heading', { name: /You’re ready to go/ }).waitFor({ timeout: 30000 })
  await pause(3000)
  await page.getByRole('button', { name: 'Start' }).click()
  await pause(5000)
  await go('/dashboard')
  await page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ }).waitFor({ timeout: 60000 })
  await page.getByText(/Running on port/).waitFor({ timeout: 60000 })
  await pause(3000)

  // A real job: upload the sample video
  await page.locator('input[type=file]').setInputFiles(path.join(REPO, 'pipeline', 'sample', 'sample.mp4'))
  await page.getByRole('complementary', { name: 'Sources' }).waitFor({ timeout: 60000 })
  mark('jobStart')
  let done = null
  for (const deadline = Date.now() + 10 * 60 * 1000; Date.now() < deadline; ) {
    const jobs = await page.evaluate(async () => (await fetch('/pipeline-api/jobs?limit=1')).json())
    if (['done', 'failed'].includes(jobs[0]?.status)) {
      done = jobs[0]
      break
    }
    await pause(1500)
  }
  mark('jobEnd')
  console.log('job', done?.status, done?.result?.clips?.length ?? 0, 'clips')
  await pause(3000)
  const play = page.getByRole('button', { name: 'Play', exact: true })
  if (await play.count()) {
    await play.first().click()
    await pause(7000)
    await page.getByRole('button', { name: 'Pause', exact: true }).first().click().catch(() => undefined)
  }
  const second = page.getByRole('button', { name: /^Select clip / }).nth(1)
  if (await second.count()) {
    await second.click()
    await pause(3000)
  }

  // The rest of the app
  await go('/dashboard')
  await page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ }).waitFor({ timeout: 60000 })
  await pause(4000)
  for (const name of ['Clips', 'Sources', 'Analytics']) {
    await page.getByRole('link', { name, exact: true }).click()
    await pause(3500)
  }
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await pause(2500)
  const main = page.locator('main')
  for (let i = 0; i < 8; i++) {
    await main.evaluate((el) => (el.scrollHeight > el.clientHeight ? el : document.scrollingElement).scrollBy({ top: 420, behavior: 'smooth' }))
    await pause(1600)
  }
  await pause(1500)
  mark('end')

  await context.close()
  await browser.close()
  await app.close()
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 2))
  const pick = (dir) => path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('.webm')))
  fs.renameSync(pick(path.join(OUT, 'raw-app')), path.join(OUT, 'app.webm'))
  fs.renameSync(pick(path.join(OUT, 'raw-browser')), path.join(OUT, 'browser.webm'))
  console.log(JSON.stringify(marks))
})().catch(async (error) => {
  await globalThis.__shot?.()
  console.error(error)
  process.exit(1)
})
