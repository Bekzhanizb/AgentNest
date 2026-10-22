import { useEffect, useRef, useState } from 'react';
import { clampZoom, INITIAL_CAMERA } from '@agentnest/office-scene/camera';
import type { OfficeCamera } from '@agentnest/office-scene/camera';
import type { OfficeScene } from '@agentnest/office-scene';
import type { AgentViewModel } from '@agentnest/core';

interface Props {
  readonly agents: readonly AgentViewModel[];
  readonly selectedId: string | null;
  readonly motion: boolean;
  readonly demo: boolean;
  readonly onSelect: (id: string | null) => void;
}

export function OfficeCanvas({ agents, selectedId, motion, demo, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<OfficeScene | null>(null);
  const latest = useRef({ agents, selectedId, motion });
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [camera, setCamera] = useState<OfficeCamera>(INITIAL_CAMERA);
  const cameraRef = useRef(camera);
  const drag = useRef<{ x: number; y: number; camera: OfficeCamera; moved: boolean } | null>(null);

  useEffect(() => {
    latest.current = { agents, selectedId, motion };
    scene.current?.update(agents, selectedId, motion && !document.hidden);
  }, [agents, selectedId, motion]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let alive = true;
    let instance: OfficeScene | null = null;
    const resize = () => instance?.resize(element.clientWidth, element.clientHeight);
    const visibility = () => instance?.update(latest.current.agents, latest.current.selectedId, latest.current.motion && !document.hidden);
    const lost = (event: Event) => { event.preventDefault(); if (alive) setStatus('failed'); };
    const observer = new ResizeObserver(resize);
    void import('@agentnest/office-scene').then(({ OfficeScene }) => OfficeScene.create()).then((created) => {
      if (!alive) { created.destroy(); return; }
      instance = created; scene.current = created;
      created.canvas.setAttribute('aria-hidden', 'true');
      created.canvas.addEventListener('webglcontextlost', lost);
      element.replaceChildren(created.canvas);
      resize(); created.setCamera(cameraRef.current); visibility(); observer.observe(element);
      setStatus('ready');
    }).catch(() => { if (alive) setStatus('failed'); });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive = false; observer.disconnect(); document.removeEventListener('visibilitychange', visibility);
      instance?.canvas.removeEventListener('webglcontextlost', lost);
      instance?.destroy(); if (scene.current === instance) scene.current = null;
    };
  }, [attempt]);

  useEffect(() => { cameraRef.current = camera; scene.current?.setCamera(camera); }, [camera]);

  function move(x: number, y: number) {
    setCamera((previous) => ({ ...previous, x: Math.max(-900, Math.min(900, previous.x + x)), y: Math.max(-700, Math.min(700, previous.y + y)) }));
  }
  function zoom(amount: number) { setCamera((previous) => ({ ...previous, zoom: clampZoom(previous.zoom + amount) })); }

  return <div className="scene-section">
    <div className="scene-topline"><span><span className="tiny-square" /> THE NEST <span className="scene-caption">/ four-desk studio</span></span><span className="scene-mode">{demo ? 'DEMO VIEW' : 'EMPTY OFFICE'}</span></div>
    <div className="office-viewport" role="group" tabIndex={0} aria-label="Office viewport" aria-describedby="office-controls-help"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const arrows: Record<string, readonly [number, number]> = { ArrowLeft: [-32, 0], ArrowRight: [32, 0], ArrowUp: [0, -32], ArrowDown: [0, 32] };
        const offset = arrows[event.key];
        if (offset) { event.preventDefault(); move(...offset); }
        else if (['+', '=', '-', 'Home', '0'].includes(event.key)) {
          event.preventDefault();
          if (event.key === 'Home' || event.key === '0') setCamera(INITIAL_CAMERA);
          else zoom(event.key === '-' ? -.15 : .15);
        } else if (event.key === 'Escape') onSelect(null);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, camera, moved: false };
      }}
      onPointerMove={(event) => {
        const start = drag.current; if (!start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
        if (start.moved) setCamera({ ...start.camera, x: start.camera.x + dx, y: start.camera.y + dy });
      }}
      onPointerUp={(event) => {
        const start = drag.current; drag.current = null;
        if (!start) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (!start.moved) {
          const bounds = event.currentTarget.getBoundingClientRect();
          onSelect(scene.current?.pick(event.clientX - bounds.left, event.clientY - bounds.top) ?? null);
        }
      }}
      onPointerCancel={() => { drag.current = null; }}>
      <div className="office-canvas-host" ref={host} />
      <span className="sr-only">{demo ? 'Demo Mode. Fictional characters are represented by the adjacent accessible roster.' : 'Empty office with four desks, a lounge, coffee nook, windows, plants, and a door. No session is connected.'}</span>
      {status === 'loading' && <div className="scene-fallback" role="status">Drawing your office…</div>}
      {status === 'failed' && <div className="scene-fallback" role="status"><strong>Office graphics unavailable</strong><span>The roster, inspector, and demo controls still work.</span><button onPointerDown={(event) => event.stopPropagation()} onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>Retry graphics</button></div>}
      {demo && <div className="scene-watermark" aria-hidden="true">DEMO MODE · FICTIONAL</div>}
    </div>
    <div className="camera-toolbar" role="group" aria-label="Office camera controls">
      <span className="render-status" role="status">{status === 'ready' ? 'Office scene ready' : status === 'failed' ? 'Text view available' : 'Loading scene'}</span>
      <button aria-label="Pan left" onClick={() => move(-40, 0)}>←</button><button aria-label="Pan up" onClick={() => move(0, -40)}>↑</button><button aria-label="Pan down" onClick={() => move(0, 40)}>↓</button><button aria-label="Pan right" onClick={() => move(40, 0)}>→</button>
      <span className="toolbar-divider" />
      <button aria-label="Zoom out" onClick={() => zoom(-.15)} disabled={camera.zoom <= .65}>−</button><output aria-label="Office zoom">{Math.round(camera.zoom * 100)}%</output><button aria-label="Zoom in" onClick={() => zoom(.15)} disabled={camera.zoom >= 2.5}>+</button>
      <button className="fit-button" onClick={() => setCamera(INITIAL_CAMERA)}>Fit office</button>
    </div>
    <p id="office-controls-help" className="camera-help">Drag to pan · Focus the office and use arrow keys, + / − to zoom, Home to fit · Select a character or use the roster.</p>
  </div>;
}
