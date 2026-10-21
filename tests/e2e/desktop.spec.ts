import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';

test('opens the built Electron window with an isolated bridge and honest navigation', async () => {
  const testInfo = test.info();
  const userData = await mkdtemp(path.join(os.tmpdir(), 'agentnest-smoke-'));
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE'));
  const app = await electron.launch({
    chromiumSandbox: true,
    args: [path.resolve('apps/desktop'), `--user-data-dir=${userData}`],
    env,
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page).toHaveTitle('AgentNest — Pre-alpha');
    await expect(page.getByRole('heading', { name: 'AgentNest — Pre-alpha' })).toBeVisible();
    await expect(page.getByText('0.0.0 · Pre-alpha')).toBeVisible();
    const isolation = await page.evaluate(() => Reflect.get(Reflect.get(window, 'agentnest') as object, 'security') as unknown);
    expect(isolation).toEqual({ contextIsolated: true, sandboxed: true });
    const exposed = await page.evaluate(() => ({
      require: typeof Reflect.get(window, 'require'),
      process: typeof Reflect.get(window, 'process'),
      bridge: Object.keys(Reflect.get(window, 'agentnest') as object).sort(),
    }));
    expect(exposed).toEqual({ require: 'undefined', process: 'undefined', bridge: ['getAppInfo', 'security'] });
    for (const name of ['Agents', 'Tasks', 'Settings', 'Office']) {
      await page.getByRole('button', { name }).click();
      await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
      await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    }
    // DevTools normally bypasses CSP for evaluate; explicitly disable that bypass.
    const cdp = await page.context().newCDPSession(page);
    const evaluation = await cdp.send('Runtime.evaluate', {
      expression: "new Function('return 1')()",
      allowUnsafeEvalBlockedByCSP: false,
    });
    expect(evaluation.exceptionDetails).toBeDefined();
    await cdp.detach();
    const opened = await page.evaluate(() => window.open('https://example.com/'));
    expect(opened).toBeNull();
    expect(app.windows()).toHaveLength(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  } finally {
    await app.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
