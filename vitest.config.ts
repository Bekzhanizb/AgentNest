import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxWorkers: 2,
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['packages/**/*.test.ts', 'apps/desktop/electron/**/*.test.ts'] } },
      { test: { name: 'renderer', environment: 'jsdom', include: ['apps/desktop/renderer/**/*.test.tsx'] } },
    ],
  },
});
