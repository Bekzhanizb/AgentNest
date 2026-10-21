import path from 'node:path';

export const APP_URL = 'agentnest://desktop/';
export const DEV_URL = 'http://127.0.0.1:5173/';
export const APP_INFO_CHANNEL = 'agentnest:app-info';

export const PRODUCTION_CSP = [
  "default-src 'none'", "script-src 'self'", "style-src 'self'",
  "img-src 'self'", "font-src 'self'", "connect-src 'none'",
  "object-src 'none'", "frame-src 'none'", "frame-ancestors 'none'",
  "base-uri 'none'", "form-action 'none'",
].join('; ');

export const DEVELOPMENT_CSP = PRODUCTION_CSP
  .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
  .replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:5173");

export function isTrustedFrame(url: string, expectedUrl: string): boolean {
  // No subframes, query strings, alternate origins, or navigation paths.
  return url === expectedUrl;
}

export function resolveAsset(requestUrl: string, assetRoot: string): string | undefined {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== 'agentnest:' || url.host !== 'desktop' || url.username || url.password) return undefined;
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes('\0') || decoded.includes('\\')) return undefined;
    const file = path.resolve(assetRoot, `.${decoded === '/' ? '/index.html' : decoded}`);
    const relative = path.relative(assetRoot, file);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return undefined;
    return file;
  } catch {
    return undefined;
  }
}
