import { parentPort, workerData } from 'node:worker_threads';
import { runNotesProof } from '@agentnest/runtime';
import type { NotesApproval } from '@agentnest/runtime/notes';
import { OllamaAdapter } from '@agentnest/provider-ollama';
import type { AgentDefinition } from '@agentnest/core';

// Created only by the main process with a native-picker grant, never renderer data.
const input = workerData as { readonly approval: NotesApproval; readonly model: string; readonly agent: AgentDefinition };
const cancel = new AbortController();
parentPort?.on('message', (value: unknown) => { if (value === 'cancel') cancel.abort(); });
void runNotesProof({
  agent: input.agent,
  provider: new OllamaAdapter(), notesDirectory: input.approval.root, approval: input.approval,
  signal: cancel.signal,
  onEvent: (event) => { parentPort?.postMessage(event); },
}).catch(() => { process.exitCode = 1; }).finally(() => { parentPort?.close(); });
