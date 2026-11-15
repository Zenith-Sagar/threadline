// The Attributions page is a static file. This test keeps it honest and in step with the game.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import moon from '@/data/snapshots/moon-facts.json';
import { SCIENCE_CARDS } from '@/ui/science-cards';

const html = readFileSync(join(__dirname, '..', '..', 'public', 'attributions.html'), 'utf8');

describe('attributions.html', () => {
  it('lists every source from every Science Card', () => {
    for (const c of SCIENCE_CARDS) for (const s of c.sources) expect(html, `${c.id}: ${s.url}`).toContain(s.url);
  });
  it('credits the NASA Moon Fact Sheet the orbit numbers come from', () => {
    expect(html).toContain(moon.provenance.url);
  });
  it('says it is not affiliated with NASA and uses no NASA logos', () => {
    expect(html).toMatch(/not affiliated with or endorsed by NASA/);
    expect(html).toMatch(/No NASA logos/);
  });
  it('names the software licences (verified in Phase 6; tests/docs/licenses.test.ts reads the installed ones) and says no fonts are bundled', () => {
    expect(html).toMatch(/Phaser[\s\S]{0,200}Licence: MIT/);
    expect(html).toMatch(/zustand[\s\S]{0,200}Licence: MIT/);
    expect(html).toMatch(/No font files are bundled/);
  });
  // Phase 9, deliberate change: the old test pinned the "wording pending" placeholder because the event's SI rule was unknown.
  // The Project Submission Guide (13 Nov 2026, p. 9) now states the rule, so the page carries the real acknowledgment.
  it('carries the SI acknowledgment, factual and without any claim about who had the idea', () => {
    expect(html).toContain('id="si-disclosure"');
    expect(html).toContain('Built with SI assistance (Claude, Anthropic)');
    expect(html).toMatch(/<meta name="si-disclosure" content="[^"]*Claude/);
    expect(html).not.toContain('wording pending');
    expect(html).toContain('does not say who originated the idea');
    expect(html).not.toMatch(/\b(the idea was|our idea|my idea|idea came from|the AI (suggested|proposed|invented|came up)|Claude (suggested|proposed|invented|came up|had the idea))/i);
  });
  it('is a real page: language, title, one h1, a way back to the game', () => {
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain('href="./"');
  });
  it('links only with https (no mixed content)', () => {
    for (const m of html.matchAll(/href="(http[^"]+)"/g)) expect(m[1]).toMatch(/^https:\/\//);
  });
});
