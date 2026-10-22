import type { AgentEvent, AgentProfile } from './agent-view';

export interface NoteSource {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}
export interface RunUsage { readonly inputTokens: number | null; readonly outputTokens: number | null }
interface RunEventBase {
  readonly apiVersion: 1;
  readonly origin: 'runtime';
  readonly runId: string;
  readonly sequence: number;
  readonly elapsedMs: number;
  readonly agentId: string;
}
export type RunEventPayload =
  | { readonly type: 'run_started'; readonly agent: AgentProfile }
  | { readonly type: 'provider_ready'; readonly provider: string; readonly version: string; readonly model: string; readonly digest: string }
  | { readonly type: 'provider_call_started'; readonly step: number }
  | { readonly type: 'provider_call_completed'; readonly step: number; readonly finishReason: string; readonly usage: RunUsage }
  | { readonly type: 'note_read'; readonly source: NoteSource }
  | { readonly type: 'run_completed'; readonly summary: string; readonly sources: readonly NoteSource[]; readonly usage: RunUsage; readonly modelCalls: number }
  | { readonly type: 'run_failed'; readonly code: string; readonly message: string }
  | { readonly type: 'run_cancelled' };
export type RunEvent = RunEventBase & RunEventPayload;

/** Trusted in-process events only. Untrusted transport decoding remains a future boundary. */
export function agentEventFromRun(event: RunEvent): AgentEvent | null {
  const base = { origin: 'runtime' as const, sequence: event.sequence, second: event.elapsedMs / 1000 };
  if (event.type === 'run_started') return { ...base, type: 'agent_added', agent: event.agent };
  const change = { ...base, type: 'status_changed' as const, agentId: event.agentId, task: 'Read-only notes proof' };
  switch (event.type) {
    case 'provider_call_started': return { ...change, status: 'working', message: `Local model call ${event.step} started.` };
    case 'note_read': return { ...change, status: 'working', message: `Read approved note: ${event.source.path}.` };
    case 'run_completed': return { ...change, status: 'completed', message: 'Local model returned a summary with verified source paths.' };
    case 'run_failed': return { ...change, status: 'failed', message: `${event.code}: ${event.message}` };
    case 'run_cancelled': return { ...change, status: 'idle', task: null, message: 'Run cancelled; no successful result was recorded.' };
    default: return null;
  }
}
