import { contextBridge, ipcRenderer } from 'electron';
import { isAppInfoResult, NOTES_CHANNELS, isNotesResult, isNotesSession, isStartNotesRequest } from '@agentnest/core';
import type { DesktopBridge } from '@agentnest/core';
import { LIBRARY_CHANNELS, isLibraryRequest, isLibraryResult } from '@agentnest/core';

async function libraryCommand(operation: keyof typeof LIBRARY_CHANNELS, request: unknown = { apiVersion: 1 }) {
  if (!isLibraryRequest(operation, request)) throw new Error('Invalid library request');
  const result: unknown = await ipcRenderer.invoke(LIBRARY_CHANNELS[operation], request);
  if (!isLibraryResult(result)) throw new Error('Invalid library service response');
  return result;
}

async function notesCommand(operation: 'read' | 'choose' | 'start' | 'cancel' | 'clear', request: unknown = { apiVersion: 1 }) {
  const result: unknown = await ipcRenderer.invoke(NOTES_CHANNELS[operation], request);
  if (!isNotesResult(result)) throw new Error('Invalid notes service response');
  return result;
}

// Bundled as CJS: the sandboxed preload only requires Electron's permitted API.
const bridge: DesktopBridge = {
  library: Object.freeze({
    read: () => libraryCommand('read'),
    saveAgent: (request: Parameters<DesktopBridge['library']['saveAgent']>[0]) => libraryCommand('saveAgent', request),
    removeAgent: (request: Parameters<DesktopBridge['library']['removeAgent']>[0]) => libraryCommand('removeAgent', request),
    readRun: (request: Parameters<DesktopBridge['library']['readRun']>[0]) => libraryCommand('readRun', request),
    removeRun: (request: Parameters<DesktopBridge['library']['removeRun']>[0]) => libraryCommand('removeRun', request),
    clearHistory: () => libraryCommand('clearHistory'),
  }),
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
