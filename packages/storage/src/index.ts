import type { AgentDefinition, AgentEdit, AgentRef, SavedAgent, RunEvent, RunSummary, StoredRun, LibraryErrorCode } from '@agentnest/core';

/** Backend-only persistence contract. No filesystem permissions or provider objects. */
export interface AgentRepository {
  listAgents(): readonly SavedAgent[];
  saveAgent(edit: AgentEdit): SavedAgent;
  removeAgent(ref: AgentRef): void;
  resolveAgent(ref: AgentRef): SavedAgent;
  listRuns(): readonly RunSummary[];
  readRun(id: string): StoredRun;
  append(event: RunEvent, definition: AgentDefinition, revision: number | null): void;
  ensureRunCapacity(): void;
  removeRun(id: string): void;
  clearHistory(): void;
  close(): void;
}
export class StorageError extends Error {
  constructor(readonly code: LibraryErrorCode = 'UNAVAILABLE') { super(code); }
}
