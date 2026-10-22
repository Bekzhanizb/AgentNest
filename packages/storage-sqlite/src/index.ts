import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, lstatSync } from 'node:fs';
import { isAgentDefinition, isAgentEdit, isAgentRef, isLibraryId, isRunEvent, isRunSummary, isSavedAgent, isStoredRun } from '@agentnest/core';
import type { AgentDefinition, AgentEdit, AgentRef, RunEvent, RunSummary, SavedAgent, StoredRun } from '@agentnest/core';
import { StorageError } from '@agentnest/storage';
import type { AgentRepository } from '@agentnest/storage';

export const APPLICATION_ID = 0x414e5354;
export const MIGRATIONS = [
  `CREATE TABLE agents (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, instructions TEXT NOT NULL,
    provider_id TEXT NOT NULL CHECK(provider_id='ollama'), model TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK(revision>0), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  ) STRICT;`,
  `CREATE TABLE runs (
    id TEXT PRIMARY KEY, agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    definition TEXT NOT NULL, definition_revision INTEGER, name TEXT NOT NULL, model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running','completed','failed','cancelled','interrupted')),
    started_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE events (
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL CHECK(sequence BETWEEN 0 AND 31), payload TEXT NOT NULL,
    PRIMARY KEY(run_id,sequence)
  ) STRICT;`,
] as const;
const agentColumns = 'id,name,instructions,provider_id AS providerId,model,revision,created_at AS createdAt,updated_at AS updatedAt';
const runColumns = 'id,name,model,status,started_at AS startedAt,updated_at AS updatedAt';
const definitionOnly = (agent: AgentDefinition): AgentDefinition => ({ id: agent.id, name: agent.name, instructions: agent.instructions, providerId: agent.providerId, model: agent.model });

/** Single owner, small bounded synchronous transactions. Never imported by a renderer. */
export class SqliteRepository implements AgentRepository {
  private readonly db: DatabaseSync;
  private closed = false;
  constructor(filename: string, private readonly now: () => number = Date.now) {
    if (existsSync(filename)) {
      const stat = lstatSync(filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new StorageError();
    }
    this.db = new DatabaseSync(filename, { enableForeignKeyConstraints: true, enableDoubleQuotedStringLiterals: false, allowExtension: false, timeout: 1000, defensive: true });
    try {
      if (process.platform !== 'win32') chmodSync(filename, 0o600);
      this.db.exec('PRAGMA trusted_schema=OFF; PRAGMA secure_delete=ON;');
      const application = this.db.prepare('PRAGMA application_id').get()?.['application_id'];
      const version = this.db.prepare('PRAGMA user_version').get()?.['user_version'];
      if (typeof version !== 'number' || version < 0 || version > MIGRATIONS.length || (application !== 0 && application !== APPLICATION_ID)) throw new StorageError();
      if (application === 0 && (version !== 0 || this.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().length)) throw new StorageError();
      if (this.db.prepare('PRAGMA quick_check').get()?.['quick_check'] !== 'ok') throw new StorageError();
      // DELETE mode deliberately avoids active WAL sidecars in this bounded local workload.
      this.db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
      this.transaction(() => {
        for (let index = version; index < MIGRATIONS.length; index++) {
          this.db.exec(MIGRATIONS[index]!);
          this.db.exec(`PRAGMA user_version=${index + 1}`);
        }
        this.db.exec(`PRAGMA application_id=${APPLICATION_ID}`);
        if (this.db.prepare('PRAGMA foreign_key_check').all().length) throw new StorageError();
        // Validate persisted content before marking interrupted runs. Never replace bad data.
        this.listAgents();
        for (const run of this.listRuns()) this.readRun(run.id);
        this.db.prepare("UPDATE runs SET status='interrupted',updated_at=MAX(updated_at,?) WHERE status='running'").run(this.now());
      });
    } catch { this.db.close(); this.closed = true; throw new StorageError(); }
  }
  private transaction<T>(action: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  listAgents(): readonly SavedAgent[] {
    const rows: unknown[] = this.db.prepare(`SELECT ${agentColumns} FROM agents ORDER BY updated_at DESC,id LIMIT 33`).all();
    if (rows.length > 32 || !rows.every(isSavedAgent)) throw new StorageError();
    return rows;
  }
  resolveAgent(ref: AgentRef): SavedAgent {
    if (!isAgentRef(ref)) throw new StorageError('INVALID_REQUEST');
    const row = this.db.prepare(`SELECT ${agentColumns} FROM agents WHERE id=?`).get(ref.id);
    if (!row) throw new StorageError('CONFLICT');
    if (!isSavedAgent(row)) throw new StorageError();
    if (row.revision !== ref.revision) throw new StorageError('CONFLICT');
    return row;
  }
  saveAgent(edit: AgentEdit): SavedAgent {
    if (!isAgentEdit(edit)) throw new StorageError('INVALID_REQUEST');
    return this.transaction(() => {
      const now = this.now(); let id = edit.id; let revision = edit.revision;
      if (id === null) {
        if (this.listAgents().length >= 32) throw new StorageError('LIMIT');
        id = randomUUID(); revision = 1;
        this.db.prepare('INSERT INTO agents VALUES (?,?,?,?,?,?,?,?)').run(id, edit.name.trim(), edit.instructions.trim(), 'ollama', edit.model, revision, now, now);
      } else {
        this.resolveAgent({ id, revision }); revision++;
        this.db.prepare('UPDATE agents SET name=?,instructions=?,model=?,revision=?,updated_at=MAX(updated_at,?) WHERE id=?').run(edit.name.trim(), edit.instructions.trim(), edit.model, revision, now, id);
      }
      return this.resolveAgent({ id, revision });
    });
  }
  removeAgent(ref: AgentRef): void {
    this.transaction(() => { this.resolveAgent(ref); this.db.prepare('DELETE FROM agents WHERE id=?').run(ref.id); });
  }
  listRuns(): readonly RunSummary[] {
    const rows: unknown[] = this.db.prepare(`SELECT ${runColumns} FROM runs ORDER BY started_at DESC,id LIMIT 101`).all();
    if (rows.length > 100 || !rows.every(isRunSummary)) throw new StorageError();
    return rows;
  }
  readRun(id: string): StoredRun {
    if (!isLibraryId(id)) throw new StorageError('INVALID_REQUEST');
    const row = this.db.prepare(`SELECT ${runColumns},definition,definition_revision AS definitionRevision FROM runs WHERE id=?`).get(id);
    if (!row) throw new StorageError('CONFLICT');
    const events = this.db.prepare('SELECT payload FROM events WHERE run_id=? ORDER BY sequence LIMIT 33').all(id).map((event) => JSON.parse(String(event['payload'])) as unknown);
    const run: unknown = { ...row, definition: JSON.parse(String(row['definition'])) as unknown, events };
    if (!isStoredRun(run)) throw new StorageError();
    return run;
  }
  ensureRunCapacity(): void { if (this.listRuns().length >= 100) throw new StorageError('LIMIT'); }
  append(event: RunEvent, definition: AgentDefinition, revision: number | null): void {
    const clean = definitionOnly(definition);
    if (!isRunEvent(event) || !isAgentDefinition(clean) || (revision !== null && (!Number.isSafeInteger(revision) || revision < 1))) throw new StorageError('INVALID_REQUEST');
    this.transaction(() => {
      const now = this.now();
      if (event.sequence === 0) {
        if (event.type !== 'run_started') throw new StorageError('INVALID_REQUEST');
        this.ensureRunCapacity();
        // Snapshot survives edits/deletion. Only a still-existing definition gets a live FK.
        const linked = revision !== null && this.db.prepare('SELECT id FROM agents WHERE id=?').get(clean.id) ? clean.id : null;
        this.db.prepare('INSERT INTO runs VALUES (?,?,?,?,?,?,?,?,?)').run(event.runId, linked, JSON.stringify(clean), revision, clean.name, clean.model, 'running', now, now);
      } else {
        const previous = this.readRun(event.runId);
        if (previous.status !== 'running' || event.sequence !== previous.events.length || event.elapsedMs < previous.events.at(-1)!.elapsedMs || JSON.stringify(previous.definition) !== JSON.stringify(clean) || previous.definitionRevision !== revision) throw new StorageError('INVALID_REQUEST');
      }
      this.db.prepare('INSERT INTO events VALUES (?,?,?)').run(event.runId, event.sequence, JSON.stringify(event));
      const status = event.type === 'run_completed' ? 'completed' : event.type === 'run_failed' ? 'failed' : event.type === 'run_cancelled' ? 'cancelled' : 'running';
      this.db.prepare('UPDATE runs SET status=?,updated_at=MAX(updated_at,?) WHERE id=?').run(status, now, event.runId);
      this.readRun(event.runId);
    });
  }
  removeRun(id: string): void {
    this.transaction(() => { this.readRun(id); this.db.prepare('DELETE FROM runs WHERE id=?').run(id); });
  }
  clearHistory(): void { this.transaction(() => { this.db.exec('DELETE FROM runs'); }); }
  close(): void { if (!this.closed) { this.db.close(); this.closed = true; } }
}
