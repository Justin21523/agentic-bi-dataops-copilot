import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BROWSERS = path.join(__dirname, '.playwright-browsers')

export default defineConfig({
  testDir: './src/tests',
  outputDir: './test-results',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15000,
    launchOptions: {
      executablePath: path.join(BROWSERS, 'chromium-1228/chrome-linux64/chrome'),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 60000,
})
