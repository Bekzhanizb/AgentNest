import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const outfile = path.join(root, 'apps/proof/dist/cli.cjs');
await build({ entryPoints: [path.join(root, 'apps/proof/src/cli.ts')], outfile, platform: 'node', target: 'node24', format: 'cjs', bundle: true, logLevel: 'silent' });
const child = spawn(process.execPath, [outfile, ...process.argv.slice(2)], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'], cwd: root, shell: false });
let fallback;
const interrupt = () => {
  // Windows kill(SIGINT) terminates immediately; use one fixed cancellation message.
  if (child.connected) child.send('agentnest-proof:cancel', () => {});
  fallback ??= setTimeout(() => child.kill(), 5000);
  fallback.unref();
};
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
child.once('error', () => { process.stderr.write('Unable to launch the notes proof.\n'); process.exitCode = 1; });
child.once('exit', (code, signal) => {
  process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  clearTimeout(fallback);
  process.exitCode = code ?? (signal ? 130 : 1);
});
