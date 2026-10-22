import { parseArgs } from 'node:util';
import { once } from 'node:events';
import { agentEventFromRun, applyAgentEvent, emptyAgentView } from '@agentnest/core';
import { OllamaAdapter } from '@agentnest/provider-ollama';
import { ProviderFailure } from '@agentnest/provider-sdk';
import { runNotesProof, RunFailure } from '@agentnest/runtime';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    model: { type: 'string' }, notes: { type: 'string' }, endpoint: { type: 'string' },
    'timeout-ms': { type: 'string' }, 'max-steps': { type: 'string' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    process.stdout.write('Usage: npm run --silent proof:ollama -- --model <installed-local-model> --notes <approved-directory> [--endpoint http://127.0.0.1:11434/] [--timeout-ms 180000] [--max-steps 4]\n');
    return;
  }
  if (!values.model || !values.notes) throw new RunFailure('INVALID_INPUT');
  const cancel = new AbortController();
  const interrupt = () => cancel.abort();
  const parentMessage = (message: unknown) => { if (message === 'agentnest-proof:cancel') interrupt(); };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  process.on('message', parentMessage);
  process.stdout.on('error', interrupt);
  let view = emptyAgentView('runtime');
  try {
    const result = await runNotesProof({
      agent: { id: 'notes-proof', name: 'Read-only notes proof', providerId: 'ollama', model: values.model, instructions: 'Read the approved notes and summarize their purpose, permissions and limits for human review.' },
      provider: new OllamaAdapter(values.endpoint), notesDirectory: values.notes, signal: cancel.signal,
      ...(values['timeout-ms'] ? { timeoutMs: Number(values['timeout-ms']) } : {}),
      ...(values['max-steps'] ? { maxModelCalls: Number(values['max-steps']) } : {}),
      onEvent: async (event) => {
        const projected = agentEventFromRun(event);
        if (projected) view = applyAgentEvent(view, projected);
        if (!process.stdout.write(`${JSON.stringify({ event, view })}\n`)) await once(process.stdout, 'drain');
      },
    });
    process.exitCode = result.status === 'completed' ? 0 : result.status === 'cancelled' ? 130 : 1;
  } finally {
    process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt); process.stdout.off('error', interrupt);
    process.off('message', parentMessage);
    if (process.connected) process.disconnect();
  }
}
void main().catch((error: unknown) => {
  const known = error instanceof RunFailure || error instanceof ProviderFailure;
  process.stderr.write(`${JSON.stringify({ error: { code: known ? error.code : 'INVALID_INPUT', message: known ? error.message : 'Invalid proof arguments. Use --help for the required options.' } })}\n`);
  process.exitCode = 2;
});
