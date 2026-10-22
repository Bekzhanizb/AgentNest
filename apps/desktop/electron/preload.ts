import { contextBridge, ipcRenderer } from 'electron';
import { isAppInfoResult, NOTES_CHANNELS, isNotesResult, isNotesSession, isStartNotesRequest } from '@agentnest/core';
import type { DesktopBridge } from '@agentnest/core';

async function notesCommand(operation: 'read' | 'choose' | 'start' | 'cancel' | 'clear', request: unknown = { apiVersion: 1 }) {
  const result: unknown = await ipcRenderer.invoke(NOTES_CHANNELS[operation], request);
  if (!isNotesResult(result)) throw new Error('Invalid notes service response');
  return result;
}

// Bundled as CJS: the sandboxed preload only requires Electron's permitted API.
const bridge: DesktopBridge = {
  notes: Object.freeze({
    read: () => notesCommand('read'), choose: () => notesCommand('choose'),
    start: (request: Parameters<DesktopBridge['notes']['start']>[0]) => {
      if (!isStartNotesRequest(request)) return Promise.reject(new Error('Invalid notes request'));
      return notesCommand('start', request);
    },
    cancel: () => notesCommand('cancel'), clear: () => notesCommand('clear'),
    subscribe: (listener: Parameters<DesktopBridge['notes']['subscribe']>[0]) => {
      const handler = (_event: unknown, value: unknown) => listener(isNotesSession(value) ? value : null);
      ipcRenderer.on(NOTES_CHANNELS.changed, handler);
      return () => { ipcRenderer.removeListener(NOTES_CHANNELS.changed, handler); };
    },
  }),
  security: Object.freeze({ contextIsolated: process.contextIsolated, sandboxed: process.sandboxed }),
  async getAppInfo() {
    const response: unknown = await ipcRenderer.invoke('agentnest:app-info', { apiVersion: 1 });
    if (!isAppInfoResult(response)) throw new Error('Invalid application information');
    return response;
  },
};

contextBridge.exposeInMainWorld('agentnest', Object.freeze(bridge));
