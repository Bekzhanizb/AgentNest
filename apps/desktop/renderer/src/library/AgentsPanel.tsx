import { useState } from 'react';
import { isAgentEdit } from '@agentnest/core';
import type { AgentEdit, SavedAgent } from '@agentnest/core';
import type { LibraryControl } from './useLibrary';
import { ConfirmDelete } from './ConfirmDelete';
import './library.css';

export function LibraryNotice({ library }: { readonly library: LibraryControl }) {
  return <>{!library.available && <p className="notes-notice" role="status">Open AgentNest through Electron to use the local library. Browser preview cannot save agents or history.</p>}{library.loading && <p role="status">Opening the local library…</p>}{library.error && <p className="notes-notice notes-error" role="alert">{library.error}</p>}</>;
}
export function AgentsPanel({ library }: { readonly library: LibraryControl }) {
  const [editing, setEditing] = useState<SavedAgent | null>(null);
  const [generation, setGeneration] = useState(0);
  const [message, setMessage] = useState('');
  const locked = !library.available || library.loading || library.pending || !!library.error;
  return <section className="library-page" aria-labelledby="agents-title">
    <div className="notes-heading"><div><p className="eyebrow">REUSABLE INSTRUCTIONS. EXPLICIT PERMISSION.</p><h2 id="agents-title">Agents</h2><p>A small, local library of behavior you define.</p></div><span className="notes-real">SAVED ON THIS DEVICE</span></div>
    <p className="notes-disclosure">These agents summarize approved Markdown notes through local Ollama. Saving an agent does not run it or grant access to files.</p>
    <LibraryNotice library={library} /><p role="status" className="library-save-status">{message}</p>
    <div className="library-toolbar"><p>{library.available && !library.loading && !library.error ? `${library.snapshot.agents.length} / 32 saved agents` : 'Local library'}</p><button className="notes-secondary" disabled={!library.available || library.pending} onClick={() => { void library.refresh(); }}>Reload library</button></div>
    <div className="library-layout">
      <section className="notes-card" aria-labelledby="saved-agents-title"><div className="notes-card-heading"><span className="section-number">01 / LIBRARY</span><h3 id="saved-agents-title">Your agents</h3></div>
        {!library.loading && !library.error && library.available && !library.snapshot.agents.length && <div className="notes-empty"><strong>No saved agents yet.</strong><p>Name an agent, choose an installed model, and write its instructions. Your office stays quiet until you explicitly enter Demo Mode.</p></div>}
        <ul className="library-agents" aria-label="Saved agents">{library.snapshot.agents.map((agent) => <li key={agent.id}><div><h4>{agent.name}</h4><p>Ollama / {agent.model}</p><span>Revision {agent.revision} · Read-only notes</span></div><button className="notes-secondary" disabled={locked} aria-label={`Edit ${agent.name}`} onClick={() => setEditing(agent)}>Edit</button></li>)}</ul>
        <button className="notes-secondary" disabled={locked} onClick={() => { setEditing(null); setGeneration((n) => n + 1); }}>New agent</button>
      </section>
      <AgentEditor key={`${editing?.id ?? 'new'}:${editing?.revision ?? generation}`} agent={editing} library={library} locked={locked} onSaved={() => { setMessage('Library updated. Select an agent in Tasks to run with fresh permission.'); setEditing(null); setGeneration((n) => n + 1); requestAnimationFrame(() => document.getElementById('agent-name')?.focus()); }} />
    </div>
    <p className="notes-future">Instructions and run results are stored in an unencrypted local SQLite file. Do not put credentials in instructions. Folder permissions are never saved. Export and additional tools: Coming soon.</p>
  </section>;
}
function AgentEditor({ agent, library, locked, onSaved }: { readonly agent: SavedAgent | null; readonly library: LibraryControl; readonly locked: boolean; readonly onSaved: () => void }) {
  const [edit, setEdit] = useState<AgentEdit>(() => ({ id: agent?.id ?? null, revision: agent?.revision ?? 0, name: agent?.name ?? '', model: agent?.model ?? '', instructions: agent?.instructions ?? 'Read the approved notes and summarize their purpose, permissions and limits for human review.' }));
  const change = (field: 'name' | 'model' | 'instructions', value: string) => { setEdit((previous) => ({ ...previous, [field]: value })); };
  return <section className="notes-card" aria-labelledby="agent-editor-title"><div className="notes-card-heading"><span className="section-number">02 / DEFINITION</span><h3 id="agent-editor-title">{agent ? 'Edit agent' : 'Create an agent'}</h3></div>
    <form onSubmit={(event) => { event.preventDefault(); if (!locked && isAgentEdit(edit)) void library.save(edit).then((ok) => { if (ok) { onSaved(); } }); }}>
      <div className="notes-field"><label htmlFor="agent-name">Agent name</label><input id="agent-name" value={edit.name} maxLength={80} required disabled={locked} placeholder="For example: Research notes" onChange={(event) => change('name', event.target.value)} /></div>
      <div className="notes-field"><label htmlFor="agent-model">Installed model</label><input id="agent-model" value={edit.model} maxLength={128} required disabled={locked} autoComplete="off" spellCheck={false} placeholder="For example: qwen3:1.7b" aria-describedby="agent-model-help" onChange={(event) => change('model', event.target.value)} /><p id="agent-model-help">Local Ollama only. Install a tool-capable model yourself; saving does not download it.</p></div>
      <div className="notes-field"><label htmlFor="agent-instructions">Instructions</label><textarea id="agent-instructions" value={edit.instructions} rows={7} maxLength={4000} required disabled={locked} aria-describedby="agent-instructions-help" onChange={(event) => change('instructions', event.target.value)} /><p id="agent-instructions-help">{edit.instructions.length} / 4000 characters. The current runner always reads all approved notes and returns three cited bullets: Purpose, Permissions, Limits. Instructions can refine the focus; they cannot add tools or increase limits.</p></div>
      <dl className="notes-limits"><div><dt>Tool</dt><dd>Read notes only</dd></div><div><dt>Time</dt><dd>3 minutes</dd></div><div><dt>Calls</dt><dd>4 model / 4 read</dd></div></dl>
      <button className="notes-primary" disabled={locked || !isAgentEdit(edit)} type="submit">{agent ? 'Save changes' : 'Save agent'}</button>
      <p className="library-save-status" role="status">Save explicitly. No run starts from this screen.</p>
    </form>
    {agent && <ConfirmDelete label="Delete agent" explanation="Delete this definition? Existing run snapshots and results will remain in history until you delete them separately." disabled={locked} action={async () => { const ok = await library.removeAgent({ id: agent.id, revision: agent.revision }); if (ok) onSaved(); return ok; }} />}
  </section>;
}
