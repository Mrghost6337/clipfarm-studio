// No internet during a model download: the download stops with a clear
// message, keeps what it has, and continues (verified) once online again.
const { _electron: electron } = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const launch = (data, extra = []) =>
  electron.launch({
    executablePath: require(path.join(__dirname, '..', 'node_modules', 'electron')),
    args: [path.join(__dirname, '..'), ...(process.platform === 'linux' ? ['--no-sandbox'] : []), ...extra],
    env: { ...process.env, CLIPFARM_DATA_DIR: data },
  })

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-offline-'))
  // 1. Online: start, let some bytes arrive, then pause (like closing the laptop lid).
  let app = await launch(data)
  let page = await app.firstWindow()
  void page.evaluate(() => window.clipfarm.invoke('models:download', 'whisper-small'))
  // Poll from Node: waitForFunction would treat an async predicate's Promise as truthy.
  for (let i = 0; i < 240; i++) {
    const base = (await page.evaluate(() => window.clipfarm.invoke('models:list'))).find((m) => m.id === 'whisper-small')
    if (base.progress && base.progress.received > 20e6) break
    await page.waitForTimeout(250)
  }
  await page.evaluate(() => window.clipfarm.invoke('models:pause', 'whisper-small'))
  await app.close()

  // 2. Offline (every request goes to a dead proxy): resuming fails with a clear message, keeps the bytes.
  app = await launch(data, ['--proxy-server=http://127.0.0.1:9'])
  page = await app.firstWindow()
  const before = (await page.evaluate(() => window.clipfarm.invoke('models:list'))).find((m) => m.id === 'whisper-small').progress.received
  const offline = await page.evaluate(() => window.clipfarm.invoke('models:download', 'whisper-small'))
  check('offline: the download stops with a clear message', offline.state === 'error' && /offline|stopped|ERR_/i.test(offline.error), offline.error)
  check('offline: the bytes already downloaded are kept', offline.received >= before, `${(before / 1e6).toFixed(1)} MB kept`)
  await app.close()

  // 3. Online again: it continues from where it stopped and installs after verification.
  app = await launch(data)
  page = await app.firstWindow()
  const done = await page.evaluate(() => window.clipfarm.invoke('models:download', 'whisper-small'))
  check('online again: resumes, verifies SHA-256 and installs', done.state === 'installed' && fs.existsSync(path.join(data, 'models', 'whisper', 'small', 'model.bin')), done.state)
  await app.close()
  process.exit(results.every(Boolean) ? 0 : 1)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
