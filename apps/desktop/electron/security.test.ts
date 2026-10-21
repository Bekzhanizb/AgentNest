import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_URL, DEV_URL, PRODUCTION_CSP, isTrustedFrame, resolveAsset } from './security';

describe('desktop security boundaries', () => {
  const root = path.resolve('test-assets');
  it('serves only local assets within the asset root', () => {
    expect(resolveAsset(APP_URL, root)).toBe(path.join(root, 'index.html'));
    expect(resolveAsset(`${APP_URL}assets/app.js`, root)).toBe(path.join(root, 'assets/app.js'));
    for (const url of ['https://example.com/', 'agentnest://other/', 'agentnest://desktop/%2e%2e%2fsecret', 'agentnest://desktop/%5csecret', 'agentnest://desktop/%00', 'agentnest://desktop/%invalid']) {
      expect(resolveAsset(url, root)).toBeUndefined();
    }
  });
  it('rejects alternate origins and paths for IPC', () => {
    expect(isTrustedFrame(APP_URL, APP_URL)).toBe(true);
    expect(isTrustedFrame(DEV_URL, DEV_URL)).toBe(true);
    for (const url of [DEV_URL, `${APP_URL}?remote=true`, `${APP_URL}frame`, 'agentnest://desktop.evil/']) {
      expect(isTrustedFrame(url, APP_URL)).toBe(false);
    }
  });
  it('keeps production scripts, styles, and network access restricted', () => {
    expect(PRODUCTION_CSP).toContain("connect-src 'none'");
    expect(PRODUCTION_CSP).not.toMatch(/unsafe-inline|unsafe-eval/);
  });
});
