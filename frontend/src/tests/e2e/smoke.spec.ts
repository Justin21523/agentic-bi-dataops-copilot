import { expect, test, type Page } from '@playwright/test';

const routes = [
  { path: '/upload', nav: /Upload|資料匯入|上傳/i, heading: /Data Journey Entry|資料旅程入口/i },
  { path: '/', nav: /Dashboard|儀表板/i, heading: /Dashboard|儀表板/i },
  { path: '/workflow', nav: /Workflow|資料旅程|流程/i, heading: /Workflow|資料旅程|流程/i },
  { path: '/query', nav: /NL Query|自然語言/i, heading: /Natural Language Query|自然語言查詢/i },
  { path: '/playground', nav: /SQL Playground|SQL 工作台/i, heading: /SQL Playground|SQL 工作台/i },
  { path: '/history', nav: /Query History|查詢歷史/i, heading: /Query History|查詢歷史/i },
  { path: '/dq', nav: /Data Quality|資料品質/i, heading: /Data Quality Report|資料品質報告/i },
  { path: '/schema', nav: /Schema Explorer|Schema/i, heading: /Schema Explorer|Schema/i },
  { path: '/customers', nav: /Customer|客戶/i, heading: /Customer|客戶/i },
  { path: '/products', nav: /Product|產品/i, heading: /Product Performance Matrix|產品績效矩陣/i },
  { path: '/funnel', nav: /Funnel|漏斗|Cohort|世代/i, heading: /Funnel & Cohort Analysis|漏斗與世代分析/i },
  { path: '/revenue', nav: /Revenue|收入/i, heading: /Revenue Intelligence|收入智慧/i },
  { path: '/guardrails', nav: /Guardrail|護欄/i, heading: /Guardrail Analytics|護欄分析/i },
  { path: '/insights', nav: /Insights|洞察/i, heading: /Auto Insights|自動洞察/i },
];

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.addInitScript(() => {
    localStorage.setItem('agentic-bi-tour-seen', '1');
    localStorage.setItem('lang', 'en');
  });
});

async function stopAutoTour(page: Page) {
  await page.goto('/?noTour=1');
  await expect(page.locator('aside')).toBeVisible();
}

test('all sidebar routes render and keep navigation active', async ({ page }) => {
  await stopAutoTour(page);
  await expect(page.locator('aside')).toBeVisible();

  for (const route of routes) {
    await page.goto(`${route.path}${route.path.includes('?') ? '&' : '?'}noTour=1`);
    await expect(page).toHaveURL(new RegExp(route.path === '/' ? '/\\?noTour=1$' : route.path));
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('aside a.active')).toContainText(route.nav);
    await expect(page.locator('body')).not.toContainText(/Failed to fetch|Unhandled|Traceback/i);
  }
});

test('key interactions work across the product', async ({ page }) => {
  await stopAutoTour(page);
  await page.goto('/upload?noTour=1');
  await page.getByRole('button', { name: /sample/i }).click();
  await expect(page.locator('table.data-table')).toBeVisible({ timeout: 15000 });

  await page.goto('/workflow?noTour=1');
  await page.getByRole('button', { name: /Natural Language|自然語言/i }).click();
  await expect(page).toHaveURL(/\/query$/);

  await page.goto('/playground?noTour=1');
  await page.getByRole('button', { name: /Validate|驗證/i }).click();
  await expect(page.getByText(/Safe|安全|Passed|通過/i).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Execute|執行/i }).click();
  await expect(page.locator('table.data-table').first()).toBeVisible({ timeout: 15000 });

  await page.goto('/insights?noTour=1');
  await expect(page.locator('[data-journey="insight-grid"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-journey="insight-grid"] .card').first().click();
  await expect(page).toHaveURL(/\/playground$/);
});
