import { expect, test } from '@playwright/test';

const forbidden = /raw_lyrics|lyrics_text|full_lyrics|lyric_lines/i;

test('main pages render without raw lyric fields', async ({ page }) => {
  for (const path of ['/', '/stories', '/workflow', '/lineage', '/ml-lab', '/explainability', '/topics', '/sentiment', '/artists', '/similar', '/timeline', '/evaluation', '/reports', '/licensing']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText(forbidden);
  }
});

test('language switch works', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/語言|Language/).selectOption('en-US');
  await expect(page.getByText('Overview')).toBeVisible();
});
