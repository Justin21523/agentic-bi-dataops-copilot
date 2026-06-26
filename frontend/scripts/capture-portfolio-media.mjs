import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const docsRoot = resolve(repoRoot, 'docs');
const stepDir = resolve(docsRoot, 'screenshots/guided-tour');
const screenshotDir = resolve(docsRoot, 'screenshots');
const videoDir = resolve(docsRoot, 'videos');
const recordingDir = resolve(videoDir, 'playwright-recordings');

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5185';
const viewport = { width: 1440, height: 900 };
const stepDelayMs = Number(process.env.PORTFOLIO_CAPTURE_STEP_DELAY_MS ?? 2800);
const forbidden = /raw_lyrics|lyrics_text|full_lyrics|lyric_lines/i;

const featuredScreenshots = new Map([
  ['overview-hero', 'overview-viewport.png'],
  ['upload', 'workflow-viewport-01.png'],
  ['inspect', 'workflow-viewport-02.png'],
  ['ml-comparison', 'ml-lab-viewport-01.png'],
  ['tree', 'ml-lab-viewport-02.png'],
  ['evaluation-flow', 'evaluation-viewport.png'],
]);

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function assertNoRawLyrics(page) {
  const body = await page.locator('body').innerText();
  if (forbidden.test(body)) {
    throw new Error('Raw lyric field text was rendered during capture.');
  }
}

async function waitForGuideFocus(page) {
  await page.getByTestId('guide-panel').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('.guide-focus').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
}

mkdirSync(stepDir, { recursive: true });
mkdirSync(screenshotDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });
rmSync(recordingDir, { recursive: true, force: true });
mkdirSync(recordingDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  recordVideo: {
    dir: recordingDir,
    size: viewport,
  },
});
const page = await context.newPage();
const video = page.video();

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  const launch = page.getByTestId('guide-launch');
  if (await launch.isVisible()) {
    await launch.click();
  }

  await waitForGuideFocus(page);
  const steps = page.locator('.guide-step-map button');
  const total = await steps.count();
  if (total < 20) {
    throw new Error(`Expected at least 20 guide steps, received ${total}.`);
  }

  for (let index = 0; index < total; index += 1) {
    await waitForGuideFocus(page);
    await assertNoRawLyrics(page);
    await wait(stepDelayMs);

    const stepNumber = String(index + 1).padStart(2, '0');
    const stepPath = resolve(stepDir, `step-${stepNumber}.png`);
    await page.screenshot({ fullPage: false, path: stepPath });

    const activeStep = await page.locator('.guide-step-map button.active').getAttribute('data-testid');
    const stepKey = activeStep?.replace('guide-step-', '');
    const featuredName = stepKey ? featuredScreenshots.get(stepKey) : undefined;
    if (featuredName) {
      await page.screenshot({
        fullPage: false,
        path: resolve(screenshotDir, featuredName),
      });
    }

    if (index < total - 1) {
      await page.getByTestId('guide-next').click();
      await page.waitForLoadState('networkidle').catch(() => undefined);
    }
  }

  await wait(2500);
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

const recordedVideo = await video?.path();
if (!recordedVideo) {
  throw new Error('Playwright did not produce a guided-tour recording.');
}

copyFileSync(recordedVideo, resolve(videoDir, 'guided-tour.webm'));
console.log(`Captured ${viewport.width}x${viewport.height} screenshots and guided-tour.webm from ${baseURL}`);
