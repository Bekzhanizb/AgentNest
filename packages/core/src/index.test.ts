import { describe, expect, it } from 'vitest';
import { isAppInfoRequest, isAppInfoResult } from './index';

describe('IPC input validation', () => {
  it('accepts only the versioned request with no additional parameters', () => {
    expect(isAppInfoRequest({ apiVersion: 1 })).toBe(true);
    for (const value of [null, [], '1', {}, { apiVersion: '1' }, { apiVersion: 2 }, { apiVersion: 1, path: '/etc/passwd' }]) {
      expect(isAppInfoRequest(value)).toBe(false);
    }
  });

  it('rejects malformed responses at the renderer trust boundary', () => {
    expect(isAppInfoResult({ ok: false, error: 'UNAVAILABLE' })).toBe(true);
    for (const value of [null, { ok: true }, { ok: true, value: {} }, { ok: false, error: 'secret path' }]) {
      expect(isAppInfoResult(value)).toBe(false);
    }
  });
});
