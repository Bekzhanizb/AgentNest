import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { isNotesSession } from '@agentnest/core';
import type { NotesSession, RunEvent, RunEventPayload } from '@agentnest/core';
import { NotesSessionOwner } from './notes-session';
import type { WorkerCallbacks } from './notes-session';

const id = '12345678-1234-4234-8234-123456789abc';
const source = { path: 'note.md', bytes: 4, sha256: createHash('sha256').update('safe').digest('hex') };
const usage = { inputTokens: 10, outputTokens: 10 };
let root: string; let owner: NotesSessionOwner; let callbacks: WorkerCallbacks;
let snapshots: NotesSession[]; let clock: number; let next: number;
const stop = vi.fn(); const cancel = vi.fn(); const launch = vi.fn();
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'agentnest-session-')); await writeFile(path.join(root, 'note.md'), 'safe');
  snapshots = []; clock = 1000; next = 0; stop.mockReset(); cancel.mockReset(); launch.mockReset();
  launch.mockImplementation((_approval, _model, value: WorkerCallbacks) => { callbacks = value; return { stop, cancel }; });
  owner = new NotesSessionOwner({ chooseFolder: async () => root, confirmRun: async () => true, launch, publish: (snapshot) => { snapshots.push(snapshot); }, now: () => clock });
});
afterEach(async () => { owner.dispose(); vi.useRealTimers(); await rm(root, { recursive: true, force: true }); });
function snapshot() { const result = owner.read(); if (!result.ok) throw new Error('unavailable'); return result.snapshot; }
async function start() { await owner.choose(); return owner.start({ apiVersion: 1, consent: true, model: 'qwen3:1.7b', grantId: snapshot().selection?.id }); }
function emit(payload: RunEventPayload) { callbacks.event({ ...payload, apiVersion: 1, origin: 'runtime', runId: id, agentId: id, sequence: next++, elapsedMs: next * 10 } satisfies RunEvent); }
function started() { emit({ type: 'run_started', agent: { id, name: 'Fixture', role: 'Fixture model test', desk: 0, appearance: { skin: 'warm', shirt: 'sage', hair: 'short' } } }); }
function read() {
  started(); emit({ type: 'provider_ready', provider: 'ollama', version: 'fixture', model: 'qwen3:1.7b', digest: 'a'.repeat(64) });
  emit({ type: 'provider_call_started', step: 1 }); emit({ type: 'provider_call_completed', step: 1, finishReason: 'tool-calls', usage }); emit({ type: 'note_read', source });
  emit({ type: 'provider_call_started', step: 2 }); emit({ type: 'provider_call_completed', step: 2, finishReason: 'stop', usage });
}
describe('window-owned permission and lifecycle (mock worker, real public temporary files)', () => {
  it('does not trust renderer consent without native confirmation', async () => {
    const confirmRun = vi.fn(async () => false);
    owner = new NotesSessionOwner({ chooseFolder: async () => root, confirmRun, launch, publish: () => {} });
    await start(); expect(confirmRun).toHaveBeenCalledOnce(); expect(launch).not.toHaveBeenCalled();
    expect(snapshot()).toMatchObject({ phase: 'ready', selection: { consumed: false }, events: [] });
  });
  it('rechecks window ownership after asynchronous native confirmation', async () => {
    let resolve: (value: boolean) => void = () => {};
    owner = new NotesSessionOwner({ chooseFolder: async () => root, confirmRun: () => new Promise((done) => { resolve = done; }), launch, publish: () => {} });
    await owner.choose(); const grantId = snapshot().selection?.id;
    const pending = owner.start({ apiVersion: 1, grantId, consent: true, model: 'qwen3:1.7b' });
    expect(owner.clear()).toMatchObject({ ok: false, error: { code: 'BUSY' } });
    owner.revoke(); resolve(true); await pending; expect(launch).not.toHaveBeenCalled(); expect(snapshot().selection).toBeNull();
  });
  it('previews metadata only, rejects paths/false consent and consumes a grant exactly once', async () => {
    await owner.choose(); const selected = snapshot().selection!;
    expect(launch).not.toHaveBeenCalled(); expect(JSON.stringify(snapshot())).not.toContain(root);
    expect(await owner.start({ apiVersion: 1, grantId: selected.id, model: 'qwen3:1.7b', consent: false })).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(await owner.start({ apiVersion: 1, grantId: selected.id, model: 'qwen3:1.7b', consent: true, path: root })).toMatchObject({ ok: false });
    expect((await owner.start({ apiVersion: 1, grantId: selected.id, model: 'qwen3:1.7b', consent: true })).ok).toBe(true);
    expect(snapshot().selection?.consumed).toBe(true); expect(launch).toHaveBeenCalledTimes(1);
    expect(owner.clear()).toMatchObject({ ok: false, error: { code: 'BUSY' } });
    started(); emit({ type: 'run_failed', code: 'UNAVAILABLE', message: 'Fixture service unavailable.' });
    expect(await owner.start({ apiVersion: 1, grantId: selected.id, model: 'qwen3:1.7b', consent: true })).toMatchObject({ ok: false, error: { code: 'NO_GRANT' } });
  });
  it('expires stale grants without launching the worker', async () => {
    await owner.choose(); const grantId = snapshot().selection?.id; clock += 600_001;
    expect(await owner.start({ apiVersion: 1, grantId, model: 'qwen3:1.7b', consent: true })).toMatchObject({ ok: false, error: { code: 'EXPIRED_GRANT' } }); expect(launch).not.toHaveBeenCalled();
  });
  it('accepts ordered actual-shaped lifecycle facts and source-linked completion', async () => {
    await start(); read(); emit({ type: 'run_completed', summary: 'Fixture summary [note.md].', sources: [source], usage, modelCalls: 2 });
    expect(snapshot().phase).toBe('completed'); expect(stop).toHaveBeenCalledTimes(1);
    expect(snapshots.every(isNotesSession)).toBe(true);
    expect(snapshots.map((value) => value.revision)).toEqual(snapshots.map((_, index) => index + 1));
  });
  it('rejects fabricated completion without reads and does not accept late events', async () => {
    await start(); started(); emit({ type: 'run_completed', summary: 'Invented [note.md].', sources: [source], usage, modelCalls: 1 });
    expect(snapshot()).toMatchObject({ phase: 'failed', error: { code: 'INVALID_EVENT' } });
    const revision = snapshot().revision; emit({ type: 'run_cancelled' }); expect(snapshot().revision).toBe(revision);
    expect(snapshot().events.some((event) => event.type === 'run_completed')).toBe(false);
  });
  it('cancellation wins over a late completion and never publishes success', async () => {
    await start(); read(); owner.cancel(); expect(cancel).toHaveBeenCalledOnce();
    emit({ type: 'run_completed', summary: 'Fixture [note.md].', sources: [source], usage, modelCalls: 2 });
    expect(snapshot().phase).toBe('cancelled'); expect(snapshot().events.at(-1)?.type).toBe('run_cancelled');
  });
  it('force-stops an unresponsive worker after cancellation', async () => {
    await start(); started(); vi.useFakeTimers(); owner.cancel(); vi.advanceTimersByTime(5001);
    expect(snapshot().phase).toBe('cancelled'); expect(stop).toHaveBeenCalledOnce();
  });
  it('reports crashes and deadline expiry without success', async () => {
    await start(); started(); callbacks.exited(); expect(snapshot()).toMatchObject({ phase: 'failed', error: { code: 'WORKER_EXITED' } });
    owner.clear(); next = 0; vi.useFakeTimers(); await start(); started(); vi.advanceTimersByTime(190_001);
    expect(snapshot()).toMatchObject({ phase: 'failed', error: { code: 'RUN_TIMEOUT' } });
  });
  it('revokes permissions on navigation and stops work on window disposal', async () => {
    await owner.choose(); const grantId = snapshot().selection?.id; owner.revoke();
    expect(await owner.start({ apiVersion: 1, grantId, model: 'qwen3:1.7b', consent: true })).toMatchObject({ ok: false, error: { code: 'NO_GRANT' } });
    await start(); owner.dispose(); expect(stop).toHaveBeenCalled(); expect(owner.read()).toMatchObject({ ok: false });
  });
  it('does not let a native picker response restore a revoked grant', async () => {
    let resolve: (value: string) => void = () => {};
    owner = new NotesSessionOwner({ chooseFolder: () => new Promise((done) => { resolve = done; }), confirmRun: async () => true, launch, publish: () => {} });
    const choosing = owner.choose(); owner.revoke(); resolve(root); await choosing;
    expect(snapshot().selection).toBeNull(); expect(launch).not.toHaveBeenCalled();
  });
  it('persists cancellation before revoking a running session and ignores late worker messages', async () => {
    const record = vi.fn();
    owner = new NotesSessionOwner({ chooseFolder: async () => root, confirmRun: async () => true, launch, publish: () => {}, record });
    await start(); started(); owner.revoke();
    expect(record.mock.calls.map((call) => (call[0] as RunEvent).type)).toEqual(['run_started', 'run_cancelled']);
    expect(snapshot().selection).toBeNull(); expect(snapshot().events).toEqual([]);
    emit({ type: 'run_cancelled' }); expect(record).toHaveBeenCalledTimes(2);
  });
  it('stops rather than reporting completion when history cannot be written', async () => {
    const record = vi.fn().mockImplementation(() => { throw new Error('Storage failed'); });
    owner = new NotesSessionOwner({ chooseFolder: async () => root, confirmRun: async () => true, launch, publish: () => {}, record });
    await start(); started();
    expect(stop).toHaveBeenCalledOnce(); expect(snapshot()).toMatchObject({ phase: 'failed', error: { code: 'STORAGE_UNAVAILABLE' } });
    expect(snapshot().events).toEqual([]);
  });
  it('rejects a changed saved definition while native confirmation is open', async () => {
    const definition = { id: 'saved', name: 'Saved fixture', model: 'qwen3:1.7b', providerId: 'ollama', instructions: 'First instructions.' };
    let revision = 1;
    owner = new NotesSessionOwner({ chooseFolder: async () => root, prepare: () => ({ definition, revision }), confirmRun: async () => { revision = 2; return true; }, launch, publish: () => {} });
    expect(await start()).toMatchObject({ ok: false, error: { code: 'AGENT_CHANGED' } }); expect(launch).not.toHaveBeenCalled();
    expect(snapshot().selection?.consumed).toBe(false);
  });
});
