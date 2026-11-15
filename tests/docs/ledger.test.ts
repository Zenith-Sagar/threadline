// The Truth Ledger is part of the product. These tests stop it from silently drifting away from the data and the rules.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import moon from '@/data/snapshots/moon-facts.json';

const ledger = readFileSync('docs/truth-ledger.md', 'utf8');
const section = (title: string): string => {
  const i = ledger.indexOf(title);
  expect(i, `missing section "${title}"`).toBeGreaterThanOrEqual(0);
  const next = ledger.indexOf('\n## ', i + title.length);
  return ledger.slice(i, next < 0 ? undefined : next);
};

describe('NASA data table matches the snapshot the game uses', () => {
  const t = section('## NASA data (snapshots)');
  const row = (id: string): string => {
    const m = new RegExp(`^\\| ${id} \\|.*$`, 'm').exec(t);
    expect(m, `ledger row ${id} is missing from the NASA data table`).not.toBeNull();
    return m?.[0] ?? '';
  };
  const v = moon.values;
  it('lists D1 to D5, all VERIFIED against the NSSDCA Moon fact sheet', () => {
    for (const id of ['D1', 'D2', 'D3', 'D4', 'D5']) {
      const r = row(id);
      expect(r).toMatch(/VERIFIED/);
      expect(r + t).toContain('nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html');
    }
  });
  it('the numbers in the ledger are the numbers in src/data/snapshots/moon-facts.json', () => {
    expect(row('D1')).toContain(String(v.volumetricMeanRadiusKm));
    expect(row('D2')).toContain('0.00490'); // the snapshot stores 0.0049 (x 10^6 km^3/s^2)
    expect(v.gmE6Km3S2).toBe(0.0049);
    expect(row('D3')).toContain(String(v.surfaceGravityMs2));
    expect(row('D3')).toContain(String(v.escapeVelocityKmS));
    expect(row('D4')).toContain('0.3844');
    expect(row('D4')).toContain('0.3633');
    expect(row('D4')).toContain('0.4055');
    expect([v.semimajorAxisE6Km, v.perigeeE6Km, v.apogeeE6Km]).toEqual([0.3844, 0.3633, 0.4055]);
    expect(row('D5')).toContain('1361.0');
    expect(row('D5')).toContain(String(v.revolutionPeriodDays));
    expect(row('D5')).toContain(String(v.synodicPeriodDays));
  });
});

describe('ledger hygiene', () => {
  it('no table repeats an id (each table is a block of consecutive rows)', () => {
    const blocks = ledger.split(/\n\s*\n/);
    for (const b of blocks) {
      const ids = [...b.matchAll(/^\| ([A-Z]+\d+) \|/gm)].map((m) => m[1]);
      expect(new Set(ids).size, `duplicate ids in a table: ${ids.join(', ')}`).toBe(ids.length);
    }
  });
  it('every ledger id is unique across the WHOLE file (a reference such as "C1" must mean one thing)', () => {
    const ids = [...ledger.matchAll(/^\| ([A-Z]+\d+) \|/gm)].map((m) => m[1] as string);
    const dupes = ids.filter((id, n) => ids.indexOf(id) !== n);
    expect([...new Set(dupes)], `duplicate ledger ids: ${[...new Set(dupes)].join(', ')}`).toEqual([]);
  });
  it('the deploy items do not reuse the NASA-data ids (they are DP1 to DP6)', () => {
    const a = section('## Phase 5 additions');
    expect(a).toMatch(/^\| DP2 \|.*upload-pages-artifact@v4/m);
    expect(a).not.toMatch(/^\| D[1-6] \|/m);
  });
});

// Phase 9, deliberate addition: the event rules E2, E3, E5 and E7 were UNVERIFIED until the two official guides arrived.
describe('event rows E2 to E7 (checked against the official guides, 13 Nov 2026)', () => {
  const t = section('## Event and rules');
  const row = (id: string): string => new RegExp(`^\\| ${id} \\|.*$`, 'm').exec(t)?.[0] ?? '';
  it('E3, E5 and E7 are VERIFIED and cite the guide, its date and a page', () => {
    for (const id of ['E2', 'E3', 'E5', 'E7']) {
      const r = row(id);
      expect(r, id).toMatch(/\| VERIFIED/);
      expect(r, id).toContain('13 Nov 2026');
    }
    expect(row('E3')).toMatch(/p\. 3/);
    expect(row('E3')).toContain('at least two (2) people');
    expect(row('E3')).toContain('no more than six (6)');
    expect(row('E5')).toMatch(/pp\. 5-7/);
    for (const c of ['Impact', 'Creativity', 'Validity', 'Relevance', 'Presentation']) expect(row('E5'), c).toContain(c);
    expect(row('E7')).toMatch(/p\. 9/);
    expect(row('E7')).toContain('descriptive text and metadata');
  });
  it('E4 (pre-event coding) and E6 (theme name) stay UNVERIFIED, and E4 says what to look for', () => {
    expect(row('E4')).toMatch(/\| UNVERIFIED/);
    expect(row('E4')).toContain('Participant Terms');
    expect(row('E4')).toMatch(/before the event/);
    expect(row('E6')).toMatch(/\| UNVERIFIED/);
  });
  it('the Phase 9 rules E8 to E15 each name a page of an official guide', () => {
    const p9 = section('## Phase 9 additions');
    for (let n = 8; n <= 15; n++) {
      const r = new RegExp(`^\\| E${n} \\|.*$`, 'm').exec(p9)?.[0] ?? '';
      expect(r, `E${n}`).toMatch(/(Judging|Submission) Guide p+\. \d/);
    }
  });
});

describe('README "Honest limitations"', () => {
  const readme = readFileSync('README.md', 'utf8');
  const sec = readme.slice(readme.indexOf('## Honest limitations'), readme.indexOf('\n## ', readme.indexOf('## Honest limitations') + 5));
  it('exists, and names every group a human must check', () => {
    expect(readme).toContain('## Honest limitations');
    for (const token of ['E4 and E6', 'P1 to P4', 'K1 and K2', 'GAME MODEL', 'SIMPLIFIED PHYSICS', 'NASA DATA', 'Chromium only']) expect(sec, token).toContain(token);
  });
  it('fits on about one screen (60 lines or fewer)', () => {
    expect(sec.split('\n').length).toBeLessThanOrEqual(60);
  });
});
