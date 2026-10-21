import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { DEVELOPMENT_CSP, PRODUCTION_CSP } from './electron/security.ts';

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('./renderer', import.meta.url)),
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL('./dist/renderer', import.meta.url)),
    emptyOutDir: true,
  },
  plugins: [{
    name: 'agentnest-csp',
    transformIndexHtml: (html) => html.replace('__AGENTNEST_CSP__', command === 'serve' ? DEVELOPMENT_CSP : PRODUCTION_CSP),
  }],
}));
