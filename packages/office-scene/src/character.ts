import type { AgentAppearance } from '@agentnest/core';

export type PixelRect = readonly [x: number, y: number, width: number, height: number, color: string];

/** Shared original artwork for Pixi sprites and accessible DOM portraits. */
export function characterPixels(appearance: AgentAppearance): readonly PixelRect[] {
  const pixels: PixelRect[] = [];
  const r = (x: number, y: number, width: number, height: number, color: string) => { pixels.push([x, y, width, height, color]); };
  const skin = { light: '#e9bf99', warm: '#c89065', deep: '#936043' }[appearance.skin];
  const shirt = { sage: '#8fb592', blue: '#87b5ce', coral: '#d69483', gold: '#d6b36d' }[appearance.shirt];
  r(6, 30, 18, 3, '#3e5050'); r(8, 25, 5, 6, '#364e59'); r(17, 25, 5, 6, '#364e59');
  r(7, 30, 6, 2, '#253e49'); r(17, 30, 7, 2, '#253e49');
  r(7, 17, 17, 10, shirt); r(6, 19, 3, 6, shirt); r(23, 19, 3, 6, shirt);
  r(8, 17, 3, 10, '#ffffff22'); r(12, 15, 7, 4, skin);
  r(8, 6, 15, 11, skin); r(10, 4, 11, 14, skin); r(8, 5, 15, 5, '#3d3434');
  r(7, 8, 3, 5, '#3d3434'); r(12, 11, 2, 2, '#302f32'); r(19, 11, 2, 2, '#302f32');
  r(15, 15, 4, 1, '#834f42'); r(5, 24, 3, 3, skin); r(24, 24, 3, 3, skin);
  if (appearance.hair === 'bun') { r(17, 0, 7, 5, '#3c3233'); r(20, 2, 5, 6, '#574039'); r(8, 5, 4, 6, '#3c3233'); }
  if (appearance.hair === 'cap') { r(7, 3, 16, 6, '#5f8c79'); r(16, 8, 10, 2, '#a7c092'); r(10, 4, 9, 1, '#7ca48b'); }
  if (appearance.hair === 'headphones') { r(6, 6, 3, 8, '#d5b66c'); r(22, 6, 3, 8, '#d5b66c'); r(8, 2, 15, 2, '#ddc27f'); }
  if (appearance.hair === 'short') { r(8, 3, 13, 3, '#252e36'); r(8, 4, 3, 6, '#252e36'); }
  return pixels;
}
