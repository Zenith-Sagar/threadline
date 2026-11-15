// PHASE 9: this is the OPTIONAL 2-minute walkthrough kit. The official demo is 30 seconds or less (Project Submission Guide, 13 Nov 2026),
// so the kit is marked "not the official demo" and the tests below still keep it internally consistent (they pin 2:00 on purpose: it is
// the walkthrough's own length). The official demo's tests are in tests/docs/demo.test.ts.
// The video kit must match the video script exactly: captions say what the voice-over says, in time, at a readable
// pace; the shot list quotes only real buttons; the checklist keeps its "what NOT to claim" rules.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8');
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const SOURCE = walk('src').filter((f) => f.endsWith('.ts')).map(read).join('\n');

interface Cue { n: number; start: number; end: number; lines: string[] }
const toS = (h: string, m: string, s: string, ms: string): number => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
function parseSrt(text: string): Cue[] {
  return text.trim().split(/\n\s*\n/).map((block) => {
    const [n, time, ...lines] = block.split('\n');
    const m = /^(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})$/.exec(time ?? '');
    if (!m) throw new Error(`bad timing line: ${String(time)}`);
    return { n: Number(n), start: toS(m[1]!, m[2]!, m[3]!, m[4]!), end: toS(m[5]!, m[6]!, m[7]!, m[8]!), lines };
  });
}
interface Row { start: number; end: number; vo: string }
function parseRows(text: string): Row[] {
  return [...text.matchAll(/^\| (\d):(\d{2})-(\d):(\d{2}) \| .*? \| "(.*)" \|$/gm)].map((m) => ({
    start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]), vo: m[5] as string,
  }));
}
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const words = (s: string): number => (s.match(/[A-Za-z0-9'’-]+/g) ?? []).length;

const BANNER = /Optional long walkthrough, NOT the official demo \(limit 30 s\)/;
describe('the 2-minute kit is marked as optional, not the official demo (Phase 9)', () => {
  it('every file of the kit says so and points to docs/demo/', () => {
    for (const f of ['docs/video-script.md', 'docs/video/shot-list.md', 'docs/video/recording-checklist.md', 'docs/video/README.md']) {
      const t = read(f);
      expect(t, f).toMatch(BANNER);
      expect(t, f).toContain('docs/demo/');
    }
  });
});

describe('captions.srt (2-minute walkthrough)', () => {
  const cues = parseSrt(read('docs/video/captions.srt'));
  const rows = parseRows(read('docs/video-script.md'));
  it('is well formed: numbered in order, times increasing, no overlap, ends within two minutes', () => {
    expect(cues.map((c) => c.n)).toEqual(cues.map((_, i) => i + 1));
    for (const c of cues) expect(c.end).toBeGreaterThan(c.start);
    for (let i = 1; i < cues.length; i++) expect(cues[i]!.start).toBeGreaterThanOrEqual(cues[i - 1]!.end);
    expect(cues.at(-1)!.end).toBeLessThanOrEqual(120);
  });
  it('follows the house caption rules: at most 2 lines of 42 characters, 1 to 7 seconds, 20 characters per second', () => {
    for (const c of cues) {
      expect(c.lines.length, `cue ${c.n}`).toBeLessThanOrEqual(2);
      for (const l of c.lines) expect(l.length, `cue ${c.n}: ${l}`).toBeLessThanOrEqual(42);
      const d = c.end - c.start;
      expect(d, `cue ${c.n} duration`).toBeGreaterThanOrEqual(1);
      expect(d, `cue ${c.n} duration`).toBeLessThanOrEqual(7);
      expect(c.lines.join(' ').length / d, `cue ${c.n} reading speed`).toBeLessThanOrEqual(20);
    }
  });
  it('says exactly what the voice-over says: the cues inside each script row spell out that row, word for word', () => {
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      const inside = cues.filter((c) => c.start >= r.start && c.end <= r.end);
      expect(norm(inside.map((c) => c.lines.join(' ')).join(' ')), `row ${r.start}-${r.end}`).toBe(norm(r.vo));
    }
    // and no cue straddles two rows or sits outside every row
    for (const c of cues) expect(rows.some((r) => c.start >= r.start && c.end <= r.end), `cue ${c.n} must sit inside one row`).toBe(true);
  });
});

describe('walkthrough script pace', () => {
  it('no row needs more than 2.5 spoken words per second', () => {
    for (const r of parseRows(read('docs/video-script.md'))) expect(words(r.vo) / (r.end - r.start), `row ${r.start}-${r.end}`).toBeLessThanOrEqual(2.5);
  });
});

describe('shot list', () => {
  const doc = read('docs/video/shot-list.md');
  it('quotes only labels that exist in the interface', () => {
    const bold = [...doc.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1] as string);
    const notButtons = new Set(['Two ways to get the Design Bay.', 'Demo', 'Standard mission', 'Optional long walkthrough, NOT the official demo (limit 30 s).']); // headings, a badge, a variant name, the Phase 9 banner
    for (const b of bold.filter((x) => !notButtons.has(x))) {
      const label = b.replace(/^Choose: /, '');
      // A label built at run time ("Switch off the " + the biggest power user's name) cannot be found as one literal string:
      // check the template and the instrument name separately.
      const templated = /^Switch off the (.+)$/.exec(label);
      const dynamicOk = templated !== null && SOURCE.includes('Switch off the ') && SOURCE.includes(templated[1] as string);
      expect(SOURCE.includes(label) || dynamicOk || /^(Option [AB])/.test(label) || /^\d+$/.test(label), `"${b}" must exist in src`).toBe(true);
    }
    expect(bold.length).toBeGreaterThan(15);
  });
  it('uses the demo seed and covers all eight script rows in order', () => {
    expect(doc).toContain('Seed **29**');
    const rows = [...doc.matchAll(/^\| (\d) \| (\d:\d{2})-(\d:\d{2}) \|/gm)];
    expect(rows.map((m) => Number(m[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rows.at(-1)?.[3]).toBe('2:00');
  });
});

describe('recording checklist', () => {
  const doc = read('docs/video/recording-checklist.md');
  it('states the capture settings and the rules about what not to claim', () => {
    for (const t of ['1280 x 720', '100%', 'Reset progress', '?seed=29', '?demo=1', 'What NOT to claim', 'not affiliated with NASA', 'Firefox, Safari, phones', 'simulator', 'accessibility standard']) expect(doc, t).toContain(t);
  });
  it('states the verified official limits (30 s / 7 slides, English, under-18 rule, public link, SI watermark) instead of the old "not known yet" placeholder', () => {
    expect(doc).not.toMatch(/\[CHECK the official submission page/);
    for (const t of ['30 s or less', '7 slides', 'English', 'under 18', 'public link', 'visible watermark', 'docs/demo/demo-30s.md']) expect(doc, t).toContain(t);
  });
  it('is one page (60 lines or fewer)', () => {
    expect(doc.split('\n').length).toBeLessThanOrEqual(60);
  });
});

describe('the shot list is accurate about what `npm run screenshots` covers (Phase 7)', () => {
  const list = readFileSync('docs/video/shot-list.md', 'utf8');
  const script = readFileSync('scripts/screenshots.py', 'utf8');
  it('the script writes exactly the five images the shot list says it replays', () => {
    const written = [...script.matchAll(/shot\(pg, "([^"]+\.png)"\)/g)].map((m) => m[1]);
    expect(written).toHaveLength(5);
    expect(list).toMatch(/replays five of these shots/);
    expect(list).toMatch(/shots 1, 3, 5, 6 and 7/);
    expect(list).toMatch(/does not cover shots 2, 4 or 8/);
  });
  it('the shot list has eight numbered shots and refers to none above 8', () => {
    const rows = [...list.matchAll(/^\| (\d+) \| \d:\d{2}-\d:\d{2} \|/gm)].map((m) => Number(m[1]));
    expect(rows).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const m of list.matchAll(/[Ss]hots? (\d+)/g)) expect(Number(m[1])).toBeLessThanOrEqual(8);
  });
});

