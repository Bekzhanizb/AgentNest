import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfficeWorkspace } from './OfficeWorkspace';

vi.mock('./OfficeCanvas', () => ({ OfficeCanvas: () => <div>Office graphics test double</div> }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const enter = () => fireEvent.click(screen.getByRole('button', { name: 'Enter Demo Mode' }));
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next demo event' }));

describe('accessible office without AI or a database', () => {
  it('starts empty, requires explicit demo opt-in, and clears all fictional data on exit', () => {
    render(<OfficeWorkspace />);
    expect(screen.queryByRole('button', { name: /Inspect Ada/ })).toBeNull();
    expect(screen.getByRole('region', { name: 'Session mode' }).textContent).toContain('NO SESSION CONNECTED');
    enter();
    expect(screen.getByRole('region', { name: 'Session mode' }).textContent).toContain('DEMO MODE — FICTIONAL');
    next(); fireEvent.click(screen.getByRole('button', { name: /Inspect Ada/ }));
    expect(screen.getByRole('heading', { name: 'Demo event history' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Exit Demo Mode' }));
    expect(screen.queryByRole('button', { name: /Inspect Ada/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Demo event history' })).toBeNull();
    expect(screen.getByText('No character selected')).toBeDefined();
  });
  it.each([
    { step: 0, name: 'Ada', label: 'Idle', symbol: '○' },
    { step: 1, name: 'Ada', label: 'Working', symbol: '▶' },
    { step: 2, name: 'Milo', label: 'Awaiting approval', symbol: 'Ⅱ' },
    { step: 3, name: 'June', label: 'Completed', symbol: '✓' },
    { step: 4, name: 'Sol', label: 'Failed', symbol: '!' },
  ])('renders $label in the roster and inspector with text and symbol', ({ step, name, label, symbol }) => {
    render(<OfficeWorkspace />); enter(); for (let count = 0; count < step; count++) next();
    const button = screen.getByRole('button', { name: new RegExp(`Inspect ${name}, .*${label}, demo character`) });
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(within(inspector).getByText('DEMO CHARACTER · FICTIONAL')).toBeDefined();
    const status = within(inspector).getByRole('status', { name: 'Selected character status' });
    expect(status.textContent).toContain(label); expect(status.textContent).toContain(symbol);
    expect(within(inspector).getByText('Demo task')).toBeDefined();
    expect(within(inspector).getByRole('list', { name: 'Demo event history entries' }).children.length).toBe(step ? 2 : 1);
  });
  it('supports roster arrow keys and restores selection focus when inspector closes', () => {
    render(<OfficeWorkspace />); enter();
    const ada = screen.getByRole('button', { name: /Inspect Ada/ }); ada.focus();
    fireEvent.keyDown(ada, { key: 'ArrowRight' });
    const milo = screen.getByRole('button', { name: /Inspect Milo/ });
    expect(document.activeElement).toBe(milo);
    fireEvent.click(milo); fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    expect(document.activeElement).toBe(milo);
  });
  it('only advances on explicit play and stops after pause, reset, or exit', () => {
    vi.useFakeTimers(); render(<OfficeWorkspace />); enter();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole('status', { name: 'Office announcements' }).textContent).toContain('Step 0');
    fireEvent.click(screen.getByRole('button', { name: 'Play demo' }));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('status', { name: 'Office announcements' }).textContent).toContain('Step 1');
    fireEvent.click(screen.getByRole('button', { name: 'Pause demo' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole('status', { name: 'Office announcements' }).textContent).toContain('Step 1');
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(screen.getByRole('status', { name: 'Office announcements' }).textContent).toContain('Step 0');
    fireEvent.click(screen.getByRole('button', { name: 'Exit Demo Mode' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole('button', { name: /Inspect/ })).toBeNull();
  });
  it('honors reduced-motion and never offers to run or approve a real task', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<OfficeWorkspace />); enter();
    const motion = screen.getByRole('button', { name: 'Motion off · system preference' });
    expect(motion.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: /run agent|approve task|connect provider/i })).toBeNull();
  });
});
