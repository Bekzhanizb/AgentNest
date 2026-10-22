export type AgentStatus = 'idle' | 'working' | 'awaiting_approval' | 'completed' | 'failed';
export type EventOrigin = 'demo' | 'runtime';
export type Desk = 0 | 1 | 2 | 3;

export interface AgentAppearance {
  readonly skin: 'light' | 'warm' | 'deep';
  readonly shirt: 'sage' | 'blue' | 'coral' | 'gold';
  readonly hair: 'short' | 'bun' | 'cap' | 'headphones';
}

export interface AgentProfile {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly desk: Desk;
  readonly appearance: AgentAppearance;
}

interface EventBase {
  readonly sequence: number;
  readonly second: number;
  readonly origin: EventOrigin;
}

export type AgentEvent = EventBase & (
  | { readonly type: 'agent_added'; readonly agent: AgentProfile }
  | { readonly type: 'status_changed'; readonly agentId: string; readonly status: AgentStatus; readonly task: string | null; readonly message: string }
);

export interface AgentHistoryEntry {
  readonly sequence: number;
  readonly second: number;
  readonly status: AgentStatus;
  readonly message: string;
}

export interface AgentViewModel extends AgentProfile {
  readonly origin: EventOrigin;
  readonly status: AgentStatus;
  readonly task: string | null;
  readonly history: readonly AgentHistoryEntry[];
}

export interface AgentViewState {
  readonly origin: EventOrigin;
  readonly sequence: number;
  readonly agents: readonly AgentViewModel[];
}

export const STATUS_PRESENTATION: Record<AgentStatus, { readonly label: string; readonly symbol: string }> = {
  idle: { label: 'Idle', symbol: '○' },
  working: { label: 'Working', symbol: '▶' },
  awaiting_approval: { label: 'Awaiting approval', symbol: 'Ⅱ' },
  completed: { label: 'Completed', symbol: '✓' },
  failed: { label: 'Failed', symbol: '!' },
};

export function emptyAgentView(origin: EventOrigin): AgentViewState {
  return { origin, sequence: -1, agents: [] };
}

/** Pure projection. A renderer, animation clock, provider, or database is not involved. */
export function applyAgentEvent(state: AgentViewState, event: AgentEvent): AgentViewState {
  if (event.origin !== state.origin) throw new Error('Cannot mix demo and runtime events');
  if (!Number.isSafeInteger(event.sequence) || event.sequence <= state.sequence) throw new Error('Events must be ordered and unique');
  if (!Number.isFinite(event.second) || event.second < 0) throw new Error('Invalid event time');
  if (event.type === 'agent_added') {
    if (state.agents.some((agent) => agent.id === event.agent.id || agent.desk === event.agent.desk)) throw new Error('Agent or desk already present');
    return { ...state, sequence: event.sequence, agents: [...state.agents, {
      ...event.agent, origin: event.origin, status: 'idle', task: null,
      history: [{ sequence: event.sequence, second: event.second, status: 'idle', message: 'Joined the office view.' }],
    }] };
  }
  if (!state.agents.some((agent) => agent.id === event.agentId)) throw new Error('Unknown agent');
  return { ...state, sequence: event.sequence, agents: state.agents.map((agent) => agent.id !== event.agentId ? agent : {
    ...agent, status: event.status, task: event.task,
    history: [...agent.history, { sequence: event.sequence, second: event.second, status: event.status, message: event.message }].slice(-50),
  }) };
}
