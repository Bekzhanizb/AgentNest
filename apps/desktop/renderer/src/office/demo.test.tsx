import { describe, expect, it } from 'vitest';
import { DEMO_EVENTS, projectDemo } from './demo';

describe('deterministic demo source', () => {
  it('replays the exact same finite snapshots and preserves fictional origin', () => {
    for (let step = 0; step <= DEMO_EVENTS.length; step++) expect(projectDemo(step)).toEqual(projectDemo(step));
    expect(projectDemo(0).agents).toHaveLength(4);
    expect(projectDemo(0).agents.every((agent) => agent.status === 'idle' && agent.origin === 'demo')).toBe(true);
    expect(projectDemo(4).agents.map((agent) => agent.status)).toEqual(['working', 'awaiting_approval', 'completed', 'failed']);
    expect(projectDemo(0).agents.every((agent) => agent.history.length === 1)).toBe(true);
    expect(() => projectDemo(DEMO_EVENTS.length + 1)).toThrow('Invalid demo step');
  });
});
