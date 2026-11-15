// High-contrast theme (Phase 4). Stricter than the default theme: text must reach 7:1 (WCAG AAA),
// and borders, focus rings and thread lines must reach at least 3:1 on every surface, as before.
// The default theme's checks stay in contrast.test.ts.
import { describe, expect, it } from 'vitest';
import { CHANNELS, COLORS, CONTRAST_COLORS, contrast, tokensToCss } from '@/ui/tokens';

const C = CONTRAST_COLORS;
const surfaces = { bg: C.bg, surface: C.surface, raised: C.raised } as const;

describe('high-contrast theme: text reaches 7:1 (AAA)', () => {
  const textColors = {
    text: C.text, muted: C.muted, accent: C.accent, good: C.good,
    warn: C.warn, danger: C.danger, violet: C.violet, pink: C.pink,
  };
  for (const [tn, tc] of Object.entries(textColors)) {
    for (const [sn, sc] of Object.entries(surfaces)) {
      it(`${tn} on ${sn}`, () => expect(contrast(tc, sc)).toBeGreaterThanOrEqual(7));
    }
  }
  it('dark text on the accent, warn and danger fills', () => {
    for (const fill of [C.accent, C.warn, C.danger]) expect(contrast(C.bg, fill)).toBeGreaterThanOrEqual(7);
  });
});

describe('high-contrast theme: non-text reaches 3:1', () => {
  for (const [sn, sc] of Object.entries(surfaces)) {
    it(`border and focus ring on ${sn}`, () => {
      expect(contrast(C.border, sc)).toBeGreaterThanOrEqual(3);
      expect(contrast(C.accent, sc)).toBeGreaterThanOrEqual(3);
    });
    for (const [name, ch] of Object.entries(CHANNELS)) {
      it(`thread channel "${name}" on ${sn}`, () => expect(contrast(ch.color, sc)).toBeGreaterThanOrEqual(3));
    }
  }
});

describe('theme plumbing', () => {
  it('both themes are emitted, the second keyed on data-theme="contrast"', () => {
    const css = tokensToCss();
    expect(css).toContain(':root {');
    expect(css).toContain(':root[data-theme="contrast"]');
    expect(css).toContain(`--bg: ${C.bg}`);
  });
  it('the contrast theme only changes what it needs to (same keys as the default theme)', () => {
    expect(Object.keys(C).sort()).toEqual(Object.keys(COLORS).sort());
  });
});
