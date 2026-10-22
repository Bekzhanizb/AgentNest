import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { AppInfo, Screen } from '@agentnest/core';
import { readAppInfo } from './bridge';
import { OfficeWorkspace } from './office/OfficeWorkspace';
import { WorkspaceIcon } from './WorkspaceIcon';
import { useNotesSession } from './notes/useNotesSession';
import { NotesRunPanel } from './notes/NotesRunPanel';
import { isActiveSession } from '@agentnest/core';
import { useLibrary } from './library/useLibrary';
import { AgentsPanel } from './library/AgentsPanel';
import { RunHistory } from './library/RunHistory';

const screens: readonly Screen[] = ['Office', 'Agents', 'Tasks', 'Settings'];
const descriptions: Record<Screen, string> = {
  Office: 'Your future workspace for creating agents and inspecting their work.',
  Agents: 'Define reusable instructions, model choices, and tool permissions.',
  Tasks: 'Review real run results, sources, and errors in one place.',
  Settings: 'Configure providers and local storage when those integrations are available.',
};
type InfoState = { status: 'loading' } | { status: 'ready'; info: AppInfo } | { status: 'error'; message: string };

export function App() {
  const notes = useNotesSession();
  const library = useLibrary();
  const refreshLibrary = library.refresh;
  useEffect(() => { if (['completed', 'failed', 'cancelled'].includes(notes.snapshot.phase)) void refreshLibrary(); }, [notes.snapshot.phase, refreshLibrary]);
  const [screen, setScreen] = useState<Screen>('Office');
  const [state, setState] = useState<InfoState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    // Await the actual bridge; no timer, simulated runs, or fabricated agent data.
    void readAppInfo().then(
      (info) => { if (active) setState({ status: 'ready', info }); },
      (error: unknown) => {
        if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to read application information.' });
      },
    );
    return () => { active = false; };
  }, [attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to workspace</a>
      <aside className="sidebar" aria-label="Application sidebar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">n<span /></span><span>AgentNest<span className="brand-label">LOCAL WORKSPACE</span></span></div>
        <nav aria-label="Main navigation">
          {screens.map((item) => (
            <button key={item} aria-current={screen === item ? 'page' : undefined} onClick={() => setScreen(item)}>
              <WorkspaceIcon name={item} />{item}
            </button>
          ))}
        </nav>
        <div className="sidebar-note"><span className="status-dot" />Pre-alpha workspace<p>Office preview. Real notes runs in Tasks.</p></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><span>Workspace <span aria-hidden="true">/</span> <strong>{screen}</strong></span><span className="badge">PRE-ALPHA</span></header>
        {isActiveSession(notes.snapshot) && screen !== 'Tasks' && <div className="active-notes-run" role="status"><span>A real local notes run is {notes.snapshot.phase === 'cancelling' ? 'cancelling' : 'active'}.</span><button onClick={() => { setScreen('Tasks'); document.getElementById('main-content')?.focus(); }}>View notes run</button></div>}
        <main id="main-content" tabIndex={-1} className={screen === 'Office' ? 'office-page' : undefined}>
          <h1 className={screen === 'Office' ? 'shell-heading' : undefined}>AgentNest — Pre-alpha</h1>
          {screen === 'Office' ? <OfficeWorkspace /> : screen === 'Agents' ? <AgentsPanel library={library} /> : screen === 'Tasks' ? <><NotesRunPanel session={notes} agents={library.snapshot.agents} /><RunHistory library={library} active={isActiveSession(notes.snapshot)} /></> : <><p className="intro">A local home for agents you define, understand, and control.</p><section className="feature-panel" aria-labelledby="screen-title">
            <div className="panel-top"><span className="section-number">0{screens.indexOf(screen) + 1}</span><span className="coming-soon">Coming soon</span></div>
            <h2 id="screen-title">{screen}</h2>
            <p>{descriptions[screen]}</p>
            <div className="empty-state"><span className="empty-symbol" aria-hidden="true">◇</span><h3>Provider settings are not available yet.</h3><p>Saved agents are available in Agents. Local notes runs and SQLite history are available in Tasks. Additional provider settings are coming soon.</p></div>
          </section></>}
          <section className={screen === 'Office' ? 'foundation-panel compact-foundation' : 'foundation-panel'} aria-labelledby="foundation-title">
            <div><h2 id="foundation-title">Desktop foundation</h2><p>Saved agents in Agents. Read-only local runs and SQLite history in Tasks.</p></div>
            <div className="runtime-info" aria-live="polite" aria-busy={state.status === 'loading'}>
              {state.status === 'loading' && <p role="status" aria-label="Application information">Loading application information…</p>}
              {state.status === 'error' && <div role="alert"><p>{state.message}</p><button className="retry" onClick={retry}>Retry</button></div>}
              {state.status === 'ready' && <dl><div><dt>App</dt><dd>{state.info.version} · Pre-alpha</dd></div><div><dt>Electron</dt><dd>{state.info.electron}</dd></div><div><dt>Node.js</dt><dd>{state.info.node}</dd></div><div><dt>Platform</dt><dd>{state.info.platform}</dd></div></dl>}
            </div>
          </section>
          <footer>Built for local work. <span>Local agents and SQLite history · Experimental Ollama notes runs.</span></footer>
        </main>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not forward renderer errors or user content to remote telemetry.
  }
  override render() {
    if (this.state.failed) return <main className="fatal-error" role="alert"><h1>AgentNest could not render this screen.</h1><p>Close this window to stop any active notes run, then restart the application.</p></main>;
    return this.props.children;
  }
}
