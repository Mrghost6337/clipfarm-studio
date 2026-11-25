// The website still works: the parity checklist from CLAUDE.md, against the
// running site (bun run dev). CLIPFARM_SITE=http://localhost:5357 node tests/website-parity.e2e.cjs <out>
const { chromium } = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const SITE = process.env.CLIPFARM_SITE || 'http://localhost:5357'
const OUT = process.argv[2] || path.join(os.tmpdir(), 'clipfarm-parity')
fs.mkdirSync(OUT, { recursive: true })
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  // Answer the cookie banner up front so it is not mistaken for the Studio setup dialog.
  await page.addInitScript(() => localStorage.setItem('clipfarm.consent', JSON.stringify({ choice: 'essential', at: new Date().toISOString() })))
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(`${SITE}/`)
  await page.getByRole('link', { name: 'Start free' }).first().waitFor()
  check('home hero', (await page.locator('h1').innerText()).includes('AI clip farming'))
  await page.getByText('Real GTA VI clips.').scrollIntoViewIfNeeded()
  check('GTA VI clip rail links to the original uploads', (await page.locator('a[href^="https://www.youtube.com/watch?v="]').count()) >= 6)
  await page.screenshot({ path: `${OUT}/home.png` })

  await page.goto(`${SITE}/styleguide`)
  await page.getByRole('heading', { name: 'Cards' }).waitFor()
  check('/styleguide renders', true)
  await page.goto(`${SITE}/download`)
  check('/download keeps Windows and macOS as Coming soon until a release exists', (await page.getByText('Coming soon', { exact: true }).count()) === 2)
  await page.screenshot({ path: `${OUT}/download.png` })

  await page.goto(`${SITE}/app-login?state=abcdefgh123&challenge=${'a'.repeat(43)}`)
  await page.waitForURL(/\/desktop\/authorize\?state=abcdefgh123/)
  check('/app-login redirects to /desktop/authorize with its query', true)
  await page.getByRole('link', { name: 'Continue with Google' }).waitFor()
  check('/desktop/authorize offers Google and email', (await page.getByLabel('Email', { exact: true }).count()) === 1)

  const email = `parity.${Date.now()}@example.com`
  await page.goto(`${SITE}/signup`)
  await page.getByLabel('Your name').fill('Parity Check')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery-1')
  await page.getByRole('button', { name: 'Create account' }).last().click()
  await page.waitForURL(/onboarding|dashboard/)
  await page.goto(`${SITE}/dashboard`)
  await page.waitForURL(/onboarding|dashboard/)
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }))
  await page.goto(`${SITE}/login`)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery-1')
  await page.getByRole('button', { name: 'Log in' }).last().click()
  await page.waitForURL(/onboarding|dashboard/)
  check('/login → app', true, page.url())
  await page.evaluate(() => fetch('/api/auth/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skip: true }) }))
  await page.goto(`${SITE}/dashboard`)
  await page.getByText('Clips this month').waitFor()
  check('/dashboard shows the Free plan', (await page.getByText('Free', { exact: true }).count()) > 0)

  await page.goto(`${SITE}/studio`)
  await page.getByRole('dialog').waitFor()
  check('Studio setup modal opens for an account without a work mode', true)
  await page.evaluate(() => fetch('/api/auth/preferences', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workMode: 'local' }) }))
  await page.goto(`${SITE}/studio`)
  await page.waitForTimeout(1500)
  check('Studio skips the modal once the work mode was chosen (e.g. in the app)', (await page.getByRole('dialog').count()) === 0)

  check('no page errors', errors.length === 0, errors.join(' | '))
  await browser.close()
  process.exit(results.every(Boolean) ? 0 : 1)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
