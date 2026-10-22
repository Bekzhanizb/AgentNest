import { useRef, useState } from 'react';

export function ConfirmDelete({ label, explanation, disabled, action }: { readonly label: string; readonly explanation: string; readonly disabled: boolean; readonly action: () => Promise<boolean> }) {
  const [confirming, setConfirming] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return <div className="library-delete">
    <button ref={button} className="notes-secondary" disabled={disabled} aria-expanded={confirming} onClick={() => setConfirming(true)}>{label}</button>
    {confirming && <div className="library-confirm" role="group" aria-label={`Confirm ${label.toLowerCase()}`}><p>{explanation}</p><div className="notes-actions"><button className="notes-secondary" disabled={disabled} onClick={() => { setConfirming(false); button.current?.focus(); }}>Keep records</button><button className="notes-secondary library-danger" disabled={disabled} onClick={() => { void action().then((ok) => { if (ok) { setConfirming(false); button.current?.focus(); } }); }}>Confirm deletion</button></div></div>}
  </div>;
}
