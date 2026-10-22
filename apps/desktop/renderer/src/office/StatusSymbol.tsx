import { STATUS_PRESENTATION } from '@agentnest/core';
import type { AgentStatus } from '@agentnest/core';

const paths: Record<AgentStatus, string> = {
  idle: 'M10 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  working: 'm4 2 6 4-6 4V2',
  awaiting_approval: 'M4 2v8m4-8v8',
  completed: 'm2 6 3 3 5-6',
  failed: 'M6 1v6m0 3v1',
};

/** Font-independent, original status shapes; readable status text stays adjacent. */
export function StatusSymbol({ status }: { readonly status: AgentStatus }) {
  return (
    <span className="status-symbol" aria-hidden="true">
      <span className="sr-only">{STATUS_PRESENTATION[status].symbol}</span>
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d={paths[status]} />
      </svg>
    </span>
  );
}
