import type { AgentAppearance, AgentStatus, EventOrigin } from '@agentnest/core';
import { characterPixels } from './character';

export const ROOM_WIDTH = 512;
export const ROOM_HEIGHT = 360;
export const DESKS = [{ x: 168, y: 122 }, { x: 294, y: 122 }, { x: 168, y: 226 }, { x: 294, y: 226 }] as const;

// Original procedural artwork. No downloaded images, sprite sheets, or fonts.
const letters: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '>': '100010001010100', '!': '010010010000010', '-': '000000111000000', '.': '000000000000010',
};

function painter(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas drawing is unavailable');
  context.imageSmoothingEnabled = false;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color; context.fillRect(x, y, w, h);
  };
  const text = (value: string, x: number, y: number, color: string, scale = 1) => {
    for (const [offset, character] of [...value.toUpperCase()].entries()) {
      const glyph = letters[character];
      if (glyph) for (let pixel = 0; pixel < 15; pixel++) {
        if (glyph[pixel] === '1') rect(x + (offset * 4 + pixel % 3) * scale, y + Math.floor(pixel / 3) * scale, scale, scale, color);
      }
    }
  };
  return { canvas, context, rect, text };
}

export function officeArt(): HTMLCanvasElement {
  const { canvas, context, rect: r, text } = painter(ROOM_WIDTH, ROOM_HEIGHT);
  // A cutaway room: cool slate walls, warm parquet, morning light.
  r(29, 57, 456, 285, '#101e28'); r(37, 65, 456, 274, '#0d1820');
  r(24, 35, 456, 43, '#64737b'); r(24, 37, 456, 2, '#a0aa9f');
  r(32, 44, 440, 27, '#7d8b8a'); r(32, 68, 440, 9, '#3b5157');
  r(32, 77, 440, 249, '#b3906d');
  context.save(); context.beginPath(); context.rect(32, 77, 440, 249); context.clip();
  for (let y = 78; y < 325; y += 12) for (let x = 33; x < 471; x += 28) {
    const shade = ['#b99b77', '#b49672', '#ae8f6b', '#bea07c'][(Math.floor(x / 28) + Math.floor(y / 12) * 3) % 4] ?? '#b99b77';
    r(x + (Math.floor(y / 12) % 2) * 2, y, 26, 11, shade);
    if ((x + y) % 5 === 0) r(x + 5, y + 3, 12, 1, '#c5a783');
  }
  context.restore();
  // Solid side walls and skirting prevent the floor pattern bleeding out.
  r(24, 75, 13, 254, '#50666a'); r(24, 78, 3, 248, '#87938b');
  r(468, 72, 12, 257, '#3b5159'); r(468, 78, 3, 246, '#71817c');
  r(36, 320, 432, 6, '#80644e'); r(24, 326, 456, 8, '#40575c'); r(24, 326, 456, 2, '#87958d');

  for (const x of [65, 207, 350]) {
    r(x - 3, 30, 92, 44, '#41545c'); r(x, 32, 86, 37, '#a4ccd1');
    r(x + 3, 35, 80, 12, '#8eb5c5'); r(x + 3, 48, 80, 17, '#c2dcd2');
    r(x + 8, 53, 14, 12, '#a4c8c4'); r(x + 27, 50, 12, 15, '#a4c8c4');
    r(x + 57, 55, 19, 10, '#a4c8c4'); r(x + 40, 32, 4, 37, '#e2d9bd');
    r(x, 46, 86, 3, '#e2d9bd'); r(x - 5, 68, 96, 5, '#c1b99f');
    context.globalAlpha = .12; r(x + 5, 78, 70, 18, '#fff2bd'); r(x + 11, 96, 70, 21, '#fff2bd'); context.globalAlpha = 1;
  }
  // Clock, notice board, original pixel lettering.
  r(165, 39, 24, 21, '#344e55'); r(168, 41, 18, 17, '#e4dfc9');
  r(176, 44, 1, 7, '#4b6265'); r(177, 50, 5, 1, '#4b6265');
  r(312, 40, 27, 24, '#394e56'); r(314, 42, 23, 19, '#bca17f');
  r(317, 45, 7, 8, '#e4dbbd'); r(326, 47, 7, 10, '#8eaaa0');
  text('NEST', 242, 80, '#6d6653');

  const plant = (x: number, y: number, large = false) => {
    r(x - 6, y + 11, 17, 4, '#8a765d');
    r(x - 3, y + 2, 12, 10, '#b16f51'); r(x - 5, y, 16, 4, '#d18e63'); r(x - 1, y + 4, 3, 7, '#cc8b64');
    r(x + 1, y - 15, 3, 17, '#47755c'); r(x - 7, y - 11, 10, 5, '#698a63');
    r(x + 3, y - 17, 9, 6, '#759965'); r(x - 3, y - 20, 7, 9, '#88a774');
    r(x - 9, y - 8, 7, 5, '#527a5d'); r(x + 4, y - 8, 10, 5, '#8da977');
    if (large) { r(x - 8, y - 28, 9, 10, '#6a9669'); r(x + 3, y - 32, 6, 14, '#9cba7c'); }
  };
  plant(49, 101, true); plant(443, 104, true); plant(445, 298, true);
  // Lounge: woven rug, two-seat sage couch, low table, books and a mug.
  r(51, 146, 100, 107, '#967e65'); r(54, 149, 94, 101, '#b9b394');
  for (let y = 153; y < 248; y += 5) { r(58, y, 86, 1, '#a6a68c'); }
  r(58, 161, 39, 72, '#626f5a'); r(56, 155, 37, 71, '#70866b');
  r(57, 154, 8, 73, '#93a17c'); r(87, 156, 8, 71, '#5f7862');
  r(65, 158, 21, 27, '#8fa282'); r(65, 188, 21, 29, '#849877');
  r(64, 222, 23, 5, '#536d58'); r(68, 162, 12, 7, '#b4bb91');
  r(107, 172, 29, 53, '#87705a'); r(104, 168, 29, 51, '#cfb58c'); r(106, 170, 25, 3, '#e2cba2');
  r(110, 181, 13, 16, '#63847e'); r(112, 182, 3, 12, '#8dafa0');
  r(117, 204, 7, 7, '#f1e2bd'); r(124, 206, 3, 3, '#e6d5af'); r(119, 205, 3, 2, '#7b5a42');
  text('LOUNGE', 80, 260, '#6e6c56');
  // Coffee nook, shelving, a resting stool.
  r(403, 145, 51, 35, '#6d6958'); r(400, 139, 51, 34, '#a28665'); r(398, 136, 55, 6, '#dfc79b');
  r(407, 118, 20, 19, '#485a5a'); r(409, 120, 16, 10, '#273e46'); r(414, 130, 5, 5, '#ddcaa3');
  r(433, 129, 7, 7, '#e4dac0'); r(402, 181, 45, 3, '#aa8c66');
  r(414, 206, 21, 7, '#665e4e'); r(411, 200, 23, 8, '#a38b69'); r(415, 211, 3, 12, '#5d6051'); r(429, 211, 3, 12, '#5d6051');
  r(398, 248, 53, 31, '#665f51'); r(400, 246, 49, 5, '#c0a37c');
  for (let x = 403; x < 448; x += 7) { r(x, 254, 4, 16, ['#8f9e82', '#bb7d62', '#c5b68a'][(x % 3)] ?? '#8f9e82'); }
  r(400, 272, 49, 4, '#b19873');
  // Four individually numbered workstations.
  DESKS.forEach(({ x, y }, index) => {
    r(x - 6, y - 6, 98, 83, '#a38c72'); r(x - 4, y - 4, 94, 79, '#a9b0a0');
    r(x + 1, y + 43, 87, 12, '#80694f'); r(x, y + 2, 86, 44, '#d2b58a');
    r(x, y, 86, 5, '#e4cca3'); r(x + 2, y + 36, 82, 8, '#b99a73');
    r(x + 4, y + 44, 5, 13, '#6c6656'); r(x + 76, y + 44, 5, 13, '#6c6656');
    r(x + 24, y + 4, 34, 23, '#41545b'); r(x + 27, y + 7, 28, 16, '#8bb0aa');
    r(x + 29, y + 9, 24, 3, '#b7d1bb'); r(x + 30, y + 14, 13, 1, '#6d9695'); r(x + 30, y + 18, 19, 1, '#6d9695');
    r(x + 39, y + 27, 5, 4, '#506164'); r(x + 33, y + 31, 18, 2, '#66716b');
    r(x + 28, y + 35, 27, 5, '#eee0ba'); r(x + 29, y + 36, 24, 1, '#bcac8d');
    r(x + 63, y + 30, 5, 7, '#d9cead'); r(x + 69, y + 32, 2, 3, '#e8d9b6');
    r(x + 7, y + 23, 10, 14, '#789183'); r(x + 9, y + 25, 6, 1, '#c8d1ae');
    // Chair back remains behind the character.
    r(x + 31, y + 48, 22, 22, '#465e60'); r(x + 33, y + 49, 18, 17, '#607a75'); r(x + 32, y + 68, 20, 4, '#374c53');
    text(`0${index + 1}`, x + 74, y + 8, '#6e624f');
  });
  // Door and welcome mat; never animated into a task action.
  r(67, 320, 43, 14, '#1e333c'); r(70, 322, 37, 9, '#a8a48c');
  r(69, 291, 37, 28, '#86745b'); r(72, 293, 31, 24, '#95846a');
  for (let x = 74; x < 102; x += 4) r(x, 296, 1, 18, '#82765e');
  text('HI', 83, 302, '#d9c8a3');
  // Front-facing wooden door: inset panels, brass handle, and a stone threshold.
  r(67, 321, 43, 31, '#253f46'); r(70, 323, 37, 27, '#a27d56');
  r(73, 325, 30, 9, '#8f6949'); r(73, 337, 30, 10, '#8f6949');
  r(75, 326, 26, 1, '#bc9566'); r(75, 338, 26, 1, '#bc9566');
  r(100, 334, 3, 3, '#f0d496'); r(66, 351, 45, 3, '#939b8b');
  return canvas;
}

export function characterArt(appearance: AgentAppearance): HTMLCanvasElement {
  const { canvas, rect } = painter(28, 34);
  for (const pixel of characterPixels(appearance)) rect(...pixel);
  return canvas;
}

export function labelArt(name: string, status: AgentStatus, origin: EventOrigin): HTMLCanvasElement {
  const labels: Record<AgentStatus, string> = { idle: 'IDLE', working: '> WORKING', awaiting_approval: 'II APPROVAL', completed: 'OK COMPLETED', failed: '! FAILED' };
  const colors: Record<AgentStatus, string> = { idle: '#becac3', working: '#b1d5a3', awaiting_approval: '#efce8b', completed: '#a5d3ce', failed: '#efb3a7' };
  const line = labels[status];
  const prefix = origin === 'demo' ? 'DEMO' : 'VIEW';
  const width = Math.max(name.length + 5, line.length) * 8 + 10;
  const { canvas, rect: r, text } = painter(width, 31);
  r(1, 1, width - 2, 29, '#263b43'); r(2, 2, width - 4, 27, '#172b34');
  text(`${prefix} ${name}`, 5, 4, '#e8e2ca', 2); text(line, 5, 18, colors[status], 2);
  return canvas;
}
