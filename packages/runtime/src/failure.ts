export const RUN_FAILURES = {
  INVALID_INPUT: 'The proof configuration is invalid.',
  NOTES_UNAVAILABLE: 'The selected notes directory is unavailable.',
  PERMISSION_DENIED: 'The requested note or tool is outside the read-only grant.',
  INPUT_CHANGED: 'A note or its approved directory changed during reading.',
  LIMIT_EXCEEDED: 'The bounded run exhausted its step, tool, or input budget.',
  INVALID_TEXT: 'Notes must contain valid UTF-8 text.',
  MISSING_EVIDENCE: 'The model did not return a summary citing notes actually read.',
  INVALID_RESPONSE: 'The local provider returned an unsupported result.',
  TIMEOUT: 'The bounded run timed out.',
} as const;
export type RunFailureCode = keyof typeof RUN_FAILURES;
export class RunFailure extends Error {
  constructor(readonly code: RunFailureCode) { super(RUN_FAILURES[code]); this.name = 'RunFailure'; }
}
