// Run with app.local_testing:app on :8011 and Vite proxying to it on :5174.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const base = 'http://127.0.0.1:5174'
  for (const path of ['/login', '/signup', '/']) {
    await page.goto(base + path)
    await page.getByRole('heading', { name: 'Open wardrobe' }).waitFor()
    await page.getByText('Local testing', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Account menu' }).count(), 0)
    assert.equal(new URL(page.url()).pathname, '/')
  }
  await page.getByRole('button', { name: 'View Pink T-shirt', exact: true }).click()
  await page.getByRole('link', { name: 'Use in outfit' }).click()
  await page.locator('.canvas-item').waitFor()
  await page.getByRole('button', { name: 'Shuffle everything' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.canvas-item').length === 4)
  for (const path of ['/upload', '/calendar']) {
    await page.goto(base + path)
    await page.getByText('Local testing', { exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, path)
  }
  assert.deepEqual(await context.cookies(), [])
  assert.deepEqual(errors, [])
  const me = await context.request.get(base + '/api/auth/me')
  assert.equal(me.status(), 200)
  assert.equal((await me.json()).local_testing, true)
  const signup = await context.request.post(base + '/api/auth/signup', { data: {} })
  assert.equal(signup.status(), 404)
  console.log('PASS: fresh cookie-free access, auth URL redirects, closet, outfit selection, upload/calendar navigation; signup disabled.')
} finally {
  await browser.close()
}
