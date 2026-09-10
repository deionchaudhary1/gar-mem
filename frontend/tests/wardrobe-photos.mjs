// Run against the isolated preview with WARDROBE_REAL_PHOTOS=1.
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
const output = process.env.SCREENSHOT_DIR || '/tmp/wardrobe-photos'
await mkdir(output, { recursive: true })
try {
  await page.goto('http://127.0.0.1:5174/login')
  await page.getByLabel('Username or email').fill('preview')
  await page.getByLabel('Password', { exact: true }).fill('preview-pass')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('heading', { name: 'Open wardrobe' }).waitFor()
  assert.equal(await page.locator('.hanger').count(), 0)
  for (const width of [1440, 900, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.locator('.wardrobe-piece img').first().waitFor()
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())))
    assert.equal(await page.locator('.wardrobe-piece img').count(), 10)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight))
    await page.screenshot({ path: `${output}/closet-${width}.png` })
  }
  await page.locator('.wardrobe-section--tops .wardrobe-piece').first().click()
  await page.getByRole('dialog').waitFor()
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())))
  await page.screenshot({ path: `${output}/detail.png` })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Next shirts', exact: true }).click()
  await page.getByRole('button', { name: 'View Blue tops 097', exact: true }).waitFor()
  await page.locator('.wardrobe-section--tops .section-open').click()
  await page.getByText('101 pieces · Page 1 of 9', { exact: true }).waitFor()
  assert.equal(await page.locator('.browse-grid .wardrobe-piece').count(), 12)
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())))
  await page.screenshot({ path: `${output}/category.png` })
  console.log(`PASS: real photos load, 3 viewport sizes fit, details, shelf paging, category browsing. Screenshots: ${output}`)
} finally {
  await browser.close()
}
