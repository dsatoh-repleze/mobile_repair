import { defineConfig, devices } from '@playwright/test';

/**
 * テスト対象環境:
 *
 * デプロイ環境（Cloud Run）:
 *   1. プロキシを起動:
 *      gcloud run services proxy mobile-repair-frontend --port=3000 --region=asia-northeast1
 *      gcloud run services proxy mobile-repair-backend --port=8080 --region=asia-northeast1
 *   2. テスト実行（デフォルト設定で動作）:
 *      npx playwright test
 *
 * ローカル環境:
 *   BASE_URL=http://localhost:3000 npx playwright test
 */
const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
