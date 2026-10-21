import type { AgentDefinition } from '@agentnest/core';

// Persistence boundary only. No database driver, migration, or fake store.
export interface AgentRepository {
  list(): Promise<readonly AgentDefinition[]>;
  save(definition: AgentDefinition): Promise<void>;
}
