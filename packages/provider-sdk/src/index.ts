import type { AgentDefinition } from '@agentnest/core';

// Contract only. No provider implementation or execution loop exists yet.
export interface ProviderAdapter {
  readonly id: string;
  readonly capabilities: { readonly toolCalls: boolean };
  generate(request: {
    readonly agent: AgentDefinition;
    readonly input: string;
    readonly signal: AbortSignal;
  }): Promise<{ readonly text: string }>;
}
