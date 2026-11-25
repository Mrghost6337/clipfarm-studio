// Phase 1 end-to-end: launches the real app (Electron + the real pipeline),
// checks the preparation screen, the CSP, the proxy, crash recovery and the
// Studio. Usage: node tests/phase1.e2e.cjs <screenshot-dir>
const { _electron: electron } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OUT = process.argv[2] || path.join(os.tmpdir(), 'clipfarm-e2e')
fs.mkdirSync(OUT, { recursive: true })
/** Newest running pipeline process id, on Linux or Windows. */
function pipelinePid() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*pipeline.cli serve*' -and $_.Name -like 'python*' } | Sort-Object CreationDate | Select-Object -Last 1 -ExpandProperty ProcessId"`).toString().trim()
      return out
    }
    return execSync(`pgrep -f "pipeline[.]cli serve" -n`).toString().trim()
  } catch {
    return ''
  }
}

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

;(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'clipfarm-data-'))
  const executablePath = process.env.CLIPFARM_EXE || require(path.join(__dirname, '..', 'node_modules', 'electron'))
  const args = process.env.CLIPFARM_EXE ? [] : [path.join(__dirname, '..')]
  if (process.platform === 'linux') args.push('--no-sandbox')
  const app = await electron.launch({ executablePath, args, env: { ...process.env, CLIPFARM_DATA_DIR: data } })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1280, height: 800 })

  await page.getByText('Done', { exact: true }).waitFor({ timeout: 180000 })
  check('preparation finished with real steps', (await page.locator('li').count()) === 7)
  await page.screenshot({ path: `${OUT}/p1-prepare-done.png` })

  const bounds = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return { min: win.getMinimumSize(), sandboxed: win.webContents.getLastWebPreferences().sandbox, isolation: win.webContents.getLastWebPreferences().contextIsolation, node: win.webContents.getLastWebPreferences().nodeIntegration }
  })
  check('minimum window size 1200×760', bounds.min[0] === 1200 && bounds.min[1] === 760, JSON.stringify(bounds.min))
  check('sandbox + context isolation, no node', bounds.sandboxed === true && bounds.isolation === true && bounds.node === false)
  check('no Node in the page', await page.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined'))

  const csp = await page.evaluate(async () => (await fetch('/')).headers.get('content-security-policy'))
  check('strict CSP on the page', !!csp && csp.includes("connect-src 'self'") && !csp.includes('unsafe-eval;') && csp.includes("object-src 'none'"), csp)
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://cdn.jsdelivr.net/npm/react')
      return false
    } catch {
      return true
    }
  })
  check('CSP blocks third-party fetches', blocked)

  const health = await page.evaluate(async () => (await fetch('/pipeline-api/health')).json())
  check('pipeline reachable through the app proxy', health.service === 'clipfarm-pipeline' && health.host === 'desktop', JSON.stringify(health))
  const jobs = await page.evaluate(async () => (await fetch('/pipeline-api/jobs')).status)
  check('proxy adds the launch token (page has none)', jobs === 200)
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
  })
  check('bundled Inter Tight loaded', fonts.some((f) => f.includes('Inter Tight')), fonts.join(','))

  // Crash recovery: kill the Python process; the app must restart it.
  const before = await app.evaluate(() => 0)
  const pid = pipelinePid()
  const portBefore = health
  if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /F`)
  else process.kill(Number(pid), 'SIGKILL')
  let newPid = ''
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    newPid = pipelinePid()
    if (newPid && newPid !== pid) break
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  const restarted = await page.waitForFunction(async () => {
    try {
      const r = await fetch('/pipeline-api/health')
      return r.ok
    } catch {
      return false
    }
  }, null, { timeout: 60000, polling: 500 }).then(() => true).catch(() => false)
  check('pipeline restarts after a crash', restarted && newPid !== pid, `${pid} → ${newPid}`)
  void before
  void portBefore

  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Log in or sign up via browser' }).waitFor({ timeout: 30000 })
  check('preparation continues to browser sign-in', true)
  await page.screenshot({ path: `${OUT}/p1-signin.png` })

  await app.close()
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const after = pipelinePid()
  check('pipeline stops when the app quits', !after, after || 'none')

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
