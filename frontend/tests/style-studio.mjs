// No-login local app on :5174. Creates and removes only its own test outfit.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
const base = 'http://127.0.0.1:5174'
let createdId
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const [path, name] of [['/', 'today'], ['/wardrobe', 'wardrobe'], ['/studio', 'studio'], ['/journal', 'journal'], ['/journal?view=calendar', 'calendar'], ['/upload', 'upload']]) {
      await page.goto(base + path)
      await page.locator('.page h1').waitFor()
      await page.waitForTimeout(450)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), `${name} ${width} overflow`)
      await page.screenshot({ path: `/tmp/style-${name}-${width}.png` })
    }
  }
  await page.goto(base + '/?category=tops&page=2')
  await page.waitForURL('**/wardrobe?category=tops&page=2')
  await page.goto(base + '/ootd?garment=1')
  await page.waitForURL('**/studio?garment=1')
  await page.locator('.canvas-item').waitFor()
  await page.getByRole('button', { name: 'Shuffle everything' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.canvas-item').length === 4)
  await page.getByLabel('Note', { exact: true }).fill('Automated style studio test')
  const saved = page.waitForResponse(r => r.url().endsWith('/api/outfits/') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Save outfit', exact: true }).click()
  createdId = (await (await saved).json()).id
  assert.ok(createdId)
  await page.waitForURL(`**/journal?outfit=${createdId}`)
  await page.getByRole('dialog').waitFor()
  await page.getByRole('link', { name: 'Wear it again', exact: true }).click()
  await page.waitForURL(`**/studio?outfit=${createdId}`)
  await page.waitForFunction(() => document.querySelectorAll('.canvas-item').length === 4)
  await page.goto(base + `/journal?outfit=${createdId}`)
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.goto(base + '/calendar')
  await page.waitForURL('**/journal?view=calendar')
  await page.route('**/api/outfits/browse*', route => route.fulfill({ json: { items: [], total: 0, page: 1, pages: 1 } }))
  await page.goto(base + '/journal')
  await page.getByRole('heading', { name: 'The first of many.' }).waitFor()
  await page.goto(base + '/')
  await page.getByRole('heading', { name: 'Your story starts with a look.' }).waitFor()
  await page.unroute('**/api/outfits/browse*')
  await page.route('**/api/outfits/browse*', route => route.fulfill({ status: 500, body: '{}' }))
  await page.goto(base + '/journal')
  await page.getByRole('button', { name: 'Try again' }).waitFor()
  await page.unroute('**/api/outfits/browse*')
  await page.getByRole('button', { name: 'Try again' }).click()
  await page.locator('.journal-card').first().waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS: all sections at three sizes, legacy links, save→journal, wear again, dialog Escape, empty states, retry.')
} finally {
  if (createdId) {
    const result = await page.request.delete(`${base}/api/outfits/${createdId}`)
    assert.equal(result.status(), 204)
  }
  await browser.close()
}
