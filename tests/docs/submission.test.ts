// The submission text must keep its word budgets, say what only the owner knows with marked placeholders (never invented), and stay exact about NASA data.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import moon from '@/data/snapshots/moon-facts.json';
import { SCIENCE_CARDS } from '@/ui/science-cards';

const doc = readFileSync('docs/submission.md', 'utf8');
const between = (a: string, b: string): string => doc.slice(doc.indexOf(a) + a.length, doc.indexOf(b));
const words = (s: string): number => (s.match(/[A-Za-z0-9'’-]+/g) ?? []).length;

describe('submission.md', () => {
  it('has a 50-word summary and a 200-word description (within 2 and 5 words)', () => {
    expect(Math.abs(words(between('## 50-word summary', '## 200-word description')) - 50)).toBeLessThanOrEqual(2);
    expect(Math.abs(words(between('## 200-word description', '## What it does')) - 200)).toBeLessThanOrEqual(5);
  });
  it('has the required sections', () => {
    for (const h of ['## What it does', '## How we built it', '## What we learned', "## What's next", '## Use of NASA data and sources']) expect(doc).toContain(h);
  });
  // Phase 9, deliberate change: this test pinned four "[FILL IN ...]" placeholders because the theme, team, SI rule and judging
  // criteria were unknown. They are now known from the official guides (13 Nov 2026) and the owner's input, so the test pins the
  // replacements instead. What the owner alone knows (event theme name, roles, idea origin) stays a marked [OWNER: ...] placeholder.
  it('names the challenge and the team (Sagar only, the AI not a member), and marks what only the owner knows', () => {
    expect(doc).toContain('Space Mission Design Game');
    expect(doc).toContain('Members: Sagar (the only member)');
    expect(doc).toContain('The AI is not a team member');
    expect(doc).toContain('[OWNER:');
    expect(doc).not.toMatch(/\[FILL IN/);
  });
  it('points to the SI acknowledgment instead of writing an origin claim', () => {
    expect(doc).toContain('Built with SI assistance (Claude, Anthropic)');
    expect(doc).toContain('SI_DISCLOSURE.md');
    expect(doc).not.toMatch(/\b(the idea was|our idea|my idea|idea came from|the AI (suggested|proposed|invented|came up)|Claude (suggested|proposed|invented|came up|had the idea))/i);
  });
  it('maps the evidence to the five official criteria and says it is not a self-score', () => {
    const map = doc.slice(doc.indexOf('## Judging criteria mapping'));
    for (const c of ['Impact', 'Creativity', 'Validity', 'Relevance', 'Presentation']) expect(map, c).toContain(`**${c}:**`);
    expect(map).toContain('not a self-score');
    expect(map).toContain('no stranger has played it yet');
  });
  it('states the three NASA values exactly as the game uses them', () => {
    const v = moon.values;
    expect(doc).toContain(`${v.volumetricMeanRadiusKm} km`);
    expect(doc).toContain('0.00490 x 10^6 km^3/s^2');
    expect(doc).toContain('0.3844 x 10^6 km');
    expect(v.gmE6Km3S2).toBe(0.0049);
    expect(v.semimajorAxisE6Km).toBe(0.3844);
    expect(doc).toMatch(/three values, all from one page/);
    expect(doc).toContain('nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html');
  });
  it('lists every Science Card source with the publisher the card shows, and says which are not NASA', () => {
    const urls = new Set(SCIENCE_CARDS.flatMap((c) => c.sources.map((s) => s.url)));
    expect(urls.size).toBe(9);
    for (const p of new Set(SCIENCE_CARDS.flatMap((c) => c.sources.map((s) => s.publisher)))) expect(doc, p).toContain(p.split(' (')[0] as string);
    expect(doc).toMatch(/\(not NASA\)/);
  });
  it('says what is NOT used (images, logos, live feeds) and keeps the not-affiliated line', () => {
    expect(doc).toMatch(/Not used:.*images, logos/s);
    expect(doc).toMatch(/not affiliated with or endorsed by NASA/);
  });
});
