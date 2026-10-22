import { describe, expect, it } from 'vitest';
import { applyAgentEvent, emptyAgentView, STATUS_PRESENTATION } from './agent-view';
import type { AgentEvent, AgentStatus } from './agent-view';

const added: AgentEvent = { type: 'agent_added', origin: 'demo', sequence: 0, second: 0,
  agent: { id: 'test', name: 'Test', role: 'Fixture', desk: 0, appearance: { skin: 'warm', shirt: 'sage', hair: 'short' } } };

describe('AgentEvent projection', () => {
  it.each<AgentStatus>(['idle', 'working', 'awaiting_approval', 'completed', 'failed'])('projects %s with text, distinct symbol, task, and history', (status) => {
    const initial = applyAgentEvent(emptyAgentView('demo'), added);
    const event: AgentEvent = { type: 'status_changed', origin: 'demo', sequence: 1, second: 2, agentId: 'test', status, task: 'Fixture task', message: 'Fixture event' };
    const next = applyAgentEvent(initial, event);
    expect(initial.agents[0]?.status).toBe('idle');
    expect(initial.agents[0]?.history).toHaveLength(1);
    expect(next.agents[0]).toMatchObject({ status, task: 'Fixture task', origin: 'demo' });
    expect(next.agents[0]?.history.at(-1)).toMatchObject({ status, message: 'Fixture event', second: 2 });
    expect(STATUS_PRESENTATION[status].label).not.toBe('');
    expect(new Set(Object.values(STATUS_PRESENTATION).map((item) => item.symbol)).size).toBe(5);
  });
  it('rejects mixed origins, out-of-order events, and occupied desks', () => {
    const state = applyAgentEvent(emptyAgentView('demo'), added);
    expect(() => applyAgentEvent(emptyAgentView('runtime'), added)).toThrow('Cannot mix');
    expect(() => applyAgentEvent(state, added)).toThrow('ordered');
    expect(() => applyAgentEvent(state, { ...added, sequence: 1 })).toThrow('already present');
    expect(() => applyAgentEvent(state, { ...added, sequence: 1, second: -1 })).toThrow('Invalid event time');
  });
  it('rejects status events for unknown characters', () => {
    expect(() => applyAgentEvent(emptyAgentView('demo'), { type: 'status_changed', origin: 'demo', sequence: 0, second: 0, agentId: 'missing', status: 'failed', task: null, message: 'Fixture' })).toThrow('Unknown agent');
  });
});
