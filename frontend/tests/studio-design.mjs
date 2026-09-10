import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
const base = 'http://127.0.0.1:5174'
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const [path, name] of [['/', 'closet'], ['/?category=tops', 'category'], ['/upload', 'upload'], ['/ootd', 'outfits'], ['/calendar', 'calendar']]) {
      await page.goto(base + path)
      await page.locator('.page h1').waitFor()
      if (path === '/ootd') {
        await page.waitForFunction(() => !document.querySelector('.page-head button').disabled)
        await page.getByRole('button', { name: 'Shuffle everything' }).click()
        await page.waitForFunction(() => document.querySelectorAll('.canvas-item').length === 4)
      }
      await page.waitForTimeout(350)
      const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, outside: [...document.querySelectorAll('main,.studio-page,.ootd,.ootd__rails,.ootd__stage')].map(el => ({ class: el.className, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top })) }))
      assert.ok(layout.sw <= layout.width && layout.sh <= layout.height, `${name} ${width} page overflow ${JSON.stringify(layout)}`)
      await page.screenshot({ path: `/tmp/studio-${name}-${width}.png` })
      const clipped = await page.evaluate(() => [...document.querySelectorAll('button,input')].filter(el => {
        const r = el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2 || getComputedStyle(el).visibility === 'hidden') return false
        let parent = el.parentElement
        while (parent && parent !== document.body) {
          if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY + getComputedStyle(parent).overflowX)) return false
          parent = parent.parentElement
        }
        return r.right > innerWidth + 1 || r.bottom > innerHeight + 1
      }).map(el => el.textContent || el.id))
      assert.deepEqual(clipped, [], `${name} ${width}: clipped controls`)
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(base + '/')
  const shelf = page.locator('.wardrobe-section--headwear .rack-pieces')
  await shelf.locator('button').first().waitFor()
  await shelf.hover()
  await page.mouse.wheel(400, 0)
  await page.waitForTimeout(150)
  assert.ok(await shelf.evaluate(el => el.scrollLeft > 200))
  await shelf.locator('button').nth(5).click()
  await page.getByRole('dialog').waitFor()
  await page.screenshot({ path: '/tmp/studio-piece-detail.png' })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.goto(base + '/upload')
  await page.locator('input[type=file]').setInputFiles('../backend/tests/fixtures/garments/shopping.webp')
  await page.locator('.dropzone__preview').waitFor()
  assert.ok(await page.getByRole('button', { name: 'Add to closet', exact: true }).isEnabled())
  await page.screenshot({ path: '/tmp/studio-upload-preview.png' })
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, body: '{}' }))
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/login', '/signup']) {
      await page.goto(base + path)
      await page.locator('.auth-card').waitFor()
      await page.screenshot({ path: `/tmp/studio-${path.slice(1)}-${width}.png` })
    }
  }
  assert.deepEqual(errors, [])
  console.log('PASS: all pages at three widths, no document overflow/clipped controls, outfit shuffle, shelf scroll, garment detail, upload preview, login/signup rendering.')
} finally { await browser.close() }
