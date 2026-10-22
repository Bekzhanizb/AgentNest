export interface OfficeCamera { readonly zoom: number; readonly x: number; readonly y: number }
export const INITIAL_CAMERA: OfficeCamera = { zoom: 1, x: 0, y: 0 };
export function clampZoom(zoom: number): number { return Math.max(.65, Math.min(2.5, Number.isFinite(zoom) ? zoom : 1)); }
