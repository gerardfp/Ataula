// Playwright configuration for end‑to‑end tests
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e/playwright',
  timeout: 30_000,
  use: {
    headless: true,
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
