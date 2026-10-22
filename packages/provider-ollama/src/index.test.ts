import { afterEach, describe, expect, it, vi } from 'vitest';
import { OllamaAdapter, loopbackEndpoint } from './index';

const signal = new AbortController().signal;
afterEach(() => { vi.unstubAllGlobals(); });
function api(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: URL | string, init?: RequestInit) => {
    const endpoint = new URL(input).pathname;
    expect(init?.redirect).toBe('error');
    const routes: Record<string, unknown> = {
      '/api/version': { version: '0.40.8' },
      '/api/tags': { models: [{ name: 'qwen3:1.7b', digest: 'a'.repeat(64) }] },
      '/api/show': { details: { format: 'gguf' }, capabilities: ['completion', 'tools'] },
      ...overrides,
    };
    return Response.json(routes[endpoint]);
  });
}
describe('Ollama adapter contract (mock HTTP, no real inference)', () => {
  it.each(['https://127.0.0.1', 'http://localhost:11434', 'http://example.com', 'http://127.0.0.1@evil.test', 'http://u:p@127.0.0.1', 'http://127.0.0.1/api', 'http://127.0.0.1/?key=x', 'file:///etc/passwd'])('rejects endpoint %s', (endpoint) => {
    expect(() => loopbackEndpoint(endpoint)).toThrow();
  });
  it('accepts literal IPv4/IPv6 loopback and inspects installed local tool capability', async () => {
    expect(loopbackEndpoint('http://[::1]:11434/').hostname).toBe('[::1]');
    const fetch = api(); vi.stubGlobal('fetch', fetch);
    expect(await new OllamaAdapter().inspect('qwen3:1.7b', signal)).toEqual({ provider: 'ollama', version: '0.40.8', model: 'qwen3:1.7b', digest: 'a'.repeat(64), toolCalls: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it.each(['qwen3:cloud', '../model', 'remote/model', 'model?x=1'])('rejects model routing %s before HTTP', async (model) => {
    const fetch = api(); vi.stubGlobal('fetch', fetch);
    await expect(new OllamaAdapter().inspect(model, signal)).rejects.toMatchObject({ code: 'INVALID_MODEL' }); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [{ '/api/show': { details: { format: 'gguf' }, capabilities: ['completion'] } }, 'TOOL_CALLS_UNSUPPORTED'],
    [{ '/api/show': { details: { format: 'gguf' }, capabilities: ['tools'], remote_host: 'https://cloud.test' } }, 'INVALID_MODEL'],
    [{ '/api/tags': { models: [] } }, 'MODEL_UNAVAILABLE'],
    [{ '/api/version': { version: '<private response>' } }, 'INVALID_RESPONSE'],
  ] as const)('rejects unsupported metadata %#', async (overrides, code) => {
    vi.stubGlobal('fetch', api(overrides)); await expect(new OllamaAdapter().inspect('qwen3:1.7b', signal)).rejects.toMatchObject({ code });
  });
  it('caps response bytes and hides network/server response details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private'.repeat(50000))));
    await expect(new OllamaAdapter().inspect('qwen3:1.7b', signal)).rejects.toMatchObject({ code: 'RESPONSE_LIMIT' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private', { status: 404 })));
    await expect(new OllamaAdapter().inspect('qwen3:1.7b', signal)).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE', message: 'The selected model is not installed locally.' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('private URL/key'); }));
    await expect(new OllamaAdapter().inspect('qwen3:1.7b', signal)).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'The local Ollama service is unavailable.' });
  });
});
