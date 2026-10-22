import type { LibraryControl } from './useLibrary';
import { LibraryNotice } from './AgentsPanel';
import { ConfirmDelete } from './ConfirmDelete';
import { eventText } from '../notes/NotesRunPanel';
import './library.css';

export function RunHistory({ library, active }: { readonly library: LibraryControl; readonly active: boolean }) {
  const run = library.snapshot.selectedRun;
  const completed = run?.events.at(-1);
  const locked = !library.available || library.pending || library.loading || !!library.error;
  return <section className="library-page library-history" aria-labelledby="run-history-title">
    <div className="notes-heading"><div><p className="eyebrow">A RECORD, NEVER A REPLAY.</p><h2 id="run-history-title">Saved run history</h2><p>Real runtime events, kept on this device.</p></div><button className="notes-secondary" disabled={!library.available || library.pending} onClick={() => { void library.refresh(); }}>Reload history</button></div>
    <LibraryNotice library={library} />
    <p className="notes-disclosure">Up to 100 runs, retained until you delete them. Instructions, generated text, source filenames and hashes may contain sensitive information. Storage is unencrypted. Demo Mode never writes here.</p>
    {!library.loading && !library.error && library.available && !library.snapshot.runs.length && <div className="notes-empty"><strong>No saved runs yet.</strong><p>A record is created when a real runtime starts. Reading history never starts a model or restores folder permission.</p></div>}
    <div className="library-layout">
      <div><ul className="library-runs" aria-label="Saved runs">{library.snapshot.runs.map((item) => <li key={item.id}><button className="library-run-button" aria-pressed={run?.id === item.id} disabled={locked} onClick={() => { void library.readRun(item.id); }}><strong>{item.name}</strong><span className={`library-status library-status-${item.status}`}>{item.status === 'interrupted' ? 'Interrupted · no successful result' : item.status}</span><span>{item.model} · {new Date(item.startedAt).toLocaleString()}</span></button></li>)}</ul>
        {!!library.snapshot.runs.length && <ConfirmDelete label="Delete all history" explanation="Permanently delete all saved run records, including instruction snapshots and generated summaries? Saved agent definitions will remain. Backups may still contain deleted records." disabled={locked || active} action={library.clearHistory} />}
      </div>
      {run && <article className="notes-card" aria-labelledby="saved-run-title"><span className="section-number">SAVED RUN · READ-ONLY</span><h3 id="saved-run-title">{run.name}</h3><p className="library-status">{run.status}</p><p>{run.model} · {run.definitionRevision === null ? 'One-off definition' : `Agent revision ${run.definitionRevision}`}</p>
        {run.status === 'interrupted' && <p className="notes-notice">AgentNest stopped before a terminal event was saved. This record has no successful result. It will not resume automatically.</p>}
        <details><summary>Instructions used for this run</summary><p className="notes-summary" dir="auto">{run.definition.instructions}</p></details>
        {completed?.type === 'run_completed' && <><h4>Saved generated summary</h4><div className="notes-summary" dir="auto">{completed.summary}</div><p className="notes-review">Review against the original notes. Saved hashes identify the bytes read then; current files have not been reopened or checked.</p><ul className="notes-sources" aria-label="Saved summary sources">{completed.sources.map((source) => <li key={source.path}><strong>{source.path}</strong><span>{source.bytes} bytes</span><code>{source.sha256}</code></li>)}</ul></>}
        <ol className="library-event-list" aria-label="Saved runtime events">{run.events.map((event) => <li key={event.sequence}><span>{(event.elapsedMs / 1000).toFixed(1)}s</span> {eventText(event)}</li>)}</ol>
        <ConfirmDelete label="Delete this run" explanation="Permanently delete this run, its instruction snapshot, events and result? Saved agent definitions will remain." disabled={locked || active} action={() => library.removeRun(run.id)} />
      </article>}
    </div>
  </section>;
}
