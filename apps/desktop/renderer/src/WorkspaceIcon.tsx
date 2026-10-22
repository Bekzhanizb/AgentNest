import type { Screen } from '@agentnest/core';

/** Original geometric interface icons, without a third-party asset dependency. */
export function WorkspaceIcon({ name }: { readonly name: Screen }) {
  const paths: Record<Screen, string> = {
    Office: 'M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7M6 10h12',
    Agents: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9v-3a6 6 0 0 1 12 0v3H2Zm15-9a3 3 0 1 0-1-6m1 9a5 5 0 0 1 5 5v1h-4',
    Tasks: 'M9 5h12M9 12h12M9 19h12M2 5l2 2 3-4M2 12l2 2 3-4M2 19l2 2 3-4',
    Settings: 'M4 3v5m0 4v9m8-18v11m0 4v3m8-18v3m0 4v11M1 8h6m2 10h6m2-12h6',
  };
  return <svg viewBox="0 0 24 24" className="workspace-icon" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

export function OutwardArrow() {
  return <svg className="outward-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 12 12 4M4 4h8v8" /></svg>;
}
