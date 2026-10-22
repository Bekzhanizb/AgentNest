import { isLibraryRequest } from '@agentnest/core';
import type { AgentDefinition, AgentEdit, AgentRef, LibraryResult, RunEvent, StartNotesRequest, StoredRun } from '@agentnest/core';
import { StorageError } from '@agentnest/storage';
import type { AgentRepository } from '@agentnest/storage';

export interface RunDefinition { readonly definition: AgentDefinition; readonly revision: number | null }
export const oneOffAgent = (model: string): AgentDefinition => ({ id: 'desktop-notes', name: 'Notes proof', providerId: 'ollama', model, instructions: 'Read the approved notes and summarize their purpose, permissions and limits for human review.' });

/** Application service: no SQL, filesystem permissions, Electron or provider SDK. */
export class LibraryService {
  private failed = false;
  constructor(private readonly repository: AgentRepository | null) {}
  private store(): AgentRepository { if (!this.repository || this.failed) throw new StorageError(); return this.repository; }
  prepare(request: StartNotesRequest): RunDefinition {
    const repo = this.store(); repo.ensureRunCapacity();
    if (!request.agent) return { definition: oneOffAgent(request.model), revision: null };
    const saved = repo.resolveAgent(request.agent);
    if (saved.model !== request.model) throw new StorageError('CONFLICT');
    const { id, name, instructions, providerId, model, revision } = saved;
    return { definition: { id, name, instructions, providerId, model }, revision };
  }
  record(event: RunEvent, agent: RunDefinition): void {
    try { this.store().append(event, agent.definition, agent.revision); }
    catch { this.failed = true; throw new StorageError(); }
  }
  command(operation: 'read' | 'saveAgent' | 'removeAgent' | 'readRun' | 'removeRun' | 'clearHistory', request: unknown, active: boolean): LibraryResult {
    if (!isLibraryRequest(operation, request)) return { ok: false, error: 'INVALID_REQUEST' };
    try {
      const repo = this.store(); let selectedRun: StoredRun | null = null;
      // Validation above establishes the exact, bounded request schema.
      if (operation === 'saveAgent') repo.saveAgent((request as { agent: AgentEdit }).agent);
      if (operation === 'removeAgent') { const { id, revision } = request as AgentRef; repo.removeAgent({ id, revision }); }
      if (operation === 'readRun') selectedRun = repo.readRun((request as { id: string }).id);
      if (operation === 'removeRun' || operation === 'clearHistory') {
        if (active) throw new StorageError('BUSY');
        if (operation === 'removeRun') repo.removeRun((request as { id: string }).id); else repo.clearHistory();
      }
      return { ok: true, value: { agents: repo.listAgents(), runs: repo.listRuns(), selectedRun } };
    } catch (error) {
      const code = error instanceof StorageError ? error.code : 'UNAVAILABLE';
      if (code === 'UNAVAILABLE') this.failed = true;
      return { ok: false, error: code };
    }
  }
  close(): void { this.repository?.close(); }
}
