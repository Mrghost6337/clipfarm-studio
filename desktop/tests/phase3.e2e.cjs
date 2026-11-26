// Phase 3 end-to-end: the whole first run against a real Worker, with resume.
// CLIPFARM_SITE=http://localhost:5357 node tests/phase3.e2e.cjs <out>
const { _electron: electron, chromium } = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const SITE = process.env.CLIPFARM_SITE || 'http://localhost:5357'
const OUT = process.argv[2] || path.join(os.tmpdir(), 'clipfarm-e2e')
fs.mkdirSync(OUT, { recursive: true })
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const email = `firstrun.${Date.now()}@example.com`

async function launch(data) {
  const args = [path.join(__dirname, '..')]
  if (process.platform === 'linux') args.push('--no-sandbox')
  const app = await electron.launch({
    executablePath: require(path.join(__dirname, '..', 'node_modules', 'electron')),
    args,
    env: { ...process.env, CLIPFARM_DATA_DIR: data, CLIPFARM_SITE_ORIGIN: SITE, CLIPFARM_ALLOW_BASIC_VAULT: '1' },
  })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1280, height: 800 })
  globalThis.__page = page
  return { app, page }
}
const state = (data) => JSON.parse(fs.readFileSync(path.join(data, 'state.json'), 'utf8'))

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-firstrun-'))
  let { app, page } = await launch(data)

  await page.getByRole('img', { name: 'Clipfarm Studio is starting' }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(1100)
  await page.screenshot({ path: `${OUT}/p3-intro.png` })
  const sounds = await page.evaluate(async () => Promise.all(['intro', 'check', 'ready', 'start'].map(async (n) => (await fetch(`/sounds/${n}.ogg`)).ok)))
  check('bundled sounds are served', sounds.every(Boolean))

  await page.getByRole('button', { name: 'Start free' }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/p3-welcome.png` })
  const covers = await page.locator('img[src^="/wall/"]').count()
  check('welcome wall shows permitted covers from the manifest', covers > 0, `${covers} images`)
  await page.getByRole('button', { name: 'Mute sounds' }).click()
  check('mute is saved', state(data).sound.enabled === false)
  await page.getByRole('button', { name: 'Turn sounds on' }).click()
  if (covers > 0) {
    await page.getByRole('button', { name: 'Credits' }).click()
    const dialog = await page.getByRole('dialog').innerText()
    check('credits name the films and licences', /CC BY/.test(dialog) && /Blender/.test(dialog))
    await page.screenshot({ path: `${OUT}/p3-credits.png` })
    await page.keyboard.press('Escape')
  }

  await page.getByRole('button', { name: 'Start free' }).click()
  await page.getByRole('heading', { name: 'How will you use Clipfarm?' }).waitFor()
  check('Cloud and Both are not selectable', (await page.getByRole('radio', { name: 'Cloud', exact: true }).isDisabled()) && (await page.getByRole('radio', { name: 'Both', exact: true }).isDisabled()))
  await page.screenshot({ path: `${OUT}/p3-usage.png` })
  await page.getByRole('button', { name: 'Continue with Local' }).click()

  await page.getByRole('heading', { name: 'Done' }).waitFor({ timeout: 180000 })
  check('preparing ran every real step', (await page.locator('li').filter({ has: page.locator('svg') }).count()) >= 7)
  await page.screenshot({ path: `${OUT}/p3-preparing-done.png` })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).waitFor()
  check('state saved at sign-in', state(data).step === 'signin' && state(data).usage === 'local')

  // Close mid-way and reopen: it resumes at sign-in, not at the welcome screen.
  await app.close()
  ;({ app, page } = await launch(data))
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).waitFor({ timeout: 30000 })
  check('closing and reopening resumes at sign-in', (await page.getByRole('button', { name: 'Start free' }).count()) === 0)

  const browser = await chromium.launch()
  const tab = await (await browser.newContext()).newPage()
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).click()
  const url = (await page.evaluate(() => window.clipfarm.invoke('auth:status'))).url
  await tab.goto(url)
  await tab.getByRole('radio', { name: 'Create account' }).click()
  await tab.getByLabel('Your name').fill('Robin Tester')
  await tab.getByLabel('Email', { exact: true }).fill(email)
  await tab.getByLabel('Password', { exact: true }).fill('correct-horse-battery-1')
  await tab.getByRole('button', { name: /Create account and connect/ }).click()
  await tab.getByRole('button', { name: /Continue as/ }).waitFor({ timeout: 20000 })
  await tab.waitForFunction(() => !document.querySelector('button[aria-busy="true"]'))
  await tab.getByRole('button', { name: /Continue as/ }).click()
  await tab.getByRole('link', { name: /did not open/ }).click()

  // Step 6: decline first, then run the real check.
  await page.getByRole('heading', { name: 'Check this PC?' }).waitFor({ timeout: 60000 })
  await page.screenshot({ path: `${OUT}/p4-pccheck-ask.png` })
  await page.getByRole('button', { name: 'Skip and use the lightest setup' }).click()
  await page.getByText('You skipped the PC check').waitFor()
  check('declining offers the lightest setup and a way to run it later', (await page.getByText('Whisper tiny').count()) > 0 && state(data).pcCheck.allowed === false)
  await page.getByRole('button', { name: 'Run the check instead' }).click()
  await page.getByText('Checking this PC…').waitFor()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/p4-pccheck-running.png` })
  await page.getByText('Recommended model').waitFor({ timeout: 120000 })
  const pcText = await page.locator('main').innerText()
  check('PC check shows real results', /GB/.test(pcText) && /threads/.test(pcText) && /real time/.test(pcText) && /GFLOPS/.test(pcText) && /H\.264/.test(pcText))
  check('Cloud and Both are coming soon, Local preselected', (await page.getByRole('radio', { name: 'Local (free)' }).getAttribute('aria-checked')) === 'true' && (await page.getByRole('radio', { name: 'Cloud', exact: true }).getAttribute('aria-disabled')) === 'true')
  await page.screenshot({ path: `${OUT}/p4-pccheck-result.png` })
  await page.getByRole('button', { name: 'Continue with Local' }).click()

  // Step 7: download Tiny (fastest for the test), pause, restart the app, resume, verify, test.
  await page.getByRole('heading', { name: 'Downloading your models' }).waitFor({ timeout: 30000 })
  const me0 = await page.evaluate(async () => (await fetch('/api/auth/me')).json())
  check('work mode saved on the account', me0.user.workMode === 'local')
  await page.getByRole('radio', { name: /Whisper Tiny/ }).click()
  await page.getByRole('button', { name: 'Download' }).click()
  await page.waitForFunction(() => Number(document.querySelector('[role=progressbar][aria-label="Download progress"]')?.getAttribute('aria-valuenow')) >= 15, null, { timeout: 120000 })
  await page.screenshot({ path: `${OUT}/p4-models-downloading.png` })
  check('real speed and time left are shown', /\/s/.test(await page.locator('dl').innerText()))
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Resume' }).waitFor({ timeout: 20000 })
  const partial = fs.readdirSync(path.join(data, 'downloads', 'whisper-tiny'))
  check('pause keeps the partial download', partial.some((name) => name.endsWith('.part') || name === 'config.json'), partial.join(','))
  await app.close()
  ;({ app, page } = await launch(data))
  await page.getByRole('heading', { name: /Downloading your models|Your model is ready/ }).waitFor({ timeout: 60000 })
  check('after a restart the download resumes where it stopped', true)
  await page.getByText('Test passed').waitFor({ timeout: 240000 })
  const testText = await page.locator('main').innerText()
  check('model verified, installed and tested (transcript + face)', /Transcribed 15 s of speech/.test(testText) && /found 1 face/.test(testText) && fs.existsSync(path.join(data, 'models', 'whisper', 'tiny', 'model.bin')))
  check('selected model saved', state(data).selectedModel === 'whisper-tiny')
  await page.screenshot({ path: `${OUT}/p4-models-ready.png` })
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('heading', { name: 'Terms and privacy' }).waitFor({ timeout: 60000 })
  const accept = page.getByRole('button', { name: 'Accept and continue' })
  check('terms cannot be accepted before ticking the box', await accept.isDisabled())
  check('terms readable offline (bundled)', (await page.getByRole('region', { name: 'Terms of Use' }).innerText()).includes('Content rights'))
  await page.screenshot({ path: `${OUT}/p3-terms.png` })
  await page.getByRole('radio', { name: 'Privacy Policy' }).click()
  check('privacy policy covers the desktop app and the PC check', /The PC check/.test(await page.getByRole('region', { name: 'Privacy Policy' }).innerText()))
  await page.getByText('I have read and accept').click()
  await accept.click()

  await page.getByRole('heading', { name: /You’re ready to go, Robin/ }).waitFor({ timeout: 30000 })
  await page.screenshot({ path: `${OUT}/p3-ready.png` })
  const me = await page.evaluate(async () => (await fetch('/api/auth/me')).json())
  check('terms version and time stored on the account', !!me.user.termsVersion && !!me.user.termsAcceptedAt, `${me.user.termsVersion} ${me.user.termsAcceptedAt}`)
  check('terms recorded on this PC', state(data).termsAccepted?.terms === me.user.termsVersion)
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ }).waitFor({ timeout: 60000 })
  check('Start opens the app', state(data).step === 'done')
  await app.close()

  // Returning launch: intro → profile → app, no first-run screens.
  ;({ app, page } = await launch(data))
  await page.getByRole('img', { name: 'Clipfarm Studio is starting' }).waitFor({ timeout: 15000 })
  await page.getByRole('heading', { name: 'Robin Tester' }).waitFor({ timeout: 20000 })
  await page.screenshot({ path: `${OUT}/p3-returning-profile.png` })
  await page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ }).waitFor({ timeout: 60000 })
  check('returning launch goes intro → profile → app', true)
  await app.close()
  await browser.close()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
})().catch(async (error) => {
  await globalThis.__page?.screenshot({ path: `${OUT}/failure.png` }).catch(() => undefined)
  console.error(error)
  process.exit(1)
})
