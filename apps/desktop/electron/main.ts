import { app, BrowserWindow, dialog, ipcMain, net, protocol, session } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_NAME, APP_STAGE, isAppInfoRequest } from '@agentnest/core';
import type { AppInfoResult } from '@agentnest/core';
import { NOTES_CHANNELS, isNotesRequest, isStartNotesRequest, sessionError } from '@agentnest/core';
import type { NotesResult } from '@agentnest/core';
import { NotesSessionOwner } from './notes-session';
import { notesWorkerLauncher } from './notes-worker-client';
import { APP_INFO_CHANNEL, APP_URL, DEV_URL, DEVELOPMENT_CSP, PRODUCTION_CSP, isTrustedFrame, resolveAsset } from './security';

app.setName(APP_NAME);

protocol.registerSchemesAsPrivileged([{
  scheme: 'agentnest',
  privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);

const development = !app.isPackaged && app.commandLine.hasSwitch('development');
const trustedUrl = development ? DEV_URL : APP_URL;
let mainWindow: BrowserWindow | null = null;
let notesOwner: NotesSessionOwner | null = null;

function trustedSender(event: IpcMainInvokeEvent): boolean {
  return !!mainWindow && event.sender === mainWindow.webContents && event.senderFrame === mainWindow.webContents.mainFrame
    && isTrustedFrame(event.senderFrame.url, trustedUrl);
}

function createWindow(): void {
  const window = new BrowserWindow({
    title: 'AgentNest — Pre-alpha',
    width: 1200,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#101820',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  mainWindow = window;
  const owner = new NotesSessionOwner({
    chooseFolder: async () => {
      const result = await dialog.showOpenDialog(window, { title: 'Choose notes to review before granting access', properties: ['openDirectory', 'dontAddToRecent'] });
      return result.canceled ? null : result.filePaths[0] ?? null;
    },
    launch: notesWorkerLauncher(path.join(__dirname, 'notes-worker.cjs')),
    confirmRun: async (approval, model) => {
      const answer = await dialog.showMessageBox(window, {
        type: 'question', title: 'Allow this local notes run?', message: 'Read these notes and send them to local Ollama?',
        detail: `Folder: ${approval.root}\nFiles: ${approval.files.map((file) => file.path).join(', ')}\nModel: ${model}\n\nOne run only. Up to 3 minutes, 4 model calls and 4 read calls. No writing, shell or publishing. The app keeps the result in memory only.`,
        buttons: ['Cancel', 'Allow this run'], defaultId: 0, cancelId: 0, noLink: true,
      });
      return answer.response === 1;
    },
    publish: (snapshot) => {
      if (!window.isDestroyed() && window.webContents.mainFrame.url === trustedUrl) window.webContents.send(NOTES_CHANNELS.changed, snapshot);
    },
  });
  notesOwner = owner;
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { owner.dispose(); if (mainWindow === window) { mainWindow = null; notesOwner = null; } });
  let documentLoaded = false;
  window.webContents.once('did-finish-load', () => { documentLoaded = true; });
  window.webContents.on('render-process-gone', () => owner.revoke());
  window.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame && documentLoaded) owner.revoke(); });
  window.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('Renderer failed to load:', code, description);
  });
  void window.loadURL(trustedUrl).catch((error: unknown) => {
    console.error('Unable to load AgentNest:', error);
    app.quit();
  });
}

void app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [development ? DEVELOPMENT_CSP : PRODUCTION_CSP],
    } });
  });

  protocol.handle('agentnest', async (request) => {
    const asset = resolveAsset(request.url, path.join(__dirname, '../renderer'));
    if (request.method !== 'GET' || !asset) return new Response('Not found', { status: 404 });
    try {
      const response = await net.fetch(pathToFileURL(asset).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', PRODUCTION_CSP);
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  ipcMain.handle(APP_INFO_CHANNEL, (event, request: unknown): AppInfoResult => {
    if (!mainWindow || event.sender !== mainWindow.webContents
      || event.senderFrame !== mainWindow.webContents.mainFrame
      || !isTrustedFrame(event.senderFrame.url, trustedUrl)
      || !isAppInfoRequest(request)) return { ok: false, error: 'UNAVAILABLE' };
    return { ok: true, value: {
      name: APP_NAME, stage: APP_STAGE, version: app.getVersion(),
      electron: process.versions.electron, node: process.versions.node, platform: process.platform,
    } };
  });

  for (const operation of ['read', 'choose', 'start', 'cancel', 'clear'] as const) {
    ipcMain.handle(NOTES_CHANNELS[operation], async (event, ...args: unknown[]): Promise<NotesResult> => {
      const request = args[0];
      if (!trustedSender(event) || args.length !== 1 || !(operation === 'start' ? isStartNotesRequest(request) : isNotesRequest(request))) return { ok: false, error: sessionError('INVALID_REQUEST') };
      if (!notesOwner) return { ok: false, error: sessionError('UNAVAILABLE') };
      return operation === 'start' ? notesOwner.start(request) : notesOwner[operation]();
    });
  }

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error: unknown) => {
  console.error('Desktop startup failed:', error);
  app.exit(1);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
