// Design tokens: the single source of truth for colour. Injected as CSS variables at startup
// (see tokensToCss) and checked for WCAG contrast by tests/ui/contrast.test.ts.
//
// Rule: colour never carries meaning alone. Status uses icon + text; thread channels use
// icon + line pattern + colour; labels use text.

export const COLORS = {
  bg: '#0B1020',
  surface: '#141B33',
  raised: '#1D2850',
  text: '#E8ECF8',
  muted: '#A9B4D0',
  /** Borders and focus rings (non-text, needs 3:1). */
  border: '#7585BC',
  accent: '#4DD8FF',
  good: '#4CE0A0',
  warn: '#FFB020',
  danger: '#FF6B7A',
  violet: '#B8A0FF',
  pink: '#FF9AD5',
  orange: '#FF8A5C',
} as const;

export type Meter = 'mass' | 'power' | 'data' | 'cost' | 'fuel' | 'science';

/** Thread channels: colour + dash pattern (icons live in src/ui/icons.ts). */
export const CHANNELS: Record<Meter, { color: string; dash: string; label: string }> = {
  mass: { color: COLORS.warn, dash: '', label: 'Weight' },
  power: { color: COLORS.accent, dash: '12 7', label: 'Power' },
  cost: { color: COLORS.violet, dash: '1 8', label: 'Cost' },
  fuel: { color: COLORS.good, dash: '16 6 2 6', label: 'Fuel' },
  science: { color: COLORS.pink, dash: '5 5', label: 'Science' },
  data: { color: COLORS.orange, dash: '2 5 9 5', label: 'Data' },
};

/**
 * High-contrast theme (Phase 4). Only the surfaces, text, border and the status colours that fell short of 7:1
 * change. Thread channel colours stay as they are: they already clear 3:1 on the lighter default surfaces,
 * so they clear it by more on these darker ones (tests/ui/contrast.test.ts checks both themes).
 */
export const CONTRAST_COLORS: Record<keyof typeof COLORS, string> = {
  ...COLORS,
  bg: '#000000',
  surface: '#080808',
  raised: '#121212',
  text: '#FFFFFF',
  muted: '#E2E2E2',
  border: '#C8C8C8',
  danger: '#FF8F9C',
  violet: '#CDB9FF',
};

const toVars = (c: Record<string, string>): string =>
  Object.entries(c).map(([k, v]) => `--${k}: ${v};`).join(' ');

export function tokensToCss(): string {
  return `:root { ${toVars(COLORS)} } :root[data-theme="contrast"] { ${toVars(CONTRAST_COLORS)} }`;
}

/** WCAG 2.x relative luminance and contrast ratio. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
