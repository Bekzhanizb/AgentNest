import path from 'node:path';
import { mkdtemp, rm, readFile, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { _electron as electron, expect, test } from '@playwright/test';
import type { DesktopBridge, NotesSession } from '@agentnest/core';
import AxeBuilder from '@axe-core/playwright';

const liveModel = process.env['AGENTNEST_LIVE_NOTES_MODEL'];

for (const live of [false, true]) test(live ? 'real local Ollama produces a source-linked desktop result and cancels honestly' : 'desktop validates native grants and rejects changed inputs before calling a provider', async () => {
  test.skip(live && !liveModel, 'Real inference is opt-in; ordinary CI does not install a model.');
  test.setTimeout(live ? 300_000 : 60_000);
  const data = await mkdtemp(path.join(tmpdir(), 'agentnest-notes-ui-'));
  const folder = await mkdtemp(path.join(tmpdir(), 'agentnest-public-notes-'));
  for (const name of ['purpose.md', 'permissions.md']) await copyFile(path.resolve('fixtures/notes', name), path.join(folder, name));
  let app = await electron.launch({ chromiumSandbox: true, args: [path.resolve('apps/desktop'), `--user-data-dir=${data}`], env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE')) });
  try {
    const page = await app.firstWindow(); const errors: string[] = []; const requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    // Test harness substitutes only the native dialog result, using actual public
    // temporary files. Runtime, worker, bridge and provider remain production code.
    await app.evaluate(({ dialog }, selected) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    }, folder);
    const model = live ? liveModel! : 'agentnest-missing:proof';
    await page.getByRole('button', { name: 'Agents', exact: true }).click();
    await page.getByLabel('Agent name', { exact: true }).fill('Public notes agent');
    await page.getByLabel('Installed model', { exact: true }).fill(model);
    await page.getByRole('button', { name: 'Save agent', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Saved agents' })).toContainText('Public notes agent');
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await page.getByLabel('Agent definition', { exact: true }).selectOption({ label: 'Public notes agent · revision 1' });
    await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('No run started');
    const invalid = await page.evaluate(() => (Reflect.get(window, 'agentnest') as DesktopBridge).notes.start({ apiVersion: 1, grantId: '12345678-1234-4234-8234-123456789abc', model: 'qwen3:1.7b', consent: true }));
    expect(invalid).toMatchObject({ ok: false, error: { code: 'NO_GRANT' } });
    await page.getByRole('button', { name: 'Choose notes folder' }).click();
    await expect(page.getByRole('list', { name: 'Approved note files' }).getByRole('listitem')).toHaveCount(2);
    const read = () => page.evaluate(async () => { const result = await (Reflect.get(window, 'agentnest') as DesktopBridge).notes.read(); if (!result.ok) throw new Error('Unavailable'); return result.snapshot; });
    const selected = await read(); expect(selected.events).toEqual([]); expect(selected.selection?.folderName).toBe(path.basename(folder)); expect(JSON.stringify(selected)).not.toContain(folder);
    await expect(page.getByLabel('Installed Ollama model')).toHaveValue(model);
    await expect(page.getByRole('button', { name: 'Run notes summary' })).toBeDisabled();
    await page.getByRole('checkbox').check();
    if (!live) await writeFile(path.join(folder, 'unapproved.md'), 'Added after the user reviewed the permission.');
    await page.getByRole('button', { name: 'Run notes summary' }).click();
    let completedSession: NotesSession | undefined;
    if (live) {
      await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('Completed · review the result', { timeout: 185_000 });
      const result: NotesSession = await read(); completedSession = result; const completed = result.events.at(-1);
      expect(completed?.type).toBe('run_completed');
      if (completed?.type !== 'run_completed') throw new Error('No real summary');
      expect(completed.sources).toHaveLength(2);
      for (const source of completed.sources) {
        const input = await readFile(path.join(folder, source.path));
        expect(source.sha256).toBe(createHash('sha256').update(input).digest('hex'));
        expect(source.bytes).toBe(input.length); expect(completed.summary).toContain(`[${source.path}]`);
      }
      const scan = await new AxeBuilder({ page }).setLegacyMode().withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({ path: test.info().outputPath('real-notes-summary.png'), fullPage: true });
      await writeFile(test.info().outputPath('real-notes-session.json'), JSON.stringify(result, null, 2));
      console.log(`AGENTNEST_REAL_DESKTOP_RESULT ${JSON.stringify(result)}`);
      await page.getByRole('button', { name: 'Choose notes folder' }).click();
      await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Run notes summary' }).click();
      await expect(page.getByRole('list', { name: 'Runtime event history' })).toContainText('Model call 1 started', { timeout: 30_000 });
      await page.getByRole('button', { name: 'Office', exact: true }).click();
      await expect(page.getByRole('button', { name: 'View notes run' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Inspect Ada/ })).toHaveCount(0);
      await page.getByRole('button', { name: 'View notes run' }).click();
      await page.getByRole('button', { name: 'Cancel run' }).click();
      await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('Cancelled · no successful result', { timeout: 10_000 });
      const cancelled = await read(); expect(cancelled.events.some((event) => event.type === 'run_completed')).toBe(false);
      expect(cancelled.events.at(-1)?.type).toBe('run_cancelled');
      console.log(`AGENTNEST_REAL_DESKTOP_CANCEL ${JSON.stringify(cancelled)}`);
    } else {
      await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('Failed · no successful result', { timeout: 30_000 });
      expect((await read()).events.at(-1)).toMatchObject({ type: 'run_failed', code: 'INPUT_CHANGED' });
      expect((await read()).events.some((event) => event.type === 'provider_ready')).toBe(false);
    }
    const saved = await page.evaluate(async () => {
      const result = await (Reflect.get(window, 'agentnest') as DesktopBridge).library.read(); if (!result.ok || !result.value.runs[0]) throw new Error('No stored run');
      return (Reflect.get(window, 'agentnest') as DesktopBridge).library.readRun({ apiVersion: 1, id: result.value.runs[0].id });
    });
    expect(saved).toMatchObject({ ok: true, value: { selectedRun: { definitionRevision: 1, definition: { name: 'Public notes agent', model }, status: live ? 'cancelled' : 'failed' } } });
    await page.getByRole('button', { name: 'Choose notes folder' }).click();
    await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('Ready for your permission');
    const grant = (await read()).selection?.id;
    if (!grant) throw new Error('Native folder review did not issue a grant');
    await page.reload(); await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Notes run status' })).toHaveText('No run started');
    expect((await read()).selection).toBeNull();
    const replay = await page.evaluate((grantId) => (Reflect.get(window, 'agentnest') as DesktopBridge).notes.start({ apiVersion: 1, grantId, model: 'qwen3:1.7b', consent: true }), grant);
    expect(replay).toMatchObject({ ok: false, error: { code: 'NO_GRANT' } });
    expect(errors).toEqual([]); expect(requests).toEqual([]);
    await app.close();
    app = await electron.launch({ chromiumSandbox: true, args: [path.resolve('apps/desktop'), `--user-data-dir=${data}`], env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE')) });
    const restarted = await app.firstWindow();
    await restarted.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(restarted.getByRole('status', { name: 'Notes run status' })).toHaveText('No run started');
    const reloaded = await restarted.evaluate(async () => {
      const result = await (Reflect.get(window, 'agentnest') as DesktopBridge).library.read(); if (!result.ok || !result.value.runs[0]) throw new Error('No persisted run after restart');
      return (Reflect.get(window, 'agentnest') as DesktopBridge).library.readRun({ apiVersion: 1, id: result.value.runs[0].id });
    });
    expect(reloaded).toEqual(saved);
    if (completedSession) {
      const runId = completedSession.events[0]!.runId;
      const completedHistory = await restarted.evaluate((id) => (Reflect.get(window, 'agentnest') as DesktopBridge).library.readRun({ apiVersion: 1, id }), runId);
      if (!completedHistory.ok || !completedHistory.value.selectedRun) throw new Error('Completed history missing after restart');
      expect(completedHistory.value.selectedRun.status).toBe('completed');
      expect(completedHistory.value.selectedRun.events).toEqual(completedSession.events);
      await writeFile(test.info().outputPath('persisted-completed-run.json'), JSON.stringify(completedHistory.value.selectedRun, null, 2));
      console.log(`AGENTNEST_PERSISTED_COMPLETED ${JSON.stringify(completedHistory.value.selectedRun)}`);
    }
    await expect(restarted.getByRole('list', { name: 'Saved runs' }).getByRole('listitem')).toHaveCount(live ? 2 : 1);
    await restarted.getByRole('list', { name: 'Saved runs' }).getByRole('button').first().click();
    await expect(restarted.getByRole('heading', { name: 'Public notes agent', exact: true })).toBeVisible();
    await restarted.screenshot({ path: test.info().outputPath('persisted-history.png'), fullPage: true });
    await writeFile(test.info().outputPath('persisted-history.json'), JSON.stringify(reloaded, null, 2));
    console.log(`AGENTNEST_PERSISTED_HISTORY ${JSON.stringify(reloaded)}`);
  } finally { await app.close(); await rm(data, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); await rm(folder, { recursive: true, force: true }); }
});
