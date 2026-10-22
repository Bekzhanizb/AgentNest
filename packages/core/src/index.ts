export const APP_NAME = 'AgentNest';
export const APP_STAGE = 'pre-alpha';
export * from './agent-view';

export type Screen = 'Office' | 'Agents' | 'Tasks' | 'Settings';

export interface AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly instructions: string;
  readonly providerId: string;
  readonly model: string;
}

export interface AppInfo {
  readonly name: typeof APP_NAME;
  readonly stage: typeof APP_STAGE;
  readonly version: string;
  readonly electron: string;
  readonly node: string;
  readonly platform: string;
}

export type AppInfoResult =
  | { readonly ok: true; readonly value: AppInfo }
  | { readonly ok: false; readonly error: 'UNAVAILABLE' };

export interface DesktopBridge {
  readonly security: { readonly contextIsolated: boolean; readonly sandboxed: boolean };
  getAppInfo(): Promise<AppInfoResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAppInfoRequest(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 1
    && Object.hasOwn(value, 'apiVersion') && value['apiVersion'] === 1;
}

export function isAppInfoResult(value: unknown): value is AppInfoResult {
  if (!isRecord(value)) return false;
  if (value['ok'] === false) return value['error'] === 'UNAVAILABLE';
  if (value['ok'] !== true || !isRecord(value['value'])) return false;
  const info = value['value'];
  return info['name'] === APP_NAME && info['stage'] === APP_STAGE
    && ['version', 'electron', 'node', 'platform'].every((key) =>
      typeof info[key] === 'string' && info[key].length > 0 && info[key].length <= 100);
}
export * from './run-event';
