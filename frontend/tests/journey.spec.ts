import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../../docs/screenshots')

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

test('Journey Tour — all 16 steps', async ({ page }) => {
  await page.goto('/')

  // Tour auto-starts after 1s; wait 2s to be safe
  await page.waitForTimeout(2000)

  // Confirm journey panel is visible ("Data Journey" is the panel header text)
  const header = page.locator('text=Data Journey').first()
  await expect(header).toBeVisible({ timeout: 6000 })

  for (let step = 1; step <= 16; step++) {
    // Wait for page navigation + chart scroll to settle
    await page.waitForTimeout(1500)

    const padded = String(step).padStart(2, '0')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `journey-step-${padded}.png`),
      fullPage: false,
    })

    if (step < 16) {
      // Click "下一步" (Next) button
      const nextBtn = page.locator('button', { hasText: '下一步' }).first()
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click()
      }
    } else {
      // Last step: click "完成 ✓" (Done) button
      const doneBtn = page.locator('button', { hasText: '完成' }).first()
      if (await doneBtn.isVisible().catch(() => false)) {
        await doneBtn.click()
      }
    }
  }

  // Final screenshot after tour closes
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'journey-completed.png'),
    fullPage: false,
  })
})
