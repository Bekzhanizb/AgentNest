import type { RunEvent, NoteSource } from './run-event';

export const NOTES_CHANNELS = Object.freeze({ read: 'agentnest:notes-read', choose: 'agentnest:notes-choose', start: 'agentnest:notes-start', cancel: 'agentnest:notes-cancel', clear: 'agentnest:notes-clear', changed: 'agentnest:notes-changed' });
export const SESSION_ERRORS = {
  INVALID_REQUEST: 'This request is not allowed.', BUSY: 'Finish or cancel the current operation first.',
  NO_GRANT: 'Choose a notes folder and review its files before running.', EXPIRED_GRANT: 'This permission expired. Choose the folder again.',
  FOLDER_UNAVAILABLE: 'Choose 1–4 regular .md files, up to 8 KiB each and 16 KiB total, using ASCII letters, digits, dots, underscores or hyphens in filenames. The folder is unavailable or exceeds these limits.',
  INVALID_EVENT: 'The runtime returned an invalid event. The run was stopped.', WORKER_EXITED: 'The runtime stopped unexpectedly. No successful result was recorded.',
  RUN_TIMEOUT: 'The runtime exceeded its deadline and was stopped.', UNAVAILABLE: 'The desktop notes service is unavailable.',
} as const;
export type SessionErrorCode = keyof typeof SESSION_ERRORS;
export interface SessionError { readonly code: SessionErrorCode; readonly message: string }
export type SessionPhase = 'empty' | 'ready' | 'running' | 'cancelling' | 'completed' | 'failed' | 'cancelled';
export interface NotesSelection {
  readonly id: string; readonly folderName: string; readonly expiresAt: number; readonly consumed: boolean;
  readonly files: readonly { readonly path: string; readonly bytes: number }[];
}
export interface NotesSession {
  readonly revision: number; readonly phase: SessionPhase; readonly selection: NotesSelection | null;
  readonly model: string | null; readonly events: readonly RunEvent[]; readonly error: SessionError | null;
}
export type NotesResult = { readonly ok: true; readonly snapshot: NotesSession } | { readonly ok: false; readonly error: SessionError };
export interface NotesRequest { readonly apiVersion: 1 }
export interface StartNotesRequest extends NotesRequest { readonly grantId: string; readonly model: string; readonly consent: true }
export interface NotesBridge {
  read(): Promise<NotesResult>; choose(): Promise<NotesResult>; start(request: StartNotesRequest): Promise<NotesResult>;
  cancel(): Promise<NotesResult>; clear(): Promise<NotesResult>;
  subscribe(listener: (snapshot: NotesSession | null) => void): () => void;
}
export const emptyNotesSession = (): NotesSession => ({ revision: 0, phase: 'empty', selection: null, model: null, events: [], error: null });
export const sessionError = (code: SessionErrorCode): SessionError => ({ code, message: SESSION_ERRORS[code] });
export const isActiveSession = (v: NotesSession): boolean => v.phase === 'running' || v.phase === 'cancelling';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const keys = (v: Record<string, unknown>, expected: readonly string[]) => Object.keys(v).length === expected.length && expected.every((key) => Object.hasOwn(v, key));
const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const integer = (v: unknown, max = 1_000_000_000) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const uuid = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export const isNoteName = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}\.md$/.test(v);
export const isLocalModelName = (v: unknown): v is string => typeof v === 'string' && v.length <= 128 && /^[a-z0-9][a-z0-9._-]*(?::[a-zA-Z0-9._-]+)?$/.test(v) && !v.toLowerCase().includes('cloud');
export function isNotesRequest(v: unknown): v is NotesRequest { return record(v) && keys(v, ['apiVersion']) && v['apiVersion'] === 1; }
export function isStartNotesRequest(v: unknown): v is StartNotesRequest {
  return record(v) && keys(v, ['apiVersion', 'grantId', 'model', 'consent']) && v['apiVersion'] === 1 && uuid(v['grantId']) && isLocalModelName(v['model']) && v['consent'] === true;
}
function isSource(v: unknown): v is NoteSource {
  return record(v) && keys(v, ['path', 'bytes', 'sha256']) && isNoteName(v['path']) && integer(v['bytes'], 8192) && typeof v['sha256'] === 'string' && /^[a-f0-9]{64}$/.test(v['sha256']);
}
function isUsage(v: unknown): boolean {
  return record(v) && keys(v, ['inputTokens', 'outputTokens']) && ['inputTokens', 'outputTokens'].every((key) => v[key] === null || integer(v[key]));
}

/** Decode before crossing a renderer/worker boundary. The owner also checks ordering. */
export function isRunEvent(v: unknown): v is RunEvent {
  if (!record(v) || v['apiVersion'] !== 1 || v['origin'] !== 'runtime' || !uuid(v['runId']) || v['agentId'] !== v['runId'] || !integer(v['sequence'], 31) || !integer(v['elapsedMs'])) return false;
  const base = ['apiVersion', 'origin', 'runId', 'agentId', 'sequence', 'elapsedMs', 'type'];
  const exact = (...extra: string[]) => keys(v, [...base, ...extra]);
  switch (v['type']) {
    case 'run_started': {
      const agent = v['agent'];
      if (!exact('agent') || !record(agent) || !keys(agent, ['id', 'name', 'role', 'desk', 'appearance']) || agent['id'] !== v['runId'] || !text(agent['name'], 128) || !text(agent['role'], 128) || !integer(agent['desk'], 3)) return false;
      const look = agent['appearance'];
      return record(look) && keys(look, ['skin', 'shirt', 'hair']) && ['light', 'warm', 'deep'].includes(String(look['skin'])) && ['sage', 'blue', 'coral', 'gold'].includes(String(look['shirt'])) && ['short', 'bun', 'cap', 'headphones'].includes(String(look['hair']));
    }
    case 'provider_ready': return exact('provider', 'version', 'model', 'digest') && v['provider'] === 'ollama' && text(v['version'], 60) && isLocalModelName(v['model']) && typeof v['digest'] === 'string' && /^[a-f0-9]{64}$/.test(v['digest']);
    case 'provider_call_started': return exact('step') && integer(v['step'], 4) && v['step'] !== 0;
    case 'provider_call_completed': return exact('step', 'finishReason', 'usage') && integer(v['step'], 4) && v['step'] !== 0 && text(v['finishReason'], 40) && isUsage(v['usage']);
    case 'note_read': return exact('source') && isSource(v['source']);
    case 'run_completed': return exact('summary', 'sources', 'usage', 'modelCalls') && text(v['summary'], 4096) && Array.isArray(v['sources']) && v['sources'].length > 0 && v['sources'].length <= 4 && v['sources'].every(isSource) && isUsage(v['usage']) && integer(v['modelCalls'], 4) && v['modelCalls'] !== 0;
    case 'run_failed': return exact('code', 'message') && typeof v['code'] === 'string' && /^[A-Z_]{1,50}$/.test(v['code']) && text(v['message'], 512);
    case 'run_cancelled': return exact();
    default: return false;
  }
}
const isError = (v: unknown): v is SessionError => record(v) && keys(v, ['code', 'message']) && typeof v['code'] === 'string' && Object.hasOwn(SESSION_ERRORS, v['code']) && v['message'] === SESSION_ERRORS[v['code'] as SessionErrorCode];
export function isNotesSession(v: unknown): v is NotesSession {
  if (!record(v) || !keys(v, ['revision', 'phase', 'selection', 'model', 'events', 'error']) || !integer(v['revision']) || !['empty', 'ready', 'running', 'cancelling', 'completed', 'failed', 'cancelled'].includes(String(v['phase']))
    || (v['model'] !== null && !isLocalModelName(v['model'])) || (v['error'] !== null && !isError(v['error'])) || !Array.isArray(v['events']) || v['events'].length > 32 || !v['events'].every(isRunEvent)) return false;
  const events = v['events'] as RunEvent[];
  if (events.some((event, index) => event.sequence !== index || event.runId !== events[0]?.runId || (index > 0 && event.elapsedMs < (events[index - 1]?.elapsedMs ?? 0)))) return false;
  const selected = v['selection'];
  return selected === null || (record(selected) && keys(selected, ['id', 'folderName', 'expiresAt', 'consumed', 'files']) && uuid(selected['id']) && text(selected['folderName'], 120) && typeof selected['expiresAt'] === 'number' && Number.isSafeInteger(selected['expiresAt']) && selected['expiresAt'] > 0 && typeof selected['consumed'] === 'boolean'
    && Array.isArray(selected['files']) && selected['files'].length > 0 && selected['files'].length <= 4 && selected['files'].every((file: unknown) => record(file) && keys(file, ['path', 'bytes']) && isNoteName(file['path']) && integer(file['bytes'], 8192)));
}
export function isNotesResult(v: unknown): v is NotesResult {
  return record(v) && (v['ok'] === true ? keys(v, ['ok', 'snapshot']) && isNotesSession(v['snapshot']) : v['ok'] === false && keys(v, ['ok', 'error']) && isError(v['error']));
}
