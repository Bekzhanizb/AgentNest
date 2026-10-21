import { contextBridge, ipcRenderer } from 'electron';
import { isAppInfoResult } from '@agentnest/core';
import type { DesktopBridge } from '@agentnest/core';

// Bundled as CJS: the sandboxed preload only requires Electron's permitted API.
const bridge: DesktopBridge = {
  security: Object.freeze({ contextIsolated: process.contextIsolated, sandboxed: process.sandboxed }),
  async getAppInfo() {
    const response: unknown = await ipcRenderer.invoke('agentnest:app-info', { apiVersion: 1 });
    if (!isAppInfoResult(response)) throw new Error('Invalid application information');
    return response;
  },
};

contextBridge.exposeInMainWorld('agentnest', Object.freeze(bridge));
