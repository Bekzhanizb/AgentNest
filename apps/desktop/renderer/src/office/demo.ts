import { applyAgentEvent, emptyAgentView } from '@agentnest/core';
import type { AgentEvent, AgentProfile, AgentViewState } from '@agentnest/core';

const profiles: readonly AgentProfile[] = [
  { id: 'ada', name: 'Ada', role: 'Researcher', desk: 0, appearance: { skin: 'warm', shirt: 'sage', hair: 'bun' } },
  { id: 'milo', name: 'Milo', role: 'Reviewer', desk: 1, appearance: { skin: 'light', shirt: 'blue', hair: 'headphones' } },
  { id: 'june', name: 'June', role: 'Writer', desk: 2, appearance: { skin: 'deep', shirt: 'coral', hair: 'short' } },
  { id: 'sol', name: 'Sol', role: 'Builder', desk: 3, appearance: { skin: 'warm', shirt: 'gold', hair: 'cap' } },
];

export const DEMO_INITIAL_EVENTS: readonly AgentEvent[] = profiles.map((agent, sequence) => ({
  type: 'agent_added', agent, sequence, second: 0, origin: 'demo',
}));

export const DEMO_EVENTS: readonly AgentEvent[] = [
  { type: 'status_changed', origin: 'demo', sequence: 4, second: 2, agentId: 'ada', status: 'working', task: 'Sample notes overview', message: 'Fictional research task started.' },
  { type: 'status_changed', origin: 'demo', sequence: 5, second: 4, agentId: 'milo', status: 'awaiting_approval', task: 'Sample review decision', message: 'Fictional approval requested. No real action is pending.' },
  { type: 'status_changed', origin: 'demo', sequence: 6, second: 6, agentId: 'june', status: 'completed', task: 'Sample summary', message: 'Fictional summary marked complete. No document was generated.' },
  { type: 'status_changed', origin: 'demo', sequence: 7, second: 8, agentId: 'sol', status: 'failed', task: 'Sample build check', message: 'Scripted example error. No build or provider was run.' },
  { type: 'status_changed', origin: 'demo', sequence: 8, second: 10, agentId: 'ada', status: 'completed', task: 'Sample notes overview', message: 'Fictional research marked complete.' },
  { type: 'status_changed', origin: 'demo', sequence: 9, second: 12, agentId: 'milo', status: 'idle', task: null, message: 'Scripted return to idle. No approval was submitted.' },
];

/** Replay the same finite event sequence; no wall clock, randomness, IPC, or network. */
export function projectDemo(step: number): AgentViewState {
  if (!Number.isInteger(step) || step < 0 || step > DEMO_EVENTS.length) throw new Error('Invalid demo step');
  return [...DEMO_INITIAL_EVENTS, ...DEMO_EVENTS.slice(0, step)].reduce(applyAgentEvent, emptyAgentView('demo'));
}
