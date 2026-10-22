import { Worker } from 'node:worker_threads';
import type { LaunchNotesWorker } from './notes-session';

export function notesWorkerLauncher(script: string): LaunchNotesWorker {
  return (approval, model, callbacks) => {
    const worker = new Worker(script, { workerData: { approval, model }, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    let stopped = false;
    worker.on('message', (value: unknown) => { if (!stopped) callbacks.event(value); });
    worker.on('error', () => { if (!stopped) callbacks.exited(); });
    worker.on('exit', () => { if (!stopped) callbacks.exited(); });
    return {
      cancel() { if (!stopped) worker.postMessage('cancel'); },
      stop() { if (stopped) return; stopped = true; void worker.terminate(); },
    };
  };
}
