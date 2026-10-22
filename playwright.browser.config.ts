import { defineConfig } from '@playwright/test';

const executablePath = process.env['AGENTNEST_BROWSER_EXECUTABLE'];

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 45_000,
  reporter: 'list',
  outputDir: 'test-results/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Deterministic software WebGL for this browser preview only.
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run preview:office',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
  },
});
