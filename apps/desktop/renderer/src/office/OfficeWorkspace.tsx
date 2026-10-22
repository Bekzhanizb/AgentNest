import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { STATUS_PRESENTATION } from '@agentnest/core';
import { OfficeCanvas } from './OfficeCanvas';
import { AgentInspector } from './AgentInspector';
import { AgentPortrait } from './AgentPortrait';
import { StatusSymbol } from './StatusSymbol';
import { OutwardArrow } from '../WorkspaceIcon';
import { DEMO_EVENTS, projectDemo } from './demo';
import './office.css';

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener('change', callback);
  return () => media?.removeEventListener('change', callback);
}
function reducedMotionSnapshot() { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true; }
function subscribeVisibility(callback: () => void) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

export function OfficeWorkspace() {
  const [demo, setDemo] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [motion, setMotion] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, () => true);
  const visible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  const view = useMemo(() => demo ? projectDemo(step).agents : [], [demo, step]);
  const selected = view.find((agent) => agent.id === selectedId);
  const isPlaying = demo && playing && step < DEMO_EVENTS.length;

  useEffect(() => {
    if (!isPlaying || !visible) return;
    const timer = window.setInterval(() => setStep((value) => Math.min(value + 1, DEMO_EVENTS.length)), 2000);
    return () => window.clearInterval(timer);
  }, [isPlaying, visible]);

  function toggleDemo() {
    setDemo((value) => !value);
    setStep(0); setPlaying(false); setSelectedId(null);
  }
  function closeInspector() {
    document.getElementById(`office-agent-${selectedId ?? ''}`)?.focus();
    setSelectedId(null);
  }
  function moveRosterFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const previous = ['ArrowLeft', 'ArrowUp'].includes(event.key);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? view.length - 1 : (index + (previous ? -1 : 1) + view.length) % view.length;
    const id = view[next]?.id;
    if (id) document.getElementById(`office-agent-${id}`)?.focus();
  }

  return (
    <section className="office-workspace" aria-labelledby="office-heading">
      <div className="office-title-row">
        <div>
          <p className="eyebrow">A PLACE FOR YOUR IDEAS</p>
          <h2 id="office-heading">A little space for big ideas.</h2>
          <p>Settle into the studio. Explore what comes next.</p>
        </div>
        <span className="office-version"><span aria-hidden="true">✳</span> THE NEST / 01</span>
      </div>
      <div className={`session-banner ${demo ? 'is-demo' : ''}`} role="region" aria-label="Session mode">
        <span className="session-icon" aria-hidden="true">{demo ? 'D' : 'i'}</span>
        <div className="session-copy">
          <strong>{demo ? 'DEMO MODE — FICTIONAL SESSION' : 'OFFICE PREVIEW — NO SESSION CONNECTED'}</strong>
          <p>{demo ? 'Scripted characters and events. No AI, provider, or database is involved.' : 'A quiet room, ready to explore. Real agent sessions are coming soon.'}</p>
        </div>
        <button className={demo ? 'demo-exit' : 'demo-enter'} onClick={toggleDemo}>
          {demo ? 'Exit Demo Mode' : 'Enter Demo Mode'}{demo ? <span aria-hidden="true">×</span> : <OutwardArrow />}
        </button>
      </div>
      {demo && (
        <div className="demo-controls" role="group" aria-label="Fictional demo playback">
          <span className="demo-small">DEMO TIMELINE</span>
          <button onClick={() => setPlaying((value) => !value)} disabled={step >= DEMO_EVENTS.length}>
            <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▷'}</span> {isPlaying ? 'Pause demo' : 'Play demo'}
          </button>
          <button onClick={() => { setPlaying(false); setStep((value) => Math.min(value + 1, DEMO_EVENTS.length)); }} disabled={step >= DEMO_EVENTS.length}>Next demo event</button>
          <button className="quiet-button" onClick={() => { setPlaying(false); setStep(0); }}>Reset demo</button>
          <span className="demo-timeline" aria-hidden="true">{DEMO_EVENTS.map((event, index) => <span key={event.sequence} className={index < step ? 'passed' : undefined} />)}</span>
          <output aria-label="Demo progress">{step} / {DEMO_EVENTS.length} scripted events{step === DEMO_EVENTS.length ? ' · End of demo' : ''}</output>
        </div>
      )}
      <div className="office-layout">
        <div className="office-main-column">
          <OfficeCanvas agents={view} selectedId={selectedId} motion={motion && !reducedMotion} demo={demo} onSelect={setSelectedId} />
          <section className="agent-roster" aria-labelledby="roster-heading">
            <div className="roster-heading">
              <h3 id="roster-heading">{demo ? 'Demo characters' : 'Room for your team'} <span className="count-badge" aria-hidden="true">{view.length.toString().padStart(2, '0')}</span></h3>
              {selected ? <button className="inspector-shortcut" onClick={() => document.getElementById('agent-inspector')?.focus()}>View {selected.name}’s details <OutwardArrow /></button> : <span>{demo ? '4 fictional characters' : 'No session connected'}</span>}
            </div>
            {view.length === 0 ? (
              <div className="roster-empty">
                <span className="empty-desk" aria-hidden="true"><span /><span /><span /></span>
                <div><strong>Something good can start here.</strong><p>No agents are connected. Try Demo Mode to explore characters, statuses, and history.</p></div>
              </div>
            ) : (
              <ul className="roster-list">
                {view.map((agent, index) => (
                  <li key={agent.id}>
                    <button id={`office-agent-${agent.id}`} className={`roster-agent ${selectedId === agent.id ? 'selected' : ''}`}
                      aria-pressed={selectedId === agent.id} aria-controls="agent-inspector"
                      onClick={() => setSelectedId(agent.id)} onKeyDown={(event) => moveRosterFocus(event, index)}
                      aria-label={`Inspect ${agent.name}, ${agent.role}, ${STATUS_PRESENTATION[agent.status].label}, demo character`}>
                      <span className={`roster-avatar shirt-${agent.appearance.shirt}`}><AgentPortrait appearance={agent.appearance} /></span>
                      <span className="roster-text">
                        <span className="roster-name">{agent.name} <span className="demo-chip">DEMO</span></span>
                        <span className="roster-role">{agent.role}</span>
                        <span className={`roster-status status-${agent.status}`}><StatusSymbol status={agent.status} /> {STATUS_PRESENTATION[agent.status].label}</span>
                      </span>
                      {selectedId === agent.id && <span className="selected-check" aria-hidden="true">✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="office-footnote">
            <span><span className="art-mark" aria-hidden="true">✳</span> Original pixel art. Made for this little world.</span>
            <button aria-pressed={motion && !reducedMotion} disabled={reducedMotion} onClick={() => setMotion((value) => !value)}>{reducedMotion ? 'Motion off · system preference' : motion ? 'Ambient motion on' : 'Ambient motion off'}</button>
          </div>
        </div>
        <AgentInspector agent={selected} onClose={closeInspector} />
      </div>
      <div className="sr-only" role="status" aria-label="Office announcements" aria-live="polite">
        {demo ? `Demo Mode. ${selected ? `Selected ${selected.name}: ${STATUS_PRESENTATION[selected.status].label}.` : 'No character selected.'} Step ${step} of ${DEMO_EVENTS.length}.` : 'Office preview. No live session or agents connected.'}
      </div>
    </section>
  );
}
