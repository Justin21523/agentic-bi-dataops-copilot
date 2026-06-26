import { expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';

const docsRoot = path.resolve(process.cwd(), '..', 'docs');
const pageShotRoot = path.join(docsRoot, 'screenshots', 'pages');
const tourShotRoot = path.join(docsRoot, 'screenshots', 'guided-tour');
const videoRoot = path.join(docsRoot, 'videos');

const pages = [
  { path: '/upload', slug: 'upload', heading: /Data Journey Entry|資料旅程入口/i },
  { path: '/', slug: 'dashboard', heading: /Dashboard|儀表板/i },
  { path: '/workflow', slug: 'workflow', heading: /Workflow|資料旅程|流程/i },
  { path: '/query', slug: 'nl-query', heading: /Natural Language Query|自然語言查詢/i },
  { path: '/playground', slug: 'sql-playground', heading: /SQL Playground|SQL 工作台/i },
  { path: '/history', slug: 'query-history', heading: /Query History|查詢歷史/i },
  { path: '/dq', slug: 'data-quality', heading: /Data Quality Report|資料品質報告/i },
  { path: '/schema', slug: 'schema-explorer', heading: /Schema Explorer|Schema/i },
  { path: '/customers', slug: 'customers', heading: /Customer|客戶/i },
  { path: '/products', slug: 'products', heading: /Product Performance Matrix|產品績效矩陣/i },
  { path: '/funnel', slug: 'funnel', heading: /Funnel & Cohort Analysis|漏斗與世代分析/i },
  { path: '/revenue', slug: 'revenue', heading: /Revenue Intelligence|收入智慧/i },
  { path: '/guardrails', slug: 'guardrails', heading: /Guardrail Analytics|護欄分析/i },
  { path: '/insights', slug: 'insights', heading: /Auto Insights|自動洞察/i },
];

async function prepareEnglish(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
  });
}

async function waitForPage(page: Page, heading: RegExp) {
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(900);
}

async function captureViewportSlices(page: Page, dir: string) {
  mkdirSync(dir, { recursive: true });
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.png')) rmSync(path.join(dir, file));
  }

  const viewportHeight = page.viewportSize()?.height ?? 900;
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const maxY = Math.max(0, scrollHeight - viewportHeight);
  const step = Math.max(400, viewportHeight - 120);
  const positions: number[] = [];
  for (let y = 0; y < maxY; y += step) positions.push(y);
  if (!positions.includes(maxY)) positions.push(maxY);

  for (let i = 0; i < positions.length; i += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), positions[i]);
    await page.waitForTimeout(350);
    await page.screenshot({
      fullPage: false,
      path: path.join(dir, `${String(i + 1).padStart(2, '0')}.png`),
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.use({ viewport: { width: 1440, height: 900 }, video: 'off' });

test('capture every active application page as viewport-sized screenshots', async ({ page }) => {
  mkdirSync(pageShotRoot, { recursive: true });
  await prepareEnglish(page);

  for (const entry of pages) {
    await page.goto(`${entry.path}${entry.path === '/' ? '?' : '?'}noTour=1`);
    await waitForPage(page, entry.heading);
    await expect(page.locator('body')).not.toContainText(/Failed to fetch|Unhandled|Traceback/i);
    await captureViewportSlices(page, path.join(pageShotRoot, entry.slug));
  }
});

test('record the 16-step BI journey tour and capture each step', async ({ browser }) => {
  mkdirSync(tourShotRoot, { recursive: true });
  mkdirSync(videoRoot, { recursive: true });
  for (const file of readdirSync(tourShotRoot)) {
    if (file.endsWith('.png')) rmSync(path.join(tourShotRoot, file));
  }
  const existingVideo = path.join(videoRoot, 'guided-tour.webm');
  if (existsSync(existingVideo)) rmSync(existingVideo);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoRoot, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await prepareEnglish(page);
  await page.goto('/');

  await expect(page.getByText(/1 \/ 16/)).toBeVisible({ timeout: 15000 });
  for (let index = 0; index < 16; index += 1) {
    await expect(page.getByText(new RegExp(`${index + 1} / 16`))).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(900);
    await page.screenshot({
      fullPage: false,
      path: path.join(tourShotRoot, `step-${String(index + 1).padStart(2, '0')}.png`),
    });
    if (index < 15) {
      await page.getByRole('button', { name: /Next|下一步/i }).click();
    }
  }

  const video = page.video();
  await context.close();
  const videoPath = await video?.path();
  if (videoPath && videoPath !== existingVideo) {
    renameSync(videoPath, existingVideo);
  }
  expect(existsSync(existingVideo)).toBeTruthy();
});
