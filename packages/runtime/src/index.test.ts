import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { MockLanguageModelV4 } from 'ai/test';
import type { LanguageModelV4GenerateResult } from '@ai-sdk/provider';
import { agentEventFromRun, applyAgentEvent, emptyAgentView } from '@agentnest/core';
import type { RunEvent } from '@agentnest/core';
import { ProviderFailure } from '@agentnest/provider-sdk';
import type { ProviderAdapter } from '@agentnest/provider-sdk';
import { runNotesProof } from './index';

let root: string;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'agentnest-runtime-')); await writeFile(path.join(root, 'note.md'), 'Public test fixture.'); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
function response(content: LanguageModelV4GenerateResult['content'], reason: LanguageModelV4GenerateResult['finishReason']['unified'] = 'stop'): LanguageModelV4GenerateResult {
  return { content, finishReason: { unified: reason, raw: undefined }, warnings: [], usage: {
    inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: undefined, text: undefined, reasoning: undefined },
  } };
}
const read = (input = '{"path":"note.md"}', toolName = 'read_note') => response([{ type: 'tool-call', toolCallId: 'call-1', toolName, input }], 'tool-calls');
const answer = (text = 'Public fixture [note.md].') => response([{ type: 'text', text }]);
const agent = { id: 'test', name: 'Test', providerId: 'mock', model: 'test-model', instructions: 'Summarize approved notes.' };
function adapter(model: MockLanguageModelV4): ProviderAdapter {
  return { id: 'mock', options: {}, model: () => model, inspect: async () => ({ provider: 'mock', version: 'test', model: 'test-model', digest: '0'.repeat(64), toolCalls: true }) };
}
async function run(model: MockLanguageModelV4, extra: Partial<Parameters<typeof runNotesProof>[0]> = {}) {
  const events: RunEvent[] = [];
  const result = await runNotesProof({ agent, provider: adapter(model), notesDirectory: root, signal: new AbortController().signal, ...extra, onEvent: (event) => { events.push(event); } });
  return { result, events, terminal: events.at(-1) };
}
describe('bounded runner with SDK mock model (not real-provider evidence)', () => {
  it('executes actual granted reads, emits ordered runtime facts and projects terminal state', async () => {
    const model = new MockLanguageModelV4({ doGenerate: [read(), answer()] });
    const { result, events, terminal } = await run(model);
    expect(result.status).toBe('completed'); expect(terminal).toMatchObject({ type: 'run_completed', modelCalls: 2, usage: { inputTokens: null, outputTokens: null } });
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index));
    expect(events.every((event) => event.origin === 'runtime')).toBe(true);
    expect(events.find((event) => event.type === 'note_read')).toMatchObject({ source: { path: 'note.md', bytes: 20 } });
    let view = emptyAgentView('runtime');
    for (const event of events) { const next = agentEventFromRun(event); if (next) view = applyAgentEvent(view, next); }
    expect(view.agents[0]?.status).toBe('completed');
    expect(() => applyAgentEvent(emptyAgentView('demo'), agentEventFromRun(events[0]!)!)).toThrow('Cannot mix');
    expect(model.doGenerateCalls[0]?.tools?.map((tool) => tool.name)).toEqual(['read_note']);
    expect(model.doGenerateCalls[1]?.tools ?? []).toEqual([]);
  });
  it.each([answer(), answer('Invented [fake.md].')])('rejects summaries without actual matching reads %#', async (result) => {
    const { terminal } = await run(new MockLanguageModelV4({ doGenerate: result })); expect(terminal).toMatchObject({ type: 'run_failed', code: 'MISSING_EVIDENCE' });
  });
  it('rejects a missing citation even after a valid read', async () => {
    const { terminal } = await run(new MockLanguageModelV4({ doGenerate: [read(), answer('No citation.')] })); expect(terminal).toMatchObject({ type: 'run_failed', code: 'MISSING_EVIDENCE' });
  });
  it('rejects a provider error finish even when the text cites a read source', async () => {
    const failed = response([{ type: 'text', text: 'A response [note.md].' }], 'error');
    const { terminal } = await run(new MockLanguageModelV4({ doGenerate: [read(), failed] }));
    expect(terminal).toMatchObject({ type: 'run_failed', code: 'INVALID_RESPONSE' });
  });
  it.each([read('{"path":"../secret.md"}'), read('{"path":"note.md","root":"/"}'), read('{}', 'shell')])('fails closed on forbidden tool arguments %#', async (result) => {
    const { terminal, events } = await run(new MockLanguageModelV4({ doGenerate: result })); expect(terminal).toMatchObject({ type: 'run_failed', code: 'PERMISSION_DENIED' });
    expect(events.some((event) => event.type === 'note_read' || event.type === 'run_completed')).toBe(false);
  });
  it('exhausts the model-step budget without recording completion', async () => {
    const model = new MockLanguageModelV4({ doGenerate: read() }); const { terminal } = await run(model, { maxModelCalls: 1 });
    expect(terminal).toMatchObject({ type: 'run_failed', code: 'LIMIT_EXCEEDED' }); expect(model.doGenerateCalls).toHaveLength(1);
  });
  it('rejects provider errors with a safe message', async () => {
    const provider = adapter(new MockLanguageModelV4()); provider.inspect = async () => { throw new ProviderFailure('UNAVAILABLE'); };
    const { terminal } = await run(new MockLanguageModelV4(), { provider }); expect(terminal).toMatchObject({ type: 'run_failed', code: 'UNAVAILABLE' });
  });
  it('records cancellation during a model call without a successful terminal event', async () => {
    const controller = new AbortController();
    const model = new MockLanguageModelV4({ doGenerate: async () => { controller.abort(); throw new Error('interrupted private response'); } });
    const { events, terminal } = await run(model, { signal: controller.signal });
    expect(events.some((event) => event.type === 'provider_call_started')).toBe(true);
    expect(terminal?.type).toBe('run_cancelled');
    expect(events.some((event) => event.type === 'run_completed')).toBe(false);
  });
  it('cancels before provider access and times out an in-flight call', async () => {
    const model = new MockLanguageModelV4(); const cancelled = await run(model, { signal: AbortSignal.abort() });
    expect(cancelled.terminal?.type).toBe('run_cancelled'); expect(model.doGenerateCalls).toHaveLength(0);
    const slow = new MockLanguageModelV4({ doGenerate: ({ abortSignal }) => new Promise((_resolve, reject) => {
      if (abortSignal?.aborted) reject(abortSignal.reason);
      else abortSignal?.addEventListener('abort', () => reject(abortSignal.reason), { once: true });
    }) });
    const timeout = await run(slow, { timeoutMs: 50 }); expect(timeout.terminal).toMatchObject({ type: 'run_failed', code: 'TIMEOUT' });
  });
});
