import { app, BrowserWindow, ipcMain, net, protocol, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_NAME, APP_STAGE, isAppInfoRequest } from '@agentnest/core';
import type { AppInfoResult } from '@agentnest/core';
import { APP_INFO_CHANNEL, APP_URL, DEV_URL, DEVELOPMENT_CSP, PRODUCTION_CSP, isTrustedFrame, resolveAsset } from './security';

app.setName(APP_NAME);

protocol.registerSchemesAsPrivileged([{
  scheme: 'agentnest',
  privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);

const development = !app.isPackaged && app.commandLine.hasSwitch('development');
const trustedUrl = development ? DEV_URL : APP_URL;
let mainWindow: BrowserWindow | null = null;

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
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { if (mainWindow === window) mainWindow = null; });
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

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error: unknown) => {
  console.error('Desktop startup failed:', error);
  app.exit(1);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
