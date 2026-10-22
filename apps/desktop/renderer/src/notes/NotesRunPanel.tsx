import { useState } from 'react';
import { isActiveSession, isLocalModelName } from '@agentnest/core';
import type { RunEvent, SessionPhase, SavedAgent } from '@agentnest/core';
import type { useNotesSession } from './useNotesSession';
import './notes.css';

const phaseText: Record<SessionPhase, string> = { empty: 'No run started', ready: 'Ready for your permission', running: 'Running locally', cancelling: 'Cancelling…', completed: 'Completed · review the result', failed: 'Failed · no successful result', cancelled: 'Cancelled · no successful result' };
export function eventText(event: RunEvent): string {
  switch (event.type) {
    case 'run_started': return 'Run started';
    case 'provider_ready': return `Local Ollama ready · ${event.model}`;
    case 'provider_call_started': return `Model call ${event.step} started`;
    case 'provider_call_completed': return `Model call ${event.step} finished · ${event.finishReason}`;
    case 'note_read': return `Read ${event.source.path} · ${event.source.bytes} bytes`;
    case 'run_completed': return 'Summary returned · source paths checked';
    case 'run_failed': return `${event.code}: ${event.message}`;
    case 'run_cancelled': return 'Run cancelled; no successful result recorded';
  }
}
export function NotesRunPanel({ session, agents = [] }: { readonly session: ReturnType<typeof useNotesSession>; readonly agents?: readonly SavedAgent[] }) {
  const { snapshot, available, pending, loading, error } = session;
  const [oneOffModel, setModel] = useState(snapshot.model ?? '');
  const [agentId, setAgentId] = useState('');
  const agent = agents.find((value) => value.id === agentId);
  const model = agentId ? agent?.model ?? '' : oneOffModel;
  const agentKey = agent ? `${agent.id}:${agent.revision}` : agentId;
  const [permission, setPermission] = useState<{ grant: string; model: string; agentKey: string } | null>(null);
  const selected = snapshot.selection;
  const active = isActiveSession(snapshot);
  const allowed = !!selected && !selected.consumed && permission?.grant === selected.id && permission.model === model && permission.agentKey === agentKey;
  const terminal = snapshot.events.at(-1);
  const completed = terminal?.type === 'run_completed' ? terminal : null;
  const provider = snapshot.events.find((event) => event.type === 'provider_ready');
  return <section className="notes-page" aria-labelledby="notes-title">
    <div className="notes-heading"><div><p className="eyebrow">ONE FOLDER. ONE BOUNDED RUN.</p><h2 id="notes-title">Tasks</h2><p>Turn a few notes into something you can review.</p></div><span className="notes-real">REAL LOCAL RUN · EXPERIMENTAL</span></div>
    <p className="notes-disclosure">This calls your local Ollama model. It is separate from the fictional office Demo Mode. Use public notes while this workflow is experimental.</p>
    {!available && !loading && <p className="notes-notice" role="status">Open AgentNest through Electron to choose a folder and start a real run. Browser preview cannot access notes or models.</p>}
    {loading && <p role="status">Loading the notes service…</p>}
    {(error || snapshot.error) && <p className="notes-notice notes-error" role="alert">{error ?? snapshot.error?.message}</p>}
    <div className="notes-layout">
      <section className="notes-card" aria-labelledby="notes-permission-title">
        <div className="notes-card-heading"><span className="section-number">01 / PERMISSION</span><h3 id="notes-permission-title">Choose what it may read.</h3></div>
        <p>Only flat Markdown files in the folder you choose. No writing, shell commands, publishing, or background runs.</p>
        <button className="notes-secondary" disabled={!available || loading || pending || active} onClick={() => { void session.choose(); }}>Choose notes folder</button>
        {selected ? <div className="notes-selection"><h4>{selected.folderName}</h4><ul aria-label="Approved note files">{selected.files.map((file) => <li key={file.path}><span>{file.path}</span><span>{file.bytes} B</span></li>)}</ul><p>{selected.consumed ? 'Permission used for this run. Choose a folder again to start another.' : 'This one-use permission expires after 10 minutes.'}</p></div> : <div className="notes-empty"><strong>No folder selected.</strong><p>Choose 1–4 .md files, up to 8 KiB each and 16 KiB total. Subfolders and links are excluded.</p></div>}
        <div className="notes-field"><label htmlFor="notes-agent">Agent definition</label><select id="notes-agent" value={agentId} disabled={!available || active || pending} onChange={(event) => { setAgentId(event.target.value); setPermission(null); }}><option value="">One-off notes summary</option>{agentId && !agent && <option value={agentId}>Agent unavailable — choose again</option>}{agents.map((value) => <option key={value.id} value={value.id}>{value.name} · revision {value.revision}</option>)}</select>{agent && <details><summary>Review saved instructions</summary><p className="notes-summary" dir="auto">{agent.instructions}</p></details>}<p>Saved agents still require a fresh folder choice and permission for every run.</p></div>
        <div className="notes-field"><label htmlFor="notes-model">Installed Ollama model</label><input id="notes-model" value={model} onChange={(event) => { setModel(event.target.value); setPermission(null); }} placeholder="For example: qwen3:1.7b" autoComplete="off" spellCheck={false} maxLength={128} disabled={!!agentId || active || pending} aria-describedby="notes-model-help" /><p id="notes-model-help">Start a trusted local Ollama service with cloud features disabled and download a tool-capable model first. AgentNest does not install them.</p></div>
        <label className="notes-consent"><input type="checkbox" checked={allowed} disabled={!available || !selected || selected.consumed || active || pending} onChange={(event) => setPermission(event.target.checked && selected ? { grant: selected.id, model, agentKey } : null)} /><span>Allow these listed notes to be read and sent to local Ollama for this run. Save instructions, result and events in unencrypted local history.</span></label>
        <div className="notes-actions"><button className="notes-primary" disabled={!available || pending || active || !allowed || !isLocalModelName(model)} onClick={() => { if (selected) void session.start({ apiVersion: 1, grantId: selected.id, model, consent: true, ...(agent ? { agent: { id: agent.id, revision: agent.revision } } : {}) }); }}>Run notes summary</button><button className="notes-secondary" disabled={!available || !active || pending || snapshot.phase === 'cancelling'} onClick={() => { void session.cancel(); }}>Cancel run</button></div>
        <dl className="notes-limits"><div><dt>Time</dt><dd>3 minutes</dd></div><div><dt>Model calls</dt><dd>Up to 4</dd></div><div><dt>Read calls</dt><dd>Up to 4</dd></div><div><dt>Storage</dt><dd>Local SQLite</dd></div></dl>
      </section>
      <section className="notes-card notes-result-card" aria-labelledby="notes-result-title">
        <div className="notes-card-heading"><span className="section-number">02 / RESULT</span><h3 id="notes-result-title">A result with a trail.</h3></div>
        <p className={`notes-phase notes-phase-${snapshot.phase}`} role="status" aria-label="Notes run status" aria-live="polite">{phaseText[snapshot.phase]}</p>
        {snapshot.model && <p className="notes-model-name">Ollama / {snapshot.model}</p>}
        {terminal?.type === 'run_failed' && <p className="notes-notice notes-error" role="alert">{terminal.code}: {terminal.message}</p>}
        {completed ? <><h4>Generated summary</h4><div className="notes-summary" dir="auto">{completed.summary}</div><p className="notes-review">Check this text against the notes. Valid source paths do not guarantee a correct summary.</p><h4>Sources actually read</h4><ul className="notes-sources" aria-label="Summary sources">{completed.sources.map((source) => <li key={source.path}><strong>{source.path}</strong><details><summary>{source.bytes} bytes · SHA-256</summary><code>{source.sha256}</code></details></li>)}</ul><p className="notes-usage">{completed.modelCalls} model calls · Input tokens: {completed.usage.inputTokens ?? 'unknown'} · Output tokens: {completed.usage.outputTokens ?? 'unknown'}</p></> : !snapshot.events.length && <div className="notes-empty"><span className="notes-paper" aria-hidden="true">≡</span><strong>Your result will appear here.</strong><p>No request starts until you grant permission and select Run. Real runtime events and results are saved locally; Demo Mode is excluded.</p></div>}
        {provider?.type === 'provider_ready' && <details className="notes-provenance"><summary>Model identity</summary><p>Ollama {provider.version} · {provider.model}</p><code>{provider.digest}</code></details>}
        {snapshot.events.length > 0 && <details className="notes-history" open><summary>Runtime event history · {snapshot.events.length}</summary><ol aria-label="Runtime event history">{snapshot.events.map((event) => <li key={event.sequence}><span className="notes-event-time">{(event.elapsedMs / 1000).toFixed(1)}s</span><span>{eventText(event)}</span></li>)}</ol></details>}
        <div className="notes-retention"><p>Closing or reloading cancels active work and revokes folder permission. Clear session removes this view only; saved history remains below until explicitly deleted.</p><button className="notes-secondary" disabled={!available || active || pending || (!selected && !snapshot.events.length)} onClick={() => { void session.clear(); }}>Clear session</button></div>
      </section>
    </div>
    <p className="notes-future">Reviewed export and real events in the pixel office: Coming soon.</p>
  </section>;
}
