import { STATUS_PRESENTATION } from '@agentnest/core';
import type { AgentViewModel } from '@agentnest/core';
import { AgentPortrait } from './AgentPortrait';
import { StatusSymbol } from './StatusSymbol';

export function AgentInspector({ agent, onClose }: { readonly agent: AgentViewModel | undefined; readonly onClose: () => void }) {
  return (
    <aside className="agent-inspector" aria-labelledby="inspector-heading" id="agent-inspector" tabIndex={-1}
      onKeyDown={(event) => { if (event.key === 'Escape' && agent) { event.stopPropagation(); onClose(); } }}>
      <div className="panel-heading">
        <h3 id="inspector-heading">Inspector</h3>
        {agent ? <button aria-label="Close inspector" onClick={onClose}>×</button> : <span className="panel-hint">THE DETAILS</span>}
      </div>
      {!agent ? (
        <div className="inspector-empty">
          <svg className="empty-plant" viewBox="0 0 88 96" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
            <path fill="#e7e9d9" d="M4 86h80v4H4z" />
            <path fill="#d5b798" d="M28 62h32v6H28zm4 6h24v20H32z" />
            <path fill="#b38d6c" d="M48 68h8v20h-8z" />
            <path fill="#547b50" d="M42 26h4v36h-4zm-20 8h20v8H22zm24 10h20v8H46z" />
            <path fill="#91ad78" d="M14 22h20v12H14zm8 12h16v8H22zm28-6h20v16H50zM38 6h12v20H38z" />
            <path fill="#bdd09b" d="M14 22h12v4H14zM38 6h4v16h-4zm20 22h12v4H58z" />
          </svg>
          <p className="quiet-label">EVERY LITTLE DETAIL</p>
          <h4>Get to know the team.</h4>
          <p>Select a character to explore their role, task, and event history.</p>
          <span className="inspector-empty-note">No character selected</span>
        </div>
      ) : (
        <>
          <div className="profile-topline">
            <span className={`profile-avatar shirt-${agent.appearance.shirt}`}><AgentPortrait appearance={agent.appearance} /></span>
            <span className="desk-label">DESK<br /><strong>0{agent.desk + 1}</strong></span>
          </div>
          <p className="demo-small">DEMO CHARACTER · FICTIONAL</p>
          <h4 className="profile-name">{agent.name}</h4>
          <p className="profile-role">{agent.role}</p>
          <div className={`agent-status status-${agent.status}`} role="status" aria-label="Selected character status">
            <StatusSymbol status={agent.status} /> {STATUS_PRESENTATION[agent.status].label}
          </div>
          <dl className="inspector-details">
            <div><dt>Role</dt><dd>{agent.role}</dd></div>
            <div><dt>Assigned desk</dt><dd>Desk 0{agent.desk + 1}</dd></div>
            <div className="task-detail"><dt>Demo task</dt><dd>{agent.task ?? 'No demo task assigned'}</dd></div>
            <div><dt>Appearance</dt><dd>{agent.appearance.shirt} shirt · {agent.appearance.hair}</dd></div>
          </dl>
          <section className="agent-history" aria-labelledby="history-heading">
            <h4 id="history-heading">Demo event history <span className="count-badge" aria-hidden="true">{agent.history.length.toString().padStart(2, '0')}</span></h4>
            <ol tabIndex={0} aria-label="Demo event history entries">
              {[...agent.history].reverse().map((entry) => (
                <li key={entry.sequence}>
                  <time>Demo +{String(entry.second).padStart(2, '0')}s</time>
                  <strong><StatusSymbol status={entry.status} /> {STATUS_PRESENTATION[entry.status].label}</strong>
                  <p>{entry.message}</p>
                </li>
              ))}
            </ol>
          </section>
          <p className="inspector-disclaimer">Scripted example data. No provider is connected and no task is executed.</p>
        </>
      )}
    </aside>
  );
}
