// Start backend/tests/preview_app.py on :8011 and Vite with API_PROXY_TARGET on :5174.
// PLAYWRIGHT_MODULE may point to an existing local Playwright installation.
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const output = process.env.SCREENSHOT_DIR || '/tmp/wardrobe-smoke'
await mkdir(output, { recursive: true })
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5174'
const shot = name => page.screenshot({ path: `${output}/${name}.png` })
const settleImages = () => page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))))
const noPageOverflow = async () => {
  const layout = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  assert.ok(layout.scrollWidth <= layout.width + 1 && layout.scrollHeight <= layout.height + 1, JSON.stringify(layout))
}
try {
  await page.goto(`${base}/login`)
  await page.getByLabel('Username or email').fill('preview')
  await page.getByLabel('Password', { exact: true }).fill('preview-pass')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('heading', { name: 'Open wardrobe' }).waitFor()
  await page.getByRole('button', { name: 'View Blue tops 101', exact: true }).waitFor()
  await settleImages()
  await noPageOverflow()
  await shot('01-wardrobe-desktop')
  await page.getByRole('button', { name: 'Next shirts', exact: true }).click()
  await page.getByRole('button', { name: 'View Blue tops 097', exact: true }).waitFor()
  await page.locator('.wardrobe-section--tops .section-open').click()
  await page.getByText('101 pieces · Page 1 of 9', { exact: true }).waitFor()
  assert.equal(await page.locator('.browse-grid .wardrobe-piece').count(), 12)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await page.getByText('101 pieces · Page 2 of 9', { exact: true }).waitFor()
  const firstName = await page.locator('.browse-grid .wardrobe-piece').first().getAttribute('aria-label')
  await page.locator('.browse-grid .wardrobe-piece').first().click()
  await page.getByRole('dialog').waitFor()
  await shot('02-piece-detail')
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await page.locator('.browse-grid .wardrobe-piece').first().getAttribute('aria-label'), firstName)
  await page.reload()
  await page.getByText('101 pieces · Page 2 of 9', { exact: true }).waitFor()
  await settleImages()
  await shot('03-expanded-category')
  await page.getByRole('button', { name: 'Back to closet' }).click()
  await page.getByRole('button', { name: 'View Blue tops 097', exact: true }).waitFor()
  await page.getByRole('searchbox').fill('blue shirts 005')
  await page.getByText('1 piece · Page 1 of 1', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'View Blue tops 005', exact: true }).click()
  await page.getByRole('link', { name: 'Use in outfit' }).click()
  await page.locator('.canvas-item').waitFor()
  assert.equal(await page.locator('.canvas-item').count(), 1)
  await page.getByRole('button', { name: 'Shuffle everything' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.canvas-item').length === 4)
  await settleImages()
  await noPageOverflow()
  await shot('04-outfits')
  await page.getByRole('button', { name: 'Save outfit', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.canvas-item').length === 0)
  await page.getByRole('link', { name: 'Calendar', exact: true }).click()
  await page.locator('.calendar__cell--has').first().waitFor()
  await settleImages()
  await shot('05-calendar')
  await page.locator('.calendar__cell--has').first().click()
  await page.locator('.outfit-render__item').first().waitFor()
  assert.equal(await page.locator('.outfit-render__item').count(), 4)
  await shot('06-outfit-detail')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.goto(`${base}/upload?category=pants`)
  await page.getByRole('heading', { name: 'Make room for a new piece' }).waitFor()
  assert.ok(await page.locator('input[value="pants"]').isChecked())
  await shot('07-upload')
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const [path, name] of [['/', 'wardrobe'], ['/?category=tops', 'category'], ['/upload', 'upload'], ['/ootd', 'outfits'], ['/calendar', 'calendar']]) {
      await page.goto(base + path)
      await page.waitForTimeout(600)
      await settleImages()
      await noPageOverflow()
      await shot(`${name}-${viewport.width}`)
      // Fixed page overflow must not hide primary actions outside every scroll region.
      const clipped = await page.evaluate(() => [...document.querySelectorAll('button, input')].filter(e => {
        const r = e.getBoundingClientRect()
        if (r.width < 2 || r.height < 2 || getComputedStyle(e).visibility === 'hidden') return false
        let p = e.parentElement
        while (p && p !== document.body) {
          if (/(auto|scroll)/.test(getComputedStyle(p).overflowY + getComputedStyle(p).overflowX)) return false
          p = p.parentElement
        }
        return r.right > innerWidth + 1 || r.bottom > innerHeight + 1
      }).map(e => e.textContent || e.id))
      assert.deepEqual(clipped, [], `${name} ${viewport.width}: clipped controls`)
    }
  }
  await page.goto(`${base}/?q=does-not-exist`)
  await page.getByRole('heading', { name: 'No pieces found' }).waitFor()
  await shot('08-no-results')
  await page.route('**/api/garments/browse*', route => route.fulfill({ status: 500, body: '{}' }))
  await page.goto(`${base}/?category=tops`)
  await page.getByRole('button', { name: 'Try again', exact: true }).waitFor()
  await page.unroute('**/api/garments/browse*')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.locator('.browse-grid .wardrobe-piece').first().waitFor()
  assert.deepEqual(errors, [])
  console.log(`PASS: large closet, pagination, URL persistence, search, detail, outfit handoff/save, calendar, retry, 3 viewport sizes. Screenshots: ${output}`)
} finally {
  await browser.close()
}
