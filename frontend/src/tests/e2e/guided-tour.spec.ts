import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const screenshotDir = '../docs/screenshots/guided-tour';
const forbidden = /raw_lyrics|lyrics_text|full_lyrics|lyric_lines/i;

test.use({ video: 'on', viewport: { width: 1440, height: 1000 } });

test('guided demo assistant walks through the full product', async ({ page }, testInfo) => {
  mkdirSync(screenshotDir, { recursive: true });
  await page.goto('/');
  const launch = page.getByTestId('guide-launch');
  if (await launch.isVisible()) {
    await launch.click();
  }
  await expect(page.getByTestId('guide-panel')).toBeVisible();

  const total = await page.locator('.guide-step-map button').count();
  expect(total).toBeGreaterThanOrEqual(20);

  for (let index = 0; index < total; index += 1) {
    await expect(page.getByTestId('guide-panel')).toBeVisible();
    await expect(page.locator('.guide-focus').first()).toBeVisible({ timeout: 7000 });
    await expect(page.locator('body')).not.toContainText(forbidden);
    await page.screenshot({
      fullPage: false,
      path: `${screenshotDir}/step-${String(index + 1).padStart(2, '0')}.png`
    });
    if (index < total - 1) {
      await page.getByTestId('guide-next').click();
    }
  }

  await testInfo.attach('guided-tour-last-frame', {
    path: `${screenshotDir}/step-${String(total).padStart(2, '0')}.png`,
    contentType: 'image/png'
  });
});
