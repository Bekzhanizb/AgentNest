import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyNotesSession } from '@agentnest/core';
import type { NotesSession, SessionPhase, RunEvent } from '@agentnest/core';
import { NotesRunPanel } from './NotesRunPanel';

afterEach(cleanup);
const id = '12345678-1234-4234-8234-123456789abc';
const ready: NotesSession = { ...emptyNotesSession(), revision: 1, phase: 'ready', selection: { id, folderName: 'Public test notes', expiresAt: 600001, consumed: false, files: [{ path: 'note.md', bytes: 4 }] } };
function session(snapshot = ready) { return { snapshot, available: true, pending: false, loading: false, error: null, choose: vi.fn(async () => {}), start: vi.fn(async () => {}), cancel: vi.fn(async () => {}), clear: vi.fn(async () => {}) }; }
describe('real-run controls with explicit component fixtures (no provider calls)', () => {
  it('requires a model and explicit permission and sends no filesystem path', () => {
    const control = session(); render(<NotesRunPanel session={control} />);
    const run = screen.getByRole('button', { name: 'Run notes summary' }) as HTMLButtonElement;
    expect(run.disabled).toBe(true); expect(control.start).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Installed Ollama model'), { target: { value: 'qwen3:1.7b' } });
    expect(run.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox')); expect(run.disabled).toBe(false); fireEvent.click(run);
    expect(control.start).toHaveBeenCalledWith({ apiVersion: 1, grantId: id, model: 'qwen3:1.7b', consent: true });
    fireEvent.change(screen.getByLabelText('Installed Ollama model'), { target: { value: 'other:latest' } }); expect(run.disabled).toBe(true);
  });
  it.each<SessionPhase>(['empty', 'ready', 'running', 'cancelling', 'completed', 'failed', 'cancelled'])('uses an explicit textual status for %s', (phase) => {
    render(<NotesRunPanel session={session({ ...ready, phase })} />);
    expect(screen.getByRole('status', { name: 'Notes run status' }).textContent?.length).toBeGreaterThan(5);
    expect(screen.getByText('REAL LOCAL RUN · EXPERIMENTAL')).toBeDefined();
  });
  it('keeps untrusted summary text inert and exposes actual source metadata', () => {
    const event: RunEvent = { apiVersion: 1, origin: 'runtime', runId: id, agentId: id, sequence: 0, elapsedMs: 12, type: 'run_completed', summary: '<img src=x onerror=alert(1)> [note.md]', sources: [{ path: 'note.md', bytes: 4, sha256: 'a'.repeat(64) }], usage: { inputTokens: null, outputTokens: 12 }, modelCalls: 2 };
    const { container } = render(<NotesRunPanel session={session({ ...ready, phase: 'completed', events: [event] })} />);
    expect(container.querySelector('img')).toBeNull(); expect(screen.getByText(event.summary)).toBeDefined();
    expect(screen.getByRole('list', { name: 'Summary sources' }).textContent).toContain('note.md');
    expect(screen.getByText(/Input tokens: unknown/)).toBeDefined();
  });
  it('disables repeated cancellation and explains the browser boundary', () => {
    const control = session({ ...ready, phase: 'cancelling' }); const view = render(<NotesRunPanel session={control} />);
    expect((screen.getByRole('button', { name: 'Cancel run' }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<NotesRunPanel session={{ ...control, snapshot: emptyNotesSession(), available: false }} />);
    expect(screen.getByText(/Browser preview cannot access notes or models/)).toBeDefined();
  });
});
