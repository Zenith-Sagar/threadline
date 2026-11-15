// Inline SVG icons (stroke = currentColor). Always decorative: the meaning is in adjacent text.
import { svg } from './dom';

export type IconName =
  | 'mass' | 'power' | 'cost' | 'fuel' | 'science' | 'data' | 'storm' | 'pause' | 'play'
  | 'ok' | 'tight' | 'bad' | 'idle' | 'info'
  | 'arrow' | 'decision' | 'effect' | 'outcome'
  | 'up' | 'down' | 'rewind' | 'rocket' | 'partial' | 'check';

const PATHS: Record<IconName, string[]> = {
  mass: ['M3 13h10l-1.6-7H4.6z', 'M6.5 4a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0z'],
  power: ['M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z'],
  cost: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M10 6.2C9.5 5.5 6 5.5 6 7.2S10 8.3 10 10 6.5 10.8 6 9.8', 'M8 4.5v7'],
  fuel: ['M8 1.5C6 5 4 7 4 9.5a4 4 0 0 0 8 0C12 7 10 5 8 1.5z'],
  science: ['M6 2h4', 'M7 2v4.5L3.5 12.5A1 1 0 0 0 4.4 14h7.2a1 1 0 0 0 .9-1.5L9 6.5V2'],
  data: ['M3 4.5c0-1 2.2-1.8 5-1.8s5 .8 5 1.8-2.2 1.8-5 1.8-5-.8-5-1.8z', 'M3 4.5v7c0 1 2.2 1.8 5 1.8s5-.8 5-1.8v-7', 'M3 8c0 1 2.2 1.8 5 1.8s5-.8 5-1.8'],
  storm: ['M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M8 1v2', 'M8 13v2', 'M1 8h2', 'M13 8h2', 'M3 3l1.4 1.4', 'M11.6 11.6 13 13', 'M13 3l-1.4 1.4', 'M4.4 11.6 3 13'],
  pause: ['M5 3v10', 'M11 3v10'],
  play: ['M5 3l8 5-8 5z'],
  ok: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M5 8.2 7.1 10.3 11 6'],
  tight: ['M8 2 14.5 13.5h-13z', 'M8 6.5v3', 'M8 11.5v.5'],
  bad: ['M5 1.5h6L14.5 5v6L11 14.5H5L1.5 11V5z', 'M5.5 5.5l5 5', 'M10.5 5.5l-5 5'],
  idle: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M5 8h6'],
  info: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M8 7.2v4', 'M8 4.8v.4'],
  arrow: ['M3 8h9', 'M9 4.5 12.5 8 9 11.5'],
  decision: ['M3 3h10v10H3z', 'M5.5 8l2 2 3-4'],
  effect: ['M4 4l4 4-4 4', 'M9 4l4 4-4 4'],
  outcome: ['M4 14V2', 'M4 3h8l-2 3 2 3H4'],
  up: ['M8 13V3', 'M4 7l4-4 4 4'],
  down: ['M8 3v10', 'M4 9l4 4 4-4'],
  rewind: ['M2.5 8a5.5 5.5 0 1 0 1.8-4', 'M2.5 2v3.5H6', 'M8 5v3.5l2.5 1.5'],
  rocket: ['M8 1.5c3 1.5 4 4.5 3.5 8L8 12.5 4.5 9.5C4 6 5 3 8 1.5z', 'M5 12l-2 2.5', 'M11 12l2 2.5'],
  partial: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M8 2v12'],
  check: ['M3 8.5 6.5 12 13 4.5'],
};

export function icon(name: IconName, size = 16): SVGSVGElement {
  const el = svg('svg', {
    viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': 'true', focusable: 'false',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    class: 'icon',
  });
  for (const d of PATHS[name]) el.append(svg('path', { d }));
  return el;
}

export function iconPaths(name: IconName): string[] {
  return PATHS[name];
}
