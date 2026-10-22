import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppInfoResult } from '@agentnest/core';
import { App } from './App';
vi.mock('./office/OfficeCanvas', () => ({ OfficeCanvas: () => <div>Office graphics test double</div> }));

const info: AppInfoResult = { ok: true, value: { name: 'AgentNest', stage: 'pre-alpha', version: '0.0.0', electron: 'test', node: 'test', platform: 'test' } };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function bridge(getAppInfo: () => Promise<AppInfoResult>) {
  Object.defineProperty(window, 'agentnest', { configurable: true, value: { getAppInfo } });
}

describe('pre-alpha shell', () => {
  it('shows actual loading, then information and working navigation without fake activity', async () => {
    let resolve: ((value: AppInfoResult) => void) | undefined;
    bridge(() => new Promise<AppInfoResult>((done) => { resolve = done; }));
    render(<App />);
    expect(screen.getByRole('status', { name: 'Application information' }).textContent).toContain('Loading');
    await act(() => { resolve?.(info); });
    expect(screen.getByText('0.0.0 · Pre-alpha')).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: 'Skip to workspace' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(window.location.hash).toBe('');
    for (const name of ['Agents', 'Tasks', 'Settings', 'Office']) {
      fireEvent.click(screen.getByRole('button', { name }));
      if (name === 'Office') expect(screen.getByRole('button', { name: 'Enter Demo Mode' })).toBeDefined();
      else expect(screen.getByRole('heading', { name, level: 2 })).toBeDefined();
      expect(screen.getByRole('button', { name }).getAttribute('aria-current')).toBe('page');
      if (name === 'Settings') expect(screen.getByText('Coming soon')).toBeDefined();
    }
    expect(screen.queryByRole('button', { name: /run|create agent/i })).toBeNull();
  });

  it('shows a real bridge failure and allows retry', async () => {
    const getAppInfo = vi.fn<() => Promise<AppInfoResult>>()
      .mockRejectedValueOnce(new Error('Bridge failed'))
      .mockResolvedValueOnce(info);
    bridge(getAppInfo);
    render(<App />);
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toContain('Bridge failed'); });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => { expect(screen.getByText('0.0.0 · Pre-alpha')).toBeDefined(); });
    expect(getAppInfo).toHaveBeenCalledTimes(2);
  });

  it('explains that a browser preview has no Electron bridge', async () => {
    Object.defineProperty(window, 'agentnest', { configurable: true, value: undefined });
    render(<App />);
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toContain('Open AgentNest through Electron'); });
  });
});
