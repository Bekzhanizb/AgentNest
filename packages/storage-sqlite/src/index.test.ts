import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { AgentDefinition, RunEvent, SavedAgent } from '@agentnest/core';
import { APPLICATION_ID, MIGRATIONS, SqliteRepository } from './index';

let directory: string; let filename: string; let repo: SqliteRepository;
const edit = { id: null, revision: 0, name: "Maker's notes", instructions: 'Summarize the public notes, with citations.', model: 'qwen3:1.7b' } as const;
const definition: AgentDefinition = { id: 'one-off', name: 'Public fixture', instructions: 'Summarize the public fixture.', providerId: 'ollama', model: 'qwen3:1.7b' };
function started(id = randomUUID()): RunEvent { return { apiVersion: 1, origin: 'runtime', runId: id, agentId: id, sequence: 0, elapsedMs: 0, type: 'run_started', agent: { id, name: 'Public fixture', role: 'Test fixture, no inference', desk: 0, appearance: { skin: 'warm', shirt: 'sage', hair: 'short' } } }; }
function terminal(first: RunEvent, type: 'run_cancelled' | 'run_failed' = 'run_cancelled'): RunEvent { const base = { apiVersion: 1 as const, origin: 'runtime' as const, runId: first.runId, agentId: first.agentId, sequence: 1, elapsedMs: 10 }; return type === 'run_failed' ? { ...base, type, code: 'FIXTURE_FAILURE', message: 'Explicit test fixture.' } : { ...base, type }; }
function clean(agent: SavedAgent): AgentDefinition { return { id: agent.id, name: agent.name, instructions: agent.instructions, providerId: agent.providerId, model: agent.model }; }
beforeEach(() => { directory = mkdtempSync(path.join(tmpdir(), 'agentnest-sqlite-')); filename = path.join(directory, 'agentnest.sqlite'); repo = new SqliteRepository(filename); });
afterEach(() => { repo.close(); rmSync(directory, { recursive: true, force: true }); });
describe('actual SQLite files (explicit event fixtures, no provider simulation)', () => {
  it('saves, edits and reloads definitions with optimistic revision conflicts and bound SQL', () => {
    const saved = repo.saveAgent(edit); expect(saved.revision).toBe(1);
    const edited = repo.saveAgent({ ...edit, id: saved.id, revision: 1, name: "'; DROP TABLE agents; --" });
    expect(edited.revision).toBe(2); expect(() => repo.saveAgent({ ...edit, id: saved.id, revision: 1 })).toThrow('CONFLICT');
    repo.close(); repo = new SqliteRepository(filename); expect(repo.listAgents()).toEqual([edited]);
  });
  it('keeps immutable run definitions after edits/deletion and cascades only explicit history deletion', () => {
    const saved = repo.saveAgent(edit); const first = started(); repo.append(first, clean(saved), saved.revision); repo.append(terminal(first), clean(saved), saved.revision);
    repo.saveAgent({ ...edit, id: saved.id, revision: 1, instructions: 'Different future instructions.' });
    repo.removeAgent({ id: saved.id, revision: 2 });
    repo.close(); repo = new SqliteRepository(filename);
    expect(repo.readRun(first.runId)).toMatchObject({ status: 'cancelled', definition: { instructions: edit.instructions }, definitionRevision: 1 });
    expect(repo.listAgents()).toEqual([]); repo.removeRun(first.runId); expect(repo.listRuns()).toEqual([]);
    const db = new DatabaseSync(filename); expect(db.prepare('SELECT COUNT(*) n FROM events').get()?.['n']).toBe(0); db.close();
  });
  it('recovers unfinished records as interrupted without inventing a terminal runtime event', () => {
    const first = started(); repo.append(first, definition, null); repo.close(); repo = new SqliteRepository(filename);
    expect(repo.readRun(first.runId)).toMatchObject({ status: 'interrupted', events: [first] });
    expect(() => repo.append(terminal(first), definition, null)).toThrow('INVALID_REQUEST');
  });
  it('rolls back duplicate, out-of-order and mismatched-definition appends', () => {
    const first = started(); repo.append(first, definition, null);
    expect(() => repo.append({ ...terminal(first), sequence: 3 }, definition, null)).toThrow('INVALID_REQUEST');
    expect(() => repo.append(terminal(first), { ...definition, instructions: 'Changed' }, null)).toThrow('INVALID_REQUEST');
    expect(() => repo.append(first, definition, null)).toThrow();
    expect(repo.readRun(first.runId).events).toEqual([first]);
    repo.append(terminal(first, 'run_failed'), definition, null); expect(repo.readRun(first.runId).status).toBe('failed');
    expect(() => repo.append({ ...terminal(first), sequence: 2 }, definition, null)).toThrow('INVALID_REQUEST');
  });
  it('excludes permission paths, tokens and original note text from the persistence schema', () => {
    const first = started(); repo.append(first, definition, null); repo.append(terminal(first), definition, null);
    const db = new DatabaseSync(filename); const schema = JSON.stringify(db.prepare("SELECT sql FROM sqlite_schema WHERE type='table'").all()); db.close();
    expect(schema).not.toMatch(/approval|grant|root|folder|note_content/);
    expect(() => repo.append({ ...first, origin: 'demo' } as unknown as RunEvent, definition, null)).toThrow('INVALID_REQUEST');
  });
  it('migrates a version-1 definition transactionally and preserves it', () => {
    repo.close(); rmSync(filename); const db = new DatabaseSync(filename); db.exec(`${MIGRATIONS[0]} PRAGMA application_id=${APPLICATION_ID}; PRAGMA user_version=1;`);
    const id = randomUUID(); db.prepare('INSERT INTO agents VALUES (?,?,?,?,?,?,?,?)').run(id, edit.name, edit.instructions, 'ollama', edit.model, 1, 10, 10); db.close();
    repo = new SqliteRepository(filename); expect(repo.listAgents()[0]?.id).toBe(id); expect(repo.listRuns()).toEqual([]);
    const migrated = new DatabaseSync(filename); expect(migrated.prepare('PRAGMA user_version').get()?.['user_version']).toBe(2); migrated.close();
  });
  it('rolls back a failed migration instead of overwriting the old schema', () => {
    repo.close(); rmSync(filename); const db = new DatabaseSync(filename); db.exec(`${MIGRATIONS[0]} CREATE TABLE runs (legacy TEXT); PRAGMA application_id=${APPLICATION_ID}; PRAGMA user_version=1;`); db.close();
    expect(() => new SqliteRepository(filename)).toThrow('UNAVAILABLE');
    const original = new DatabaseSync(filename); expect(original.prepare('PRAGMA user_version').get()?.['user_version']).toBe(1); expect(original.prepare("SELECT name FROM sqlite_schema WHERE name='events'").all()).toEqual([]); original.close();
  });
  it('refuses newer versions and corrupt files without replacing their bytes', () => {
    repo.close(); let db = new DatabaseSync(filename); db.exec('PRAGMA user_version=999'); db.close();
    const newer = readFileSync(filename); expect(() => new SqliteRepository(filename)).toThrow('UNAVAILABLE'); expect(readFileSync(filename)).toEqual(newer);
    writeFileSync(filename, 'not a SQLite database'); const corrupt = readFileSync(filename); expect(() => new SqliteRepository(filename)).toThrow(); expect(readFileSync(filename)).toEqual(corrupt);
    rmSync(filename); db = new DatabaseSync(filename); db.exec('CREATE TABLE unrelated (private_data TEXT)'); db.close(); expect(() => new SqliteRepository(filename)).toThrow('UNAVAILABLE');
  });
  it('refuses invalid persisted records instead of presenting an empty library', () => {
    repo.saveAgent(edit); repo.close(); const db = new DatabaseSync(filename); db.exec("UPDATE agents SET model='https://remote.example/model'"); db.close(); expect(() => new SqliteRepository(filename)).toThrow('UNAVAILABLE');
  });
  it('handles a busy writer with bounded failure and leaves the prior record intact', () => {
    repo.saveAgent(edit); const writer = new DatabaseSync(filename); writer.exec('BEGIN IMMEDIATE');
    try { expect(() => repo.saveAgent(edit)).toThrow(); } finally { writer.exec('ROLLBACK'); writer.close(); }
    expect(repo.listAgents()).toHaveLength(1); expect(repo.saveAgent(edit).revision).toBe(1);
  });
  it('enforces explicit retention limits and does not auto-delete history', () => {
    for (let i = 0; i < 32; i++) repo.saveAgent({ ...edit, name: `Agent ${i}` });
    expect(() => repo.saveAgent(edit)).toThrow('LIMIT');
    for (let i = 0; i < 100; i++) { const first = started(); repo.append(first, definition, null); repo.append(terminal(first), definition, null); }
    expect(() => repo.ensureRunCapacity()).toThrow('LIMIT'); expect(() => repo.append(started(), definition, null)).toThrow('LIMIT'); expect(repo.listRuns()).toHaveLength(100);
    repo.clearHistory(); expect(repo.listRuns()).toEqual([]); expect(repo.listAgents()).toHaveLength(32);
  }, 30_000); // 232 separate durable transactions can exceed 5 seconds on Windows CI disks.

});
