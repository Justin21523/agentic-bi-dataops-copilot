import { test } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../../docs/screenshots')

const PAGES = [
  { route: '/',           name: 'dashboard' },
  { route: '/workflow',   name: 'workflow' },
  { route: '/query',      name: 'nl-query' },
  { route: '/playground', name: 'sql-playground' },
  { route: '/history',    name: 'query-history' },
  { route: '/dq',         name: 'data-quality' },
  { route: '/schema',     name: 'schema-explorer' },
  { route: '/customers',  name: 'customers' },
  { route: '/products',   name: 'products' },
  { route: '/funnel',     name: 'funnel-cohort' },
  { route: '/revenue',    name: 'revenue' },
  { route: '/guardrails', name: 'guardrails' },
  { route: '/insights',   name: 'insights' },
  { route: '/upload',     name: 'upload' },
]

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

for (const { route, name } of PAGES) {
  test(`Screenshot: ${name}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForTimeout(3000)

    // Close journey tour panel if it appeared (auto-starts after 1s)
    const journeyHeader = page.locator('text=DataOps Journey').first()
    if (await journeyHeader.isVisible({ timeout: 500 }).catch(() => false)) {
      // Find and click the X close button in the journey panel header
      const closeBtn = page.locator('.fixed button').filter({ has: page.locator('svg') }).first()
      // The X is in the header div of the panel - target it specifically
      const panelXBtn = page.locator('[style*="z-index: 9999"] button').last()
      if (await panelXBtn.isVisible().catch(() => false)) {
        await panelXBtn.click()
        await page.waitForTimeout(400)
      }
    }

    const viewportHeight = 900
    const scrollHeight: number = await page.evaluate(() => document.documentElement.scrollHeight)

    if (scrollHeight <= viewportHeight * 1.2) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `page-${name}-1.png`),
        fullPage: false,
      })
    } else {
      let scrollY = 0
      let idx = 1
      const step = Math.floor(viewportHeight * 0.85)
      while (scrollY < scrollHeight && idx <= 6) {
        await page.evaluate((y) => window.scrollTo(0, y), scrollY)
        await page.waitForTimeout(400)
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `page-${name}-${idx}.png`),
          fullPage: false,
        })
        scrollY += step
        idx++
      }
      await page.evaluate(() => window.scrollTo(0, 0))
    }
  })
}
