import type { AgentDefinition } from './index';
import { isLocalModelName, isRunEvent } from './notes-session';
import type { RunEvent } from './run-event';

export const LIBRARY_CHANNELS = Object.freeze({ read: 'agentnest:library-read', saveAgent: 'agentnest:library-save-agent', removeAgent: 'agentnest:library-remove-agent', readRun: 'agentnest:library-read-run', removeRun: 'agentnest:library-remove-run', clearHistory: 'agentnest:library-clear-history' });
export const LIBRARY_ERRORS = {
  UNAVAILABLE: 'Local storage is unavailable. No database was replaced. Close AgentNest and check the recovery guide.',
  INVALID_REQUEST: 'The saved-agent request is invalid.',
  CONFLICT: 'This agent changed or was deleted. Reload the library before saving or running.',
  LIMIT: 'Local storage holds up to 32 agents and 100 runs. Delete records before adding more.',
  BUSY: 'Finish or cancel the active run before deleting history.',
} as const;
export type LibraryErrorCode = keyof typeof LIBRARY_ERRORS;
export interface SavedAgent extends AgentDefinition { readonly revision: number; readonly createdAt: number; readonly updatedAt: number }
export interface AgentEdit { readonly id: string | null; readonly revision: number; readonly name: string; readonly instructions: string; readonly model: string }
export interface AgentRef { readonly id: string; readonly revision: number }
export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
export interface RunSummary { readonly id: string; readonly name: string; readonly model: string; readonly status: RunStatus; readonly startedAt: number; readonly updatedAt: number }
export interface StoredRun extends RunSummary { readonly definition: AgentDefinition; readonly definitionRevision: number | null; readonly events: readonly RunEvent[] }
export interface LibrarySnapshot { readonly agents: readonly SavedAgent[]; readonly runs: readonly RunSummary[]; readonly selectedRun: StoredRun | null }
export type LibraryResult = { readonly ok: true; readonly value: LibrarySnapshot } | { readonly ok: false; readonly error: LibraryErrorCode };
export interface LibraryBridge {
  read(): Promise<LibraryResult>;
  saveAgent(request: { readonly apiVersion: 1; readonly agent: AgentEdit }): Promise<LibraryResult>;
  removeAgent(request: { readonly apiVersion: 1; readonly id: string; readonly revision: number }): Promise<LibraryResult>;
  readRun(request: { readonly apiVersion: 1; readonly id: string }): Promise<LibraryResult>;
  removeRun(request: { readonly apiVersion: 1; readonly id: string }): Promise<LibraryResult>;
  clearHistory(): Promise<LibraryResult>;
}
export const emptyLibrary = (): LibrarySnapshot => ({ agents: [], runs: [], selectedRun: null });
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const keys = (v: Record<string, unknown>, fields: readonly string[]) => Object.keys(v).length === fields.length && fields.every((field) => Object.hasOwn(v, field));
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && [...v].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127 || ['\t', '\n', '\r'].includes(char));
const integer = (v: unknown, min = 1): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min;
export const isLibraryId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export function isAgentRef(v: unknown): v is AgentRef { return record(v) && keys(v, ['id', 'revision']) && isLibraryId(v['id']) && integer(v['revision']); }
export function isAgentDefinition(v: unknown): v is AgentDefinition { return record(v) && keys(v, ['id', 'name', 'instructions', 'providerId', 'model']) && text(v['id'], 128) && text(v['name'], 80) && text(v['instructions'], 4000) && v['providerId'] === 'ollama' && isLocalModelName(v['model']); }
export function isAgentEdit(v: unknown): v is AgentEdit {
  return record(v) && keys(v, ['id', 'revision', 'name', 'instructions', 'model']) && (v['id'] === null ? v['revision'] === 0 : isLibraryId(v['id']) && integer(v['revision'])) && text(v['name'], 80) && text(v['instructions'], 4000) && isLocalModelName(v['model']);
}
export function isSavedAgent(v: unknown): v is SavedAgent {
  if (!record(v) || !keys(v, ['id', 'name', 'instructions', 'providerId', 'model', 'revision', 'createdAt', 'updatedAt'])) return false;
  const { revision, createdAt, updatedAt, ...definition } = v;
  return isAgentDefinition(definition) && isLibraryId(definition.id) && integer(revision) && integer(createdAt) && integer(updatedAt) && updatedAt >= createdAt;
}
export function isRunSummary(v: unknown): v is RunSummary {
  return record(v) && keys(v, ['id', 'name', 'model', 'status', 'startedAt', 'updatedAt']) && isLibraryId(v['id']) && text(v['name'], 80) && isLocalModelName(v['model']) && ['running', 'completed', 'failed', 'cancelled', 'interrupted'].includes(String(v['status'])) && integer(v['startedAt']) && integer(v['updatedAt']) && v['updatedAt'] >= v['startedAt'];
}
export function isStoredRun(v: unknown): v is StoredRun {
  if (!record(v) || !keys(v, ['id', 'name', 'model', 'status', 'startedAt', 'updatedAt', 'definition', 'definitionRevision', 'events'])) return false;
  const { definition, definitionRevision, events, ...summary } = v;
  if (!isRunSummary(summary) || !isAgentDefinition(definition) || definition.name !== summary.name || definition.model !== summary.model || (definitionRevision !== null && !integer(definitionRevision)) || !Array.isArray(events) || !events.length || events.length > 32 || !events.every(isRunEvent)) return false;
  if (events[0]?.type !== 'run_started' || events.some((event, index) => event.runId !== summary.id || event.sequence !== index || (index > 0 && event.elapsedMs < (events[index - 1]?.elapsedMs ?? 0)) || (index < events.length - 1 && ['run_completed', 'run_failed', 'run_cancelled'].includes(event.type)))) return false;
  const terminal = events.at(-1)?.type;
  return summary.status === 'completed' ? terminal === 'run_completed' : summary.status === 'failed' ? terminal === 'run_failed' : summary.status === 'cancelled' ? terminal === 'run_cancelled' : !['run_completed', 'run_failed', 'run_cancelled'].includes(terminal ?? '');
}
export function isLibraryRequest(operation: keyof typeof LIBRARY_CHANNELS, v: unknown): boolean {
  if (!record(v) || v['apiVersion'] !== 1) return false;
  if (operation === 'read' || operation === 'clearHistory') return keys(v, ['apiVersion']);
  if (operation === 'saveAgent') return keys(v, ['apiVersion', 'agent']) && isAgentEdit(v['agent']);
  return keys(v, operation === 'removeAgent' ? ['apiVersion', 'id', 'revision'] : ['apiVersion', 'id']) && isLibraryId(v['id']) && (operation !== 'removeAgent' || integer(v['revision']));
}
export function isLibraryResult(v: unknown): v is LibraryResult {
  if (!record(v)) return false;
  if (v['ok'] === false) return keys(v, ['ok', 'error']) && typeof v['error'] === 'string' && Object.hasOwn(LIBRARY_ERRORS, v['error']);
  const s = v['value'];
  return v['ok'] === true && keys(v, ['ok', 'value']) && record(s) && keys(s, ['agents', 'runs', 'selectedRun']) && Array.isArray(s['agents']) && s['agents'].length <= 32 && s['agents'].every(isSavedAgent) && Array.isArray(s['runs']) && s['runs'].length <= 100 && s['runs'].every(isRunSummary) && (s['selectedRun'] === null || isStoredRun(s['selectedRun']));
}
