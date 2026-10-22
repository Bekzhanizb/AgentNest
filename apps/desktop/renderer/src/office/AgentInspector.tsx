import { STATUS_PRESENTATION } from '@agentnest/core';
import type { AgentViewModel } from '@agentnest/core';

export function AgentInspector({ agent, onClose }: { readonly agent: AgentViewModel | undefined; readonly onClose: () => void }) {
  return <aside className="agent-inspector" aria-labelledby="inspector-heading" id="agent-inspector">
    <div className="panel-heading"><h3 id="inspector-heading">Inspector</h3>{agent && <button aria-label="Close inspector" onClick={onClose}>×</button>}</div>
    {!agent ? <div className="inspector-empty"><span className="empty-cross" aria-hidden="true">⌖</span><h4>A little more context.</h4><p>Select a character to inspect their role, task, and event history.</p><span className="quiet-label">No character selected</span></div> : <>
      <div className={`profile-avatar shirt-${agent.appearance.shirt}`} aria-hidden="true">{agent.name.slice(0, 1)}</div>
      <p className="demo-small">DEMO CHARACTER · FICTIONAL</p><h4 className="profile-name">{agent.name}</h4><p className="profile-role">{agent.role}</p>
      <div className={`agent-status status-${agent.status}`} role="status" aria-label="Selected character status"><span aria-hidden="true">{STATUS_PRESENTATION[agent.status].symbol}</span> {STATUS_PRESENTATION[agent.status].label}</div>
      <dl className="inspector-details"><div><dt>Role</dt><dd>{agent.role}</dd></div><div><dt>Assigned desk</dt><dd>Desk 0{agent.desk + 1}</dd></div><div><dt>Demo task</dt><dd>{agent.task ?? 'No demo task assigned'}</dd></div><div><dt>Appearance</dt><dd>{agent.appearance.shirt} shirt · {agent.appearance.hair}</dd></div></dl>
      <section className="agent-history" aria-labelledby="history-heading"><h4 id="history-heading">Demo event history</h4><ol tabIndex={0} aria-label="Demo event history entries">{[...agent.history].reverse().map((entry) => <li key={entry.sequence}><time>Demo +{String(entry.second).padStart(2, '0')}s</time><strong><span aria-hidden="true">{STATUS_PRESENTATION[entry.status].symbol}</span> {STATUS_PRESENTATION[entry.status].label}</strong><p>{entry.message}</p></li>)}</ol></section>
      <p className="inspector-disclaimer">Scripted example data. No provider is connected and no task is executed.</p>
    </>}
  </aside>;
}
