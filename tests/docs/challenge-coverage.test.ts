// docs/challenge-coverage.md must stay honest: only the five owner-named items are marked, all as Not built (the code has none of
// them), and the unknown remainder stays a marked [OWNER] placeholder. If a feature is ever built, change the row AND this test.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';

const doc = readFileSync('docs/challenge-coverage.md', 'utf8');
const rows = [...doc.matchAll(/^\| ([^|]+) \| (Built|Partly|Not built) \|/gm)].map((m) => [m[1]?.trim(), m[2]] as const);

describe('challenge-coverage.md', () => {
  it('marks exactly the five owner-named items, all Not built', () => {
    expect(rows.map((r) => r[0])).toEqual(['Team play', 'Orbit options', 'Objective definition', 'Sandbox', 'Leaderboards']);
    for (const r of rows) expect(r[1], String(r[0])).toBe('Not built');
  });
  it('says the challenge page was not supplied and keeps an [OWNER] placeholder for the rest', () => {
    expect(doc).toContain('not supplied');
    expect(doc).toContain('[OWNER: paste the remaining');
  });
  it('does not claim a Resources-tab tool was used', () => {
    expect(doc).toContain('No Resources-tab tool');
    expect(doc).not.toMatch(/we used (GMAT|Mission Viz|Mission Design Lab)/i);
  });
  it('the "one orbit" statement matches the content (one mission, altitude 100 km)', () => {
    expect(doc).toContain('100 km');
    expect(JSON.stringify(LUNAR_RECON)).toMatch(/"altitudeKm":100\b/);
  });
});
