// WCAG AA contrast checks for every colour pair the UI uses.
//   text: 4.5:1    large text and non-text (borders, focus ring, thread lines, icons): 3:1
import { describe, expect, it } from 'vitest';
import { CHANNELS, COLORS, contrast } from '@/ui/tokens';

const surfaces = { bg: COLORS.bg, surface: COLORS.surface, raised: COLORS.raised } as const;

describe('text contrast (AA 4.5:1)', () => {
  const textColors = {
    text: COLORS.text, muted: COLORS.muted, accent: COLORS.accent, good: COLORS.good,
    warn: COLORS.warn, danger: COLORS.danger, violet: COLORS.violet, pink: COLORS.pink,
  };
  for (const [tn, tc] of Object.entries(textColors)) {
    for (const [sn, sc] of Object.entries(surfaces)) {
      it(`${tn} on ${sn}`, () => expect(contrast(tc, sc)).toBeGreaterThanOrEqual(4.5));
    }
  }
  it('dark text on the primary (accent) button', () => expect(contrast(COLORS.bg, COLORS.accent)).toBeGreaterThanOrEqual(4.5));
  it('dark text on warn and danger fills', () => {
    expect(contrast(COLORS.bg, COLORS.warn)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.bg, COLORS.danger)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('non-text contrast (3:1)', () => {
  for (const [sn, sc] of Object.entries(surfaces)) {
    it(`border and focus ring on ${sn}`, () => {
      expect(contrast(COLORS.border, sc)).toBeGreaterThanOrEqual(3);
      expect(contrast(COLORS.accent, sc)).toBeGreaterThanOrEqual(3);
    });
    for (const [name, ch] of Object.entries(CHANNELS)) {
      it(`thread channel "${name}" on ${sn}`, () => expect(contrast(ch.color, sc)).toBeGreaterThanOrEqual(3));
    }
  }
});

describe('channels never rely on colour alone', () => {
  it('every channel has a distinct dash pattern or is the single solid line, and distinct colours', () => {
    const dashes = Object.values(CHANNELS).map((c) => c.dash);
    expect(new Set(dashes).size).toBe(dashes.length);
    const colors = Object.values(CHANNELS).map((c) => c.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
