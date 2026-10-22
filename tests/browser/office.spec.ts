import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openOffice(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Office scene ready', { exact: true })).toBeVisible();
}
async function enterDemo(page: Page) {
  await page.getByRole('button', { name: 'Enter Demo Mode' }).click();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'Next demo event' }).click();
  await page.getByRole('button', { name: /Inspect Milo/ }).click();
}
async function scan(page: Page) {
  const result = await new AxeBuilder({ page }).setLegacyMode().withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('Tasks preview explains real-run permissions without a desktop bridge or fake activity', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(page.getByText('REAL LOCAL RUN · EXPERIMENTAL', { exact: true })).toBeVisible();
  await expect(page.getByText(/Browser preview cannot access notes or models/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run notes summary' })).toBeDisabled();
  await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('No run started');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await noOverflow(page); await scan(page);
  }
  await page.locator('.notes-page').screenshot({ path: test.info().outputPath('tasks-permissions.png') });
});

async function tabTo(page: Page, target: Locator) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test('keyboard-only demo lifecycle and live reduced-motion changes keep controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openOffice(page);
  await tabTo(page, page.getByRole('button', { name: 'Enter Demo Mode' }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: /Inspect Ada/ }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'View Ada’s details' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Inspect Ada/ })).toBeFocused();
  await tabTo(page, page.getByRole('button', { name: 'Ambient motion off' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Ambient motion on' })).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = page.getByRole('button', { name: 'Motion off · system preference' });
  await expect(motion).toBeDisabled();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  // Reflow equivalents, not actual browser zoom or Windows text scaling.
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(page);
    await expect(page.getByRole('button', { name: 'Exit Demo Mode' })).toBeVisible();
    await scan(page);
  }
  await tabTo(page, page.getByRole('button', { name: 'Exit Demo Mode' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Inspect Ada/ })).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Office announcements' })).toContainText('No live session');
});

test('production office keeps keyboard focus, readable statuses, and layout at desktop and narrow widths', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openOffice(page);
  await expect(page.getByRole('button', { name: /Inspect Ada/ })).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to workspace' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  expect(new URL(page.url()).hash).toBe('');
  await scan(page);
  await enterDemo(page);
  const milo = page.getByRole('button', { name: /Inspect Milo/ });
  await page.getByRole('button', { name: 'View Milo’s details' }).click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(milo).toBeFocused();
  await milo.press('Enter');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Motion off · system preference' })).toBeDisabled();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(page);
    await scan(page);
    await page.locator('.office-workspace').screenshot({ path: test.info().outputPath(`office-${width}.png`) });
  }
  await page.getByRole('button', { name: 'Exit Demo Mode' }).click();
  await expect(page.getByRole('status', { name: 'Office announcements' })).toContainText('No live session');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('forced colors retain selection, labels, navigation, and inspector focus', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await openOffice(page);
  await enterDemo(page);
  const milo = page.getByRole('button', { name: /Inspect Milo/ });
  await expect(milo).toHaveAttribute('aria-pressed', 'true');
  expect(await milo.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await expect(page.getByRole('status', { name: 'Selected character status' })).toHaveText('Ⅱ Awaiting approval');
  await page.getByRole('button', { name: 'View Milo’s details' }).click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeFocused();
  await noOverflow(page);
  await scan(page);
  await page.locator('.office-workspace').screenshot({ path: test.info().outputPath('office-forced-colors.png') });
});

test.describe('touch emulation', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('touch selects a sprite, zooms, and reaches the inspector without a drag gesture', async ({ page }) => {
    await openOffice(page);
    const enter = page.getByRole('button', { name: 'Enter Demo Mode' });
    await enter.tap();
    const viewport = page.getByRole('group', { name: 'Office viewport', exact: true });
    await viewport.scrollIntoViewIfNeeded();
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Office viewport missing');
    const scale = Math.min(bounds.width / 528, bounds.height / 376);
    await page.touchscreen.tap(bounds.x + (bounds.width - 512 * scale) / 2 + 209 * scale, bounds.y + (bounds.height - 360 * scale) / 2 + 175 * scale);
    const ada = page.getByRole('button', { name: /Inspect Ada/ });
    await expect(ada).toHaveAttribute('aria-pressed', 'true');
    const zoom = page.getByRole('button', { name: 'Zoom in' });
    const zoomBounds = await zoom.boundingBox();
    expect(zoomBounds?.width).toBeGreaterThanOrEqual(44);
    expect(zoomBounds?.height).toBeGreaterThanOrEqual(44);
    await zoom.tap();
    await expect(page.getByLabel('Office zoom', { exact: true })).toHaveText('115%');
    await page.getByRole('button', { name: 'View Ada’s details' }).tap();
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeFocused();
    await page.getByRole('button', { name: 'Close inspector' }).tap();
    await expect(ada).toBeFocused();
    await noOverflow(page);
    await page.setViewportSize({ width: 820, height: 1000 });
    const tabletZoomBounds = await zoom.boundingBox();
    expect(tabletZoomBounds?.width).toBeGreaterThanOrEqual(44);
    expect(tabletZoomBounds?.height).toBeGreaterThanOrEqual(44);
  });
});
