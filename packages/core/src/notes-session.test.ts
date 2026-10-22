import { describe, expect, it } from 'vitest';
import { emptyNotesSession, isNotesRequest, isStartNotesRequest, isNotesSession, isNotesResult, isRunEvent, sessionError } from './notes-session';
import type { RunEvent } from './run-event';
const id = '12345678-1234-4234-8234-123456789abc';
const start = { apiVersion: 1, grantId: id, model: 'qwen3:1.7b', consent: true };
const event: RunEvent = { apiVersion: 1, origin: 'runtime', runId: id, agentId: id, sequence: 0, elapsedMs: 0, type: 'run_cancelled' };
describe('notes transport decoders', () => {
  it('accepts only explicit versioned operations, opaque grant and literal consent', () => {
    expect(isNotesRequest({ apiVersion: 1 })).toBe(true); expect(isStartNotesRequest(start)).toBe(true);
    for (const request of [{ ...start, consent: false }, { ...start, consent: 'true' }, { ...start, directory: '/private' }, { ...start, model: 'qwen:cloud' }, { ...start, model: 'remote/model' }, { ...start, grantId: '../x' }]) expect(isStartNotesRequest(request)).toBe(false);
    expect(isNotesRequest({ apiVersion: 1, path: 'x' })).toBe(false);
  });
  it('rejects demo origin, unknown fields, malformed source paths and excessive content', () => {
    expect(isRunEvent(event)).toBe(true);
    for (const value of [{ ...event, origin: 'demo' }, { ...event, sequence: -1 }, { ...event, agentId: 'other' }, { ...event, secret: 'x' }, { ...event, type: 'note_read', source: { path: '../private.md', bytes: 1, sha256: 'a'.repeat(64) } }, { ...event, type: 'run_completed', summary: 'a'.repeat(4097), sources: [], modelCalls: 1, usage: { inputTokens: null, outputTokens: null } }]) expect(isRunEvent(value)).toBe(false);
  });
  it('validates result envelopes, safe errors and ordered snapshots', () => {
    expect(isNotesResult({ ok: true, snapshot: emptyNotesSession() })).toBe(true);
    expect(isNotesResult({ ok: false, error: sessionError('BUSY') })).toBe(true);
    expect(isNotesResult({ ok: false, error: { code: 'BUSY', message: 'private data' } })).toBe(false);
    expect(isNotesSession({ ...emptyNotesSession(), events: [event, { ...event, sequence: 0 }] })).toBe(false);
    expect(isNotesSession({ ...emptyNotesSession(), events: Array(33).fill(event) })).toBe(false);
    expect(isNotesSession({ ...emptyNotesSession(), absolutePath: '/private' })).toBe(false);
  });
});
