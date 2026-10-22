import type { LanguageModelV4, SharedV4ProviderOptions } from '@ai-sdk/provider';
export type LanguageModel = LanguageModelV4;
export type ProviderOptions = SharedV4ProviderOptions;

export interface ProviderModelInfo {
  readonly provider: string;
  readonly version: string;
  readonly model: string;
  readonly digest: string;
  readonly toolCalls: boolean;
}

/** Backend-only bridge to the pinned model/tool protocol; never imported by UI/core. */
export interface ProviderAdapter {
  readonly id: string;
  readonly options: ProviderOptions;
  inspect(model: string, signal: AbortSignal): Promise<ProviderModelInfo>;
  model(model: string): LanguageModel;
}

export const PROVIDER_FAILURES = {
  INVALID_ENDPOINT: 'Only a plain loopback Ollama endpoint is allowed.',
  INVALID_MODEL: 'Choose an explicitly named local model, without cloud routing.',
  MODEL_UNAVAILABLE: 'The selected model is not installed locally.',
  TOOL_CALLS_UNSUPPORTED: 'The selected model does not declare tool calling support.',
  INVALID_RESPONSE: 'The local provider returned an unsupported response.',
  REQUEST_LIMIT: 'The provider request exceeded the size limit.',
  RESPONSE_LIMIT: 'The provider response exceeded the size limit.',
  UNAVAILABLE: 'The local Ollama service is unavailable.',
  TIMEOUT: 'The provider request timed out.',
  CANCELLED: 'The provider request was cancelled.',
} as const;
export type ProviderFailureCode = keyof typeof PROVIDER_FAILURES;

/** Safe to show: provider response bodies, prompts, and credentials are excluded. */
export class ProviderFailure extends Error {
  constructor(readonly code: ProviderFailureCode) { super(PROVIDER_FAILURES[code]); this.name = 'ProviderFailure'; }
}
