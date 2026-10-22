import { describe, expect, it } from 'vitest';
import { emptyLibrary, isAgentEdit, isLibraryRequest, isLibraryResult, isStartNotesRequest } from './index';
const id = '12345678-1234-4234-8234-123456789abc';
const agent = { id: null, revision: 0, name: 'Research', instructions: 'Summarize the approved notes.', model: 'qwen3:1.7b' };
describe('library transport decoding', () => {
  it('rejects extra fields, invalid models, unbounded instructions and malformed revisions', () => {
    expect(isAgentEdit(agent)).toBe(true);
    for (const changed of [{ instructions: 'x'.repeat(4001) }, { name: ' ' }, { revision: 1 }, { model: 'https://remote/model' }, { providerId: 'remote' }, { instructions: '\u0000' }]) expect(isAgentEdit({ ...agent, ...changed })).toBe(false);
    expect(isLibraryRequest('read', { apiVersion: 1, path: '/tmp/private' })).toBe(false);
    expect(isLibraryRequest('saveAgent', { apiVersion: 1, agent })).toBe(true);
    expect(isLibraryResult({ ok: true, value: emptyLibrary() })).toBe(true);
    expect(isLibraryResult({ ok: true, value: { ...emptyLibrary(), selectedRun: { status: 'completed', events: [] } } })).toBe(false);
  });
  it('allows only a saved identity/revision beside a one-use grant, never instructions or file paths', () => {
    const request = { apiVersion: 1, grantId: id, model: 'qwen3:1.7b', consent: true, agent: { id, revision: 1 } };
    expect(isStartNotesRequest(request)).toBe(true);
    expect(isStartNotesRequest({ ...request, agent: { id, revision: 0 } })).toBe(false);
    expect(isStartNotesRequest({ ...request, agent: { id, revision: 1, instructions: 'Overwrite' } })).toBe(false);
    expect(isStartNotesRequest({ ...request, folder: '/tmp' })).toBe(false);
  });
});
