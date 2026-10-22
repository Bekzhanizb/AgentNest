import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RunEvent, RunStatus, StoredRun } from '@agentnest/core';
import { RunHistory } from './RunHistory';
import type { LibraryControl } from './useLibrary';
const id = '12345678-1234-4234-8234-123456789abc';
const definition = { id: 'test-fixture', name: 'Fixture agent', model: 'qwen3:1.7b', providerId: 'ollama', instructions: '<script>not executable</script>' };
const first: RunEvent = { apiVersion: 1, origin: 'runtime', runId: id, agentId: id, sequence: 0, elapsedMs: 0, type: 'run_started', agent: { id, name: 'Fixture agent', role: 'Fixture', desk: 0, appearance: { skin: 'warm', shirt: 'sage', hair: 'short' } } };
function library(status: RunStatus): LibraryControl {
  const base = { apiVersion: 1 as const, origin: 'runtime' as const, runId: id, agentId: id, sequence: 1, elapsedMs: 10 };
  const end: RunEvent | null = status === 'completed' ? { ...base, type: 'run_completed', summary: '<img src=x onerror=alert(1)> [public.md]', sources: [{ path: 'public.md', bytes: 4, sha256: 'a'.repeat(64) }], usage: { inputTokens: null, outputTokens: null }, modelCalls: 1 } : status === 'failed' ? { ...base, type: 'run_failed', code: 'FIXTURE', message: 'Fixture failure.' } : status === 'cancelled' ? { ...base, type: 'run_cancelled' } : null;
  const run: StoredRun = { id, name: definition.name, model: definition.model, status, startedAt: 1, updatedAt: 10, definition, definitionRevision: null, events: end ? [first, end] : [first] };
  return { snapshot: { agents: [], runs: [{ id, name: run.name, model: run.model, status, startedAt: 1, updatedAt: 10 }], selectedRun: run }, available: true, loading: false, pending: false, error: null, refresh: vi.fn(async () => {}), save: vi.fn(async () => true), removeAgent: vi.fn(async () => true), readRun: vi.fn(async () => true), removeRun: vi.fn(async () => true), clearHistory: vi.fn(async () => true) };
}
afterEach(cleanup);
describe('read-only saved history (explicit component fixtures, no inference)', () => {
  it.each<RunStatus>(['running', 'completed', 'failed', 'cancelled', 'interrupted'])('renders %s with text and no resumed work', (status) => {
    const control = library(status); const view = render(<RunHistory library={control} active={false} />);
    expect(screen.getByText('SAVED RUN · READ-ONLY')).toBeDefined();
    expect(screen.getByRole('list', { name: 'Saved runs' }).textContent).toContain(status === 'interrupted' ? 'Interrupted' : status);
    expect(view.container.querySelector('script')).toBeNull(); expect(view.container.querySelector('img')).toBeNull();
    expect(control.readRun).not.toHaveBeenCalled(); expect(control.clearHistory).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Run notes summary' })).toBeNull();
  });
  it('requires explicit deletion confirmation and disables it during active work', () => {
    const control = library('cancelled'); const view = render(<RunHistory library={control} active={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete all history' })); expect(control.clearHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep records' })); expect(control.clearHistory).not.toHaveBeenCalled();
    view.rerender(<RunHistory library={control} active={true} />);
    expect((screen.getByRole('button', { name: 'Delete this run' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
