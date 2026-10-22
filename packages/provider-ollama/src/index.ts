import { createOllama } from 'ollama-ai-provider-v2';
import { ProviderFailure } from '@agentnest/provider-sdk';
import type { ProviderAdapter, ProviderModelInfo, ProviderOptions } from '@agentnest/provider-sdk';

const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function loopbackEndpoint(input: string): URL {
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return url;
  } catch { throw new ProviderFailure('INVALID_ENDPOINT'); }
}
function localModel(model: string): void {
  if (model.length > 128 || !/^[a-z0-9][a-z0-9._-]*(?::[a-zA-Z0-9._-]+)?$/.test(model)
    || model.toLowerCase().includes('cloud')) throw new ProviderFailure('INVALID_MODEL');
}

export class OllamaAdapter implements ProviderAdapter {
  readonly id = 'ollama';
  readonly options: ProviderOptions = { ollama: { think: false, options: { num_ctx: 4096, num_predict: 512, temperature: 0, seed: 42 } } };
  private readonly endpoint: URL;
  private readonly client;

  constructor(endpoint = 'http://127.0.0.1:11434/') {
    this.endpoint = loopbackEndpoint(endpoint);
    this.client = createOllama({ baseURL: new URL('api', this.endpoint).href, fetch: (input, init) => this.request(input, init) });
  }
  model(model: string): ReturnType<ProviderAdapter['model']> { localModel(model); return this.client(model); }

  /** No redirects, credentials, cloud endpoints, unbounded bodies, or hidden retries. */
  private async request(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.origin !== this.endpoint.origin || !['/api/chat', '/api/show', '/api/tags', '/api/version'].includes(url.pathname)
      || url.username || url.password || url.search || url.hash) throw new ProviderFailure('INVALID_ENDPOINT');
    const body = init?.body;
    if (body !== undefined && body !== null && (typeof body !== 'string' || new TextEncoder().encode(body).length > MAX_REQUEST_BYTES)) throw new ProviderFailure('REQUEST_LIMIT');
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([timeout, init.signal]) : timeout;
    try {
      const response = await fetch(url, { ...init, redirect: 'error', signal });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderFailure(response.status === 404 ? 'MODEL_UNAVAILABLE' : 'UNAVAILABLE');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new ProviderFailure('INVALID_RESPONSE');
      const chunks: Uint8Array[] = []; let bytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new ProviderFailure('RESPONSE_LIMIT'); }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
      const buffer = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
      const headers = new Headers(response.headers); headers.delete('content-length'); headers.delete('content-encoding');
      return new Response(buffer, { status: response.status, headers });
    } catch (error) {
      if (error instanceof ProviderFailure) throw error;
      if (signal.aborted) throw new ProviderFailure(timeout.aborted ? 'TIMEOUT' : 'CANCELLED');
      throw new ProviderFailure('UNAVAILABLE');
    }
  }

  async inspect(model: string, signal: AbortSignal): Promise<ProviderModelInfo> {
    localModel(model);
    const [versionResponse, tagsResponse, showResponse] = await Promise.all([
      this.request(new URL('api/version', this.endpoint), { signal }),
      this.request(new URL('api/tags', this.endpoint), { signal }),
      this.request(new URL('api/show', this.endpoint), { method: 'POST', body: JSON.stringify({ model }), headers: { 'Content-Type': 'application/json' }, signal }),
    ]);
    let version: unknown; let tags: unknown; let show: unknown;
    try { [version, tags, show] = await Promise.all([versionResponse.json(), tagsResponse.json(), showResponse.json()]); }
    catch { throw new ProviderFailure('INVALID_RESPONSE'); }
    if (!record(version) || typeof version['version'] !== 'string' || !/^\d+\.\d+\.\d+[a-zA-Z0-9.+-]*$/.test(version['version'])
      || version['version'].length > 60 || !record(tags) || !Array.isArray(tags['models']) || !record(show)) throw new ProviderFailure('INVALID_RESPONSE');
    const canonical = model.includes(':') ? model : `${model}:latest`;
    const selected: unknown = tags['models'].find((value: unknown) => record(value) && value['name'] === canonical);
    if (!record(selected) || typeof selected['digest'] !== 'string' || !/^[a-f0-9]{64}$/.test(selected['digest'])) throw new ProviderFailure('MODEL_UNAVAILABLE');
    if (show['remote_model'] || show['remote_host'] || !record(show['details']) || show['details']['format'] !== 'gguf') throw new ProviderFailure('INVALID_MODEL');
    if (!Array.isArray(show['capabilities']) || !show['capabilities'].includes('tools')) throw new ProviderFailure('TOOL_CALLS_UNSUPPORTED');
    return { provider: this.id, model: canonical, version: version['version'], digest: selected['digest'], toolCalls: true };
  }
}
