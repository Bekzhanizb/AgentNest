import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyNotesSession, isNotesSession, isNotesResult } from '@agentnest/core';
import type { NotesBridge, NotesSession, StartNotesRequest } from '@agentnest/core';

export function useNotesSession() {
  const [snapshot, setSnapshot] = useState<NotesSession>(emptyNotesSession);
  const [available] = useState(() => !!window.agentnest?.notes);
  const [loading, setLoading] = useState(available);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bridge = useRef<NotesBridge | undefined>(undefined);
  const alive = useRef(false);
  const accept = useCallback((value: unknown) => {
    if (!alive.current) return;
    if (!isNotesSession(value)) { setError('The notes service sent invalid data. Cancel the run or restart AgentNest.'); return; }
    setSnapshot((previous) => value.revision >= previous.revision ? value : previous);
  }, []);
  useEffect(() => {
    let current = true;
    alive.current = true;
    const service = window.agentnest?.notes;
    if (!service) return () => { alive.current = false; };
    bridge.current = service;
    const unsubscribe = service.subscribe((value) => { if (current) accept(value); });
    void service.read().then((result: unknown) => {
      if (!current) return;
      if (!isNotesResult(result) || !result.ok) setError('The notes service is unavailable. Restart AgentNest.');
      else accept(result.snapshot);
    }).catch(() => { if (current) setError('The notes service is unavailable. Restart AgentNest.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; alive.current = false; unsubscribe(); };
  }, [accept]);
  async function command(operation: 'choose' | 'start' | 'cancel' | 'clear', request?: StartNotesRequest) {
    const service = bridge.current;
    if (!service) return;
    setPending(true); setError(null);
    try {
      const value: unknown = operation === 'start' && request ? await service.start(request) : operation === 'start' ? null : await service[operation]();
      if (!alive.current) return;
      if (!isNotesResult(value)) setError('The notes service returned an invalid response.');
      else if (!value.ok) setError(value.error.message);
      else accept(value.snapshot);
    } catch { if (alive.current) setError('The notes service could not complete this request.'); }
    finally { if (alive.current) setPending(false); }
  }
  return { snapshot, available, loading, pending, error,
    choose: () => command('choose'), start: (request: StartNotesRequest) => command('start', request),
    cancel: () => command('cancel'), clear: () => command('clear'),
  };
}
