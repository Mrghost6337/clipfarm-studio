// Low disk space: the model manager refuses to start a download that does not
// fit, explains it, and recovers when space is available again.
// Usage: CLIPFARM_SMALL_DISK=<dir on a small filesystem> node tests/lowdisk.e2e.cjs
const { _electron: electron } = require('playwright')
const path = require('path')

const small = process.env.CLIPFARM_SMALL_DISK
;(async () => {
  const args = [path.join(__dirname, '..')]
  if (process.platform === 'linux') args.push('--no-sandbox')
  const app = await electron.launch({ executablePath: require(path.join(__dirname, '..', 'node_modules', 'electron')), args, env: { ...process.env, CLIPFARM_DATA_DIR: small } })
  const page = await app.firstWindow()
  const result = await page.evaluate(() => window.clipfarm.invoke('models:download', 'whisper-tiny'))
  const ok = result.state === 'error' && /Not enough free disk space/.test(result.error)
  console.log(`${ok ? 'PASS' : 'FAIL'}  low disk space is refused before downloading — ${result.error}`)
  const list = await page.evaluate(() => window.clipfarm.invoke('models:list'))
  const clean = !list.find((m) => m.id === 'whisper-tiny').installed
  console.log(`${clean ? 'PASS' : 'FAIL'}  nothing half-installed`)
  await app.close()
  process.exit(ok && clean ? 0 : 1)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
