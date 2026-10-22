import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyLibrary, isLibraryResult, LIBRARY_ERRORS } from '@agentnest/core';
import type { AgentEdit, AgentRef, LibraryResult } from '@agentnest/core';

export function useLibrary() {
  const [snapshot, setSnapshot] = useState(emptyLibrary);
  const [available] = useState(() => !!window.agentnest?.library);
  const [loading, setLoading] = useState(available);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(false);
  const requestNumber = useRef(0);
  const commanding = useRef(false);
  const apply = useCallback((value: unknown): boolean => {
    if (!isLibraryResult(value)) { setError('Local storage returned invalid data. Restart AgentNest.'); return false; }
    if (!value.ok) { setError(LIBRARY_ERRORS[value.error]); return false; }
    setSnapshot(value.value); setError(null); return true;
  }, []);
  const refresh = useCallback(() => {
    const service = window.agentnest?.library; if (!service || commanding.current) return Promise.resolve();
    const number = ++requestNumber.current;
    return service.read().then((result: unknown) => {
      if (alive.current && number === requestNumber.current) apply(result);
    }).catch(() => {
      if (alive.current && number === requestNumber.current) setError(LIBRARY_ERRORS.UNAVAILABLE);
    }).finally(() => {
      if (alive.current && number === requestNumber.current) setLoading(false);
    });
  }, [apply]);
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; }; }, [refresh]);
  async function command(action: () => Promise<LibraryResult>) {
    if (commanding.current) return false;
    commanding.current = true;
    const number = ++requestNumber.current; setPending(true); setError(null);
    try { const result: unknown = await action(); return alive.current && number === requestNumber.current ? apply(result) : false; }
    catch { if (alive.current && number === requestNumber.current) setError(LIBRARY_ERRORS.UNAVAILABLE); return false; }
    finally { commanding.current = false; if (alive.current) setPending(false); }
  }
  return { snapshot, available, loading, pending, error, refresh,
    save: (agent: AgentEdit) => command(() => window.agentnest!.library.saveAgent({ apiVersion: 1, agent })),
    removeAgent: (ref: AgentRef) => command(() => window.agentnest!.library.removeAgent({ apiVersion: 1, ...ref })),
    readRun: (id: string) => command(() => window.agentnest!.library.readRun({ apiVersion: 1, id })),
    removeRun: (id: string) => command(() => window.agentnest!.library.removeRun({ apiVersion: 1, id })),
    clearHistory: () => command(() => window.agentnest!.library.clearHistory()),
  };
}
export type LibraryControl = ReturnType<typeof useLibrary>;
