import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('opens an isolated Electron office with explicit demo, keyboard controls, and accessible statuses', async () => {
  test.setTimeout(60_000);
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
    const externalRequests: string[] = [];
    page.on('request', (request) => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
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
    for (const name of ['Agents', 'Tasks', 'Settings']) {
      await page.getByRole('button', { name }).click();
      await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
      await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Office', exact: true }).click();
    await expect(page.getByText('Office scene ready', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Session mode' })).toContainText('NO SESSION CONNECTED');
    await expect(page.getByRole('button', { name: /Inspect Ada/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Enter Demo Mode' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Session mode' })).toContainText('DEMO MODE — FICTIONAL');
    const ada = page.getByRole('button', { name: /Inspect Ada/ });
    await expect(ada).toHaveAccessibleName('Inspect Ada, Researcher, Idle, demo character');
    await ada.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: /Inspect Milo/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toContainText('DEMO CHARACTER · FICTIONAL');
    for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next demo event' }).click();
    await expect(ada).toHaveAccessibleName('Inspect Ada, Researcher, Working, demo character');
    await expect(page.getByRole('button', { name: /Inspect Milo/ })).toHaveAccessibleName('Inspect Milo, Reviewer, Awaiting approval, demo character');
    await expect(page.getByRole('button', { name: /Inspect June/ })).toHaveAccessibleName('Inspect June, Writer, Completed, demo character');
    await expect(page.getByRole('button', { name: /Inspect Sol/ })).toHaveAccessibleName('Inspect Sol, Builder, Failed, demo character');
    await expect(page.getByRole('status', { name: 'Selected character status' })).toHaveText('Ⅱ Awaiting approval');
    await expect(page.getByRole('list', { name: 'Demo event history entries' }).getByRole('listitem')).toHaveCount(2);
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await expect(page.getByRole('button', { name: /Inspect Milo/ })).toBeFocused();
    const viewport = page.getByRole('group', { name: 'Office viewport', exact: true });
    await viewport.focus(); await page.keyboard.press('+');
    await expect(page.getByLabel('Office zoom', { exact: true })).toHaveText('115%');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Home');
    await expect(page.getByLabel('Office zoom', { exact: true })).toHaveText('100%');
    // Hit testing uses projected desk coordinates, independently of the DOM roster.
    const box = await viewport.boundingBox();
    if (!box) throw new Error('Office viewport is missing');
    const scale = Math.min(box.width / 528, box.height / 376);
    const point = { x: box.x + (box.width - 512 * scale) / 2 + 209 * scale, y: box.y + (box.height - 360 * scale) / 2 + 175 * scale };
    await page.mouse.click(point.x, point.y);
    await expect(ada).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(point.x, point.y); await page.mouse.down();
    await page.mouse.move(point.x + 35, point.y + 25, { steps: 5 }); await page.mouse.up();
    await expect(ada).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Fit office' }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('button', { name: 'Motion off · system preference' })).toBeDisabled();
    // Legacy mode keeps the scan in this window: the shell denies extra windows.
    const accessibility = await new AxeBuilder({ page }).setLegacyMode().withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('office-demo.png'), fullPage: true });
    await page.getByRole('button', { name: 'Exit Demo Mode' }).click();
    await expect(page.getByRole('button', { name: /Inspect Ada/ })).toHaveCount(0);
    await expect(page.getByText('No character selected')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Session mode' })).toContainText('NO SESSION CONNECTED');
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
    expect(externalRequests).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  } finally {
    await app.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
