import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { STATUS_PRESENTATION } from '@agentnest/core';
import { OfficeCanvas } from './OfficeCanvas';
import { AgentInspector } from './AgentInspector';
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

  function toggleDemo() { setDemo((value) => !value); setStep(0); setPlaying(false); setSelectedId(null); }
  function closeInspector() {
    document.getElementById(`office-agent-${selectedId ?? ''}`)?.focus();
    setSelectedId(null);
  }

  return <section className="office-workspace" aria-labelledby="office-heading">
    <div className="office-title-row"><div><p className="eyebrow">A PLACE FOR YOUR IDEAS</p><h2 id="office-heading">Your little corner of possibility.</h2><p>A handcrafted office. A clear view of what happens next.</p></div><span className="office-version">OFFICE / 01</span></div>
    <div className={`session-banner ${demo ? 'is-demo' : ''}`} role="region" aria-label="Session mode">
      <div><strong>{demo ? 'DEMO MODE — FICTIONAL SESSION' : 'OFFICE PREVIEW — NO SESSION CONNECTED'}</strong><p>{demo ? 'Scripted characters and events. No AI, provider, or database is involved.' : 'The office is ready to explore. Agent creation and real sessions are coming soon.'}</p></div>
      <button className={demo ? 'demo-exit' : 'demo-enter'} onClick={toggleDemo}>{demo ? 'Exit Demo Mode' : 'Enter Demo Mode'}</button>
    </div>
    {demo && <div className="demo-controls" role="group" aria-label="Fictional demo playback">
      <span className="demo-small">DEMO TIMELINE</span><button onClick={() => setPlaying((value) => !value)} disabled={step >= DEMO_EVENTS.length}>{isPlaying ? 'Pause demo' : 'Play demo'}</button><button onClick={() => { setPlaying(false); setStep((value) => Math.min(value + 1, DEMO_EVENTS.length)); }} disabled={step >= DEMO_EVENTS.length}>Next demo event</button><button onClick={() => { setPlaying(false); setStep(0); }}>Reset demo</button><output aria-label="Demo progress">{step} / {DEMO_EVENTS.length} scripted events{step === DEMO_EVENTS.length ? ' · End of demo' : ''}</output>
    </div>}
    <div className="office-layout">
      <div className="office-main-column"><OfficeCanvas agents={view} selectedId={selectedId} motion={motion && !reducedMotion} demo={demo} onSelect={setSelectedId} />
        <section className="agent-roster" aria-labelledby="roster-heading"><div className="roster-heading"><h3 id="roster-heading">{demo ? 'Demo characters' : 'Your future team'}</h3><span>{demo ? '4 fictional characters' : 'No session connected'}</span></div>
          {view.length === 0 ? <div className="roster-empty"><span aria-hidden="true">◇</span><div><strong>Room for a fresh start.</strong><p>No agents are connected. Enter Demo Mode to explore selection, statuses, and history.</p></div></div> : <ul className="roster-list">{view.map((agent) => <li key={agent.id}><button id={`office-agent-${agent.id}`} className={`roster-agent ${selectedId === agent.id ? 'selected' : ''}`} aria-pressed={selectedId === agent.id} aria-controls="agent-inspector" onClick={() => setSelectedId(agent.id)} aria-label={`Inspect ${agent.name}, ${agent.role}, ${STATUS_PRESENTATION[agent.status].label}, demo character`}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const index = view.findIndex((item) => item.id === agent.id);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? view.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + view.length) % view.length;
                const id = view[next]?.id; if (id) document.getElementById(`office-agent-${id}`)?.focus();
              }
            }}><span className={`roster-avatar shirt-${agent.appearance.shirt}`} aria-hidden="true">{agent.name.slice(0, 1)}</span><span className="roster-text"><span className="roster-name">{agent.name} <span className="demo-chip">DEMO</span></span><span className={`roster-status status-${agent.status}`}><span aria-hidden="true">{STATUS_PRESENTATION[agent.status].symbol}</span> {STATUS_PRESENTATION[agent.status].label}</span></span>{selectedId === agent.id && <span className="selected-check" aria-hidden="true">✓</span>}</button></li>)}</ul>}
        </section>
        <div className="office-footnote"><span>Original procedural pixel art · no external image assets</span><button aria-pressed={motion && !reducedMotion} disabled={reducedMotion} onClick={() => setMotion((value) => !value)}>{reducedMotion ? 'Motion off · system preference' : motion ? 'Ambient motion on' : 'Ambient motion off'}</button></div>
      </div><AgentInspector agent={selected} onClose={closeInspector} />
    </div>
    <div className="sr-only" role="status" aria-label="Office announcements" aria-live="polite">{demo ? `Demo Mode. ${selected ? `Selected ${selected.name}: ${STATUS_PRESENTATION[selected.status].label}.` : 'No character selected.'} Step ${step} of ${DEMO_EVENTS.length}.` : 'Office preview. No live session or agents connected.'}</div>
  </section>;
}
