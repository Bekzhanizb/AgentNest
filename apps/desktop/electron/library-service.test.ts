import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { SqliteRepository } from '@agentnest/storage-sqlite';
import { LibraryService } from './library-service';
import type { RunEvent } from '@agentnest/core';
let directory: string; let repo: SqliteRepository; let service: LibraryService;
const edit = { id: null, revision: 0, name: 'Public notes agent', instructions: 'Summarize the public notes.', model: 'qwen3:1.7b' } as const;
beforeEach(() => { directory = mkdtempSync(path.join(tmpdir(), 'agentnest-library-service-')); repo = new SqliteRepository(path.join(directory, 'agentnest.sqlite')); service = new LibraryService(repo); });
afterEach(() => { repo.close(); rmSync(directory, { recursive: true, force: true }); });
describe('library service over actual SQLite', () => {
  it('resolves a versioned snapshot and rejects stale/deleted or model-mismatched saved agents', () => {
    const saved = repo.saveAgent(edit); const request = { apiVersion: 1, model: edit.model, grantId: saved.id, consent: true, agent: { id: saved.id, revision: 1 } } as const;
    const snapshot = service.prepare(request); expect(snapshot).toMatchObject({ definition: { instructions: edit.instructions }, revision: 1 });
    repo.saveAgent({ ...edit, id: saved.id, revision: 1, instructions: 'New focus.' });
    expect(() => service.prepare(request)).toThrow('CONFLICT'); expect(snapshot.definition.instructions).toBe(edit.instructions);
    expect(() => service.prepare({ ...request, model: 'other:latest', agent: { id: saved.id, revision: 2 } })).toThrow('CONFLICT');
    repo.removeAgent({ id: saved.id, revision: 2 }); expect(() => service.prepare(request)).toThrow('CONFLICT');
  });
  it('validates operations and prohibits destructive history changes during a live run', () => {
    expect(service.command('read', { apiVersion: 1, sql: 'DELETE FROM agents' }, false)).toEqual({ ok: false, error: 'INVALID_REQUEST' });
    expect(service.command('clearHistory', { apiVersion: 1 }, true)).toEqual({ ok: false, error: 'BUSY' });
    expect(service.command('saveAgent', { apiVersion: 1, agent: edit }, false).ok).toBe(true);
    expect(service.command('read', { apiVersion: 1 }, false)).toMatchObject({ ok: true, value: { agents: [{ name: edit.name }], runs: [] } });
  });
  it('fails closed after a write failure and never disguises unavailable storage as an empty library', () => {
    const resolved = service.prepare({ apiVersion: 1, model: edit.model, grantId: 'unused', consent: true });
    vi.spyOn(repo, 'append').mockImplementation(() => { throw new Error('Sensitive local error details'); });
    expect(() => service.record({} as RunEvent, resolved)).toThrow('UNAVAILABLE');
    expect(service.command('read', { apiVersion: 1 }, false)).toEqual({ ok: false, error: 'UNAVAILABLE' });
    expect(() => service.prepare({ apiVersion: 1, model: edit.model, grantId: 'unused', consent: true })).toThrow('UNAVAILABLE');
    expect(new LibraryService(null).command('read', { apiVersion: 1 }, false)).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });
});
