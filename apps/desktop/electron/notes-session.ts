import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { NotesGrant } from '@agentnest/runtime/notes';
import type { NotesApproval } from '@agentnest/runtime/notes';
import { emptyNotesSession, isActiveSession, isRunEvent, isStartNotesRequest, sessionError } from '@agentnest/core';
import type { NotesResult, NotesSession, RunEvent, SessionErrorCode, NoteSource } from '@agentnest/core';

export interface NotesWorker { cancel(): void; stop(): void }
export interface WorkerCallbacks { event(value: unknown): void; exited(): void }
export type LaunchNotesWorker = (approval: NotesApproval, model: string, callbacks: WorkerCallbacks) => NotesWorker;
interface Dependencies {
  readonly chooseFolder: () => Promise<string | null>; readonly launch: LaunchNotesWorker;
  readonly confirmRun: (approval: NotesApproval, model: string) => Promise<boolean>;
  readonly publish: (snapshot: NotesSession) => void; readonly now?: () => number;
}

/** One window, one single-use native grant, one in-memory run. No Electron/SDK import. */
export class NotesSessionOwner {
  private snapshot = emptyNotesSession();
  private approval: NotesApproval | undefined;
  private choosing = false;
  private confirming = false;
  private closed = false;
  private epoch = 0;
  private startedAt = 0;
  private worker: NotesWorker | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private readonly now: () => number;
  constructor(private readonly dependencies: Dependencies) { this.now = dependencies.now ?? Date.now; }
  read(): NotesResult { return this.closed ? this.error('UNAVAILABLE') : { ok: true, snapshot: this.snapshot }; }
  private error(code: SessionErrorCode): NotesResult { return { ok: false, error: sessionError(code) }; }
  private update(value: Partial<Omit<NotesSession, 'revision'>>): void {
    if (this.closed) return;
    this.snapshot = { ...this.snapshot, ...value, revision: this.snapshot.revision + 1 };
    this.dependencies.publish(this.snapshot);
  }
  private stopWorker(): void { clearTimeout(this.watchdog); this.watchdog = undefined; const worker = this.worker; this.worker = undefined; worker?.stop(); }

  async choose(): Promise<NotesResult> {
    if (this.closed) return this.error('UNAVAILABLE');
    if (this.choosing || this.confirming || isActiveSession(this.snapshot)) return this.error('BUSY');
    this.choosing = true;
    const epoch = this.epoch;
    try {
      const directory = await this.dependencies.chooseFolder();
      if (this.closed || epoch !== this.epoch) return this.error('UNAVAILABLE');
      if (directory === null) return this.read();
      // A new native choice revokes the previous permission before preflight.
      this.approval = undefined;
      this.update({ phase: 'empty', selection: null, events: [], model: null, error: null });
      const approval = await (await NotesGrant.create(directory)).approve();
      if (this.closed || epoch !== this.epoch) return this.error('UNAVAILABLE');
      this.approval = approval;
      this.update({ phase: 'ready', selection: {
        id: randomUUID(), folderName: [...path.basename(approval.root)].filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join('').slice(0, 120) || 'Selected folder',
        expiresAt: this.now() + 600_000, consumed: false, files: approval.files.map(({ path, bytes }) => ({ path, bytes })),
      } });
      return this.read();
    } catch { return this.error('FOLDER_UNAVAILABLE'); }
    finally { this.choosing = false; }
  }

  async start(request: unknown): Promise<NotesResult> {
    if (this.closed) return this.error('UNAVAILABLE');
    if (!isStartNotesRequest(request)) return this.error('INVALID_REQUEST');
    if (this.choosing || this.confirming || isActiveSession(this.snapshot)) return this.error('BUSY');
    const selected = this.snapshot.selection; const approval = this.approval;
    if (!selected || !approval || selected.id !== request.grantId || selected.consumed) return this.error('NO_GRANT');
    if (selected.expiresAt <= this.now()) { this.approval = undefined; this.update({ selection: null, phase: 'empty' }); return this.error('EXPIRED_GRANT'); }
    const epoch = this.epoch;
    this.confirming = true;
    try {
      const allowed = await this.dependencies.confirmRun(approval, request.model);
      if (this.closed || epoch !== this.epoch) return this.error('UNAVAILABLE');
      if (!allowed) return this.read();
      if (selected.expiresAt <= this.now()) { this.approval = undefined; this.update({ selection: null, phase: 'empty' }); return this.error('EXPIRED_GRANT'); }
    } catch { return this.error('UNAVAILABLE'); }
    finally { this.confirming = false; }
    this.approval = undefined;
    this.startedAt = performance.now();
    this.update({ phase: 'running', selection: { ...selected, consumed: true }, model: request.model, events: [], error: null });
    try {
      this.worker = this.dependencies.launch(approval, request.model, { event: (value) => this.accept(value), exited: () => this.exited() });
      this.watchdog = setTimeout(() => this.fail('RUN_TIMEOUT'), 190_000); this.watchdog.unref();
    } catch { this.fail('WORKER_EXITED'); }
    return this.read();
  }

  cancel(): NotesResult {
    if (this.closed) return this.error('UNAVAILABLE');
    if (!isActiveSession(this.snapshot)) return this.error('INVALID_REQUEST');
    if (this.snapshot.phase === 'cancelling') return this.read();
    this.update({ phase: 'cancelling' }); this.worker?.cancel();
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => this.finishCancelled(), 5000); this.watchdog.unref();
    return this.read();
  }
  clear(): NotesResult {
    if (this.closed) return this.error('UNAVAILABLE');
    if (this.choosing || this.confirming || isActiveSession(this.snapshot)) return this.error('BUSY');
    this.approval = undefined; this.update({ phase: 'empty', selection: null, model: null, events: [], error: null }); return this.read();
  }
  revoke(): void { this.epoch++; this.approval = undefined; this.worker?.cancel(); this.stopWorker(); this.update({ phase: 'empty', selection: null, model: null, events: [], error: null }); }
  dispose(): void { this.revoke(); this.closed = true; this.snapshot = emptyNotesSession(); }

  private terminal(type: 'run_cancelled' | 'run_failed', code?: SessionErrorCode): RunEvent | undefined {
    const previous = this.snapshot.events.at(-1);
    if (!previous) return undefined;
    const base = { apiVersion: 1 as const, origin: 'runtime' as const, runId: previous.runId, agentId: previous.agentId, sequence: previous.sequence + 1, elapsedMs: Math.max(previous.elapsedMs, Math.round(performance.now() - this.startedAt)) };
    return type === 'run_cancelled' ? { ...base, type } : { ...base, type, ...sessionError(code ?? 'WORKER_EXITED') };
  }
  private fail(code: SessionErrorCode): void {
    if (!isActiveSession(this.snapshot)) return;
    const event = this.terminal('run_failed', code); this.stopWorker();
    this.update({ phase: 'failed', error: sessionError(code), events: event ? [...this.snapshot.events, event] : this.snapshot.events });
  }
  private finishCancelled(): void {
    const event = this.terminal('run_cancelled'); this.stopWorker();
    this.update({ phase: 'cancelled', events: event ? [...this.snapshot.events, event] : this.snapshot.events });
  }
  private exited(): void {
    if (this.closed || !isActiveSession(this.snapshot)) return;
    if (this.snapshot.phase === 'cancelling') this.finishCancelled(); else this.fail('WORKER_EXITED');
  }
  private accept(value: unknown): void {
    if (this.closed || !isActiveSession(this.snapshot)) return;
    if (!isRunEvent(value) || !this.validNext(value)) { this.fail('INVALID_EVENT'); return; }
    if (this.snapshot.phase === 'cancelling' && ['run_completed', 'run_failed', 'run_cancelled'].includes(value.type)) { this.finishCancelled(); return; }
    const phase = value.type === 'run_completed' ? 'completed' : value.type === 'run_failed' ? 'failed' : value.type === 'run_cancelled' ? 'cancelled' : this.snapshot.phase;
    if (phase === 'completed' || phase === 'failed' || phase === 'cancelled') this.stopWorker();
    this.update({ phase, events: [...this.snapshot.events, value] });
  }
  private validNext(event: RunEvent): boolean {
    const events = this.snapshot.events; const last = events.at(-1);
    if (events.length >= 30 || event.sequence !== events.length || (last && (event.runId !== last.runId || event.elapsedMs < last.elapsedMs))) return false;
    if (!last) return event.type === 'run_started';
    if (event.type === 'run_started') return false;
    const calls = events.filter((value) => value.type === 'provider_call_started');
    const ends = events.filter((value) => value.type === 'provider_call_completed');
    if (event.type === 'provider_ready') return events.length === 1 && event.model === (this.snapshot.model?.includes(':') ? this.snapshot.model : `${this.snapshot.model}:latest`);
    if (event.type === 'provider_call_started') return events.some((value) => value.type === 'provider_ready') && calls.length === ends.length && event.step === calls.length + 1;
    if (event.type === 'provider_call_completed') return calls.length === ends.length + 1 && event.step === calls.length;
    const reads = events.filter((value): value is RunEvent & { type: 'note_read' } => value.type === 'note_read');
    const approved = (source: NoteSource) => this.snapshot.selection?.files.some((file) => file.path === source.path && file.bytes === source.bytes) === true;
    if (event.type === 'note_read') return reads.length < 4 && calls.length > 0 && calls.length === ends.length && ends.at(-1)?.finishReason === 'tool-calls' && approved(event.source) && !reads.some((read) => read.source.path === event.source.path && read.source.sha256 !== event.source.sha256);
    if (event.type === 'run_completed') {
      const sources = new Map(reads.map((read) => [read.source.path, read.source]));
      return calls.length > 0 && calls.length === ends.length && event.modelCalls === calls.length && ends.at(-1)?.finishReason === 'stop'
        && sources.size === this.snapshot.selection?.files.length && event.sources.length === sources.size && new Set(event.sources.map((source) => source.path)).size === sources.size
        && event.sources.every((source) => approved(source) && sources.get(source.path)?.sha256 === source.sha256 && event.summary.includes(`[${source.path}]`));
    }
    return event.type === 'run_failed' || event.type === 'run_cancelled';
  }
}
