import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'esbuild';
import { build as buildRenderer, createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const desktop = path.join(root, 'apps/desktop');
const configFile = path.join(desktop, 'vite.config.ts');

async function buildShell() {
  await bundle({
    entryPoints: {
      main: path.join(desktop, 'electron/main.ts'),
      preload: path.join(desktop, 'electron/preload.ts'),
    },
    outdir: path.join(desktop, 'dist/electron'),
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    external: ['electron'],
    sourcemap: true,
  });
}

async function launch(development = false, server) {
  const { default: electron } = await import('electron');
  // Do not inherit Electron's Node-only mode from an editor or tooling host.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, [desktop, ...(development ? ['--development'] : [])], {
    cwd: root, env, stdio: 'inherit', shell: false,
  });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    if (!child.killed) child.kill();
    void server?.close();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      process.exitCode = code ?? (stopping ? 0 : 1);
      if (signal && !stopping) console.error(`Electron exited unexpectedly (${signal}).`);
      resolve();
    });
  });
  await server?.close();
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}

try {
  const command = process.argv[2];
  if (command === 'build') {
    await rm(path.join(desktop, 'dist'), { recursive: true, force: true });
    await buildShell();
    await buildRenderer({ configFile });
  } else if (command === 'dev') {
    await buildShell();
    const server = await createServer({ configFile });
    try {
      await server.listen();
      server.printUrls();
      await launch(true, server);
    } finally {
      await server.close();
    }
  } else if (command === 'start') {
    await launch(false);
  } else {
    throw new Error('Usage: node scripts/desktop.mjs build|dev|start');
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
