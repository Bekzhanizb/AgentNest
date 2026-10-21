import { isAppInfoResult } from '@agentnest/core';
import type { AppInfo, DesktopBridge } from '@agentnest/core';

declare global {
  interface Window {
    readonly agentnest?: DesktopBridge;
  }
}

export async function readAppInfo(): Promise<AppInfo> {
  if (!window.agentnest) throw new Error('Desktop bridge is unavailable. Open AgentNest through Electron.');
  const result: unknown = await window.agentnest.getAppInfo();
  if (!isAppInfoResult(result) || !result.ok) throw new Error('Application information is unavailable. Please retry.');
  return result.value;
}
