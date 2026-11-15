// docs/submission-form.md is what the owner pastes into the official form. These tests keep it true: the fields are the official
// ones in the official order, the character counts are current, every shipped and build/test dependency is listed at its INSTALLED
// version and licence, the NASA values equal the game's data file, and nothing claims who had the idea or what the AI wrote.
// The owner is expected to edit this file (fill the [OWNER: ...] placeholders), so no test pins the placeholders' presence, only
// that the counts stay current (run `node scripts/count-form-chars.mjs` after editing).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import moon from '@/data/snapshots/moon-facts.json';

const read = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const doc = read('docs/submission-form.md');

// Official field names and order: Project Submission Guide (13 Nov 2026), "Project Page Form Field Instructions", pp. 7-10.
const FIELDS = [
  'Project Name',
  'High-Level Project Summary',
  'Link to Project Demo',
  'Link to Final Project',
  'Detailed Project Description',
  'Use of Super Intelligence (SI)',
  'NASA Data',
  'Space Agency Partner Data and Other References',
];

interface Field { n: number; name: string; label: string; block: string }
const fields: Field[] = [...doc.matchAll(/^## (\d+)\. (.+)\n[\s\S]*?(\*\*Characters: [^\n]*\*\*)\n\n```text\n([\s\S]*?)\n```/gm)].map((m) => ({
  n: Number(m[1]), name: m[2] as string, label: m[3] as string, block: m[4] as string,
}));
const field = (n: number): Field => fields.find((f) => f.n === n)!;
const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string>; license?: string };
const installed = (name: string): { version: string; license: string } => JSON.parse(read(join('node_modules', name, 'package.json')));

describe('the eight official fields', () => {
  it('are all present, in the official order, with the official names', () => {
    expect(fields.map((f) => f.name)).toEqual(FIELDS);
    expect(fields.map((f) => f.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('have a character count that is current (run: node scripts/count-form-chars.mjs)', () => {
    for (const f of fields) {
      const want = f.block.includes('[OWNER:')
        ? `**Characters: ${f.block.length} (provisional: it still contains [OWNER: ...] placeholders)**`
        : `**Characters: ${f.block.length}**`;
      expect(f.label, `field ${f.n} ${f.name}`).toBe(want);
    }
  });
  it('are plain ASCII, so the count means the same in every editor and the form', () => {
    for (const f of fields) expect(/[^\t\n -~]/.test(f.block), `field ${f.n} has a non-ASCII character`).toBe(false);
  });
  it('contain no markdown the form would show literally (no ** or backticks or headings)', () => {
    for (const f of fields) {
      expect(f.block, `field ${f.n}`).not.toMatch(/\*\*|`|^#{1,6} /m);
    }
  });
});

describe('field 2 and 5: the summary and the detailed description', () => {
  it('the summary names the challenge and the three label kinds, and says it is a game model', () => {
    const s = field(2).block;
    for (const t of ['Space Mission Design Game', 'NASA DATA', 'SIMPLIFIED PHYSICS', 'GAME MODEL', 'not a simulator']) expect(s, t).toContain(t);
  });
  it('the description answers the five official questions and lists tools, languages and versions', () => {
    const d = field(5).block;
    for (const h of ['WHAT IT DOES', 'HOW IT WORKS', 'BENEFITS', 'WHAT WE HOPE TO ACHIEVE', 'TOOLS, LANGUAGES, HARDWARE']) expect(d, h).toContain(h);
    for (const name of ['phaser', 'zustand', 'typescript', 'vite', 'vitest', 'eslint', 'happy-dom']) {
      expect(d, name).toContain(`${name === 'typescript' ? 'TypeScript' : name === 'vite' ? 'Vite' : name === 'vitest' ? 'Vitest' : name === 'eslint' ? 'ESLint' : name === 'phaser' ? 'Phaser' : name} ${installed(name).version}`);
    }
  });
  it('states the limits honestly: Chromium only, no stranger test, and the features that are not built', () => {
    const d = field(5).block;
    expect(d).toContain('Chromium only');
    expect(d).toContain('no stranger has played it yet');
    for (const t of ['team play', 'orbit options', 'objective definition', 'a sandbox', 'leaderboards']) expect(d, t).toContain(t);
  });
});

describe('field 3 and 4: the links', () => {
  it('the demo link points at the PDF in docs/demo/ of the public repository, and that file exists', () => {
    expect(field(3).block).toMatch(/\/blob\/main\/docs\/demo\/threadline-demo-7slides\.pdf/);
    expect(existsSync('docs/demo/threadline-demo-7slides.pdf')).toBe(true);
  });
  it('the final-project link is the GitHub Pages address or a placeholder for it', () => {
    expect(field(4).block).toMatch(/github\.io\/threadline\/|\[OWNER:/);
  });
});

describe('field 6: Use of Super Intelligence (SI)', () => {
  const si = field(6).block;
  it('says Claude (Anthropic) was used and how, factually', () => {
    for (const t of ['Claude', 'Anthropic', 'wrote most of the game\'s code', 'tests', 'documentation', 'verified by running']) expect(si, t).toContain(t);
  });
  it('lists where the acknowledgment appears and states the visible watermark line', () => {
    for (const t of ['README', 'SI_DISCLOSURE.md', 'Attributions', 'meta tag', 'footer', 'Built with SI assistance (Claude, Anthropic)']) expect(si, t).toContain(t);
  });
  it('leaves the idea and the mission concept to the owner: it asks who, and never answers for them', () => {
    expect(si).toContain('Who came up with the idea of how to solve the challenge:');
    expect(si).toContain('Who came up with the mission concept');
    // the pre-written, factual part must not claim an origin
    const factual = si.split('\n').filter((l) => !/^Who came up with/.test(l)).join('\n');
    expect(factual).not.toMatch(/\b(the idea was|our idea|my idea|idea came from|the AI (suggested|proposed|invented|came up)|Claude (suggested|proposed|invented|came up|had the idea))/i);
  });
  it('says no NASA branding was used or generated, and that there is no SI-generated audio', () => {
    expect(si).toContain('No NASA logos or branding');
    expect(si).toContain('no SI-generated audio');
  });
});

describe('field 7: NASA Data', () => {
  const nd = field(7).block;
  it('cites the Moon Fact Sheet page and the three values exactly as the game uses them', () => {
    expect(nd).toContain('https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html');
    expect(nd).toContain(String(moon.values.volumetricMeanRadiusKm));
    expect(moon.values.gmE6Km3S2).toBe(0.0049);
    expect(nd).toContain('0.00490');
    expect(nd).toContain(String(moon.values.semimajorAxisE6Km));
  });
  it('says where each value is used, what is computed, and what is GAME MODEL instead', () => {
    for (const t of ['Volumetric mean radius', 'Gravitational parameter', 'Mean Earth-Moon distance', 'display only', 'SIMPLIFIED PHYSICS', 'GAME MODEL, not NASA data', 'not affiliated with or endorsed by NASA']) expect(nd, t).toContain(t);
  });
});

describe('field 8: references (every external item)', () => {
  const refs = field(8).block;
  const shipped = Object.keys(pkg.dependencies);
  it('lists every shipped dependency, and Phaser\'s runtime dependency, at the installed version with its licence', () => {
    for (const name of [...shipped, 'eventemitter3']) {
      const m = installed(name);
      expect(refs, name).toContain(`${name} ${m.version}, ${m.license}`);
    }
  });
  it('lists every build/test dependency at the installed version with its licence', () => {
    for (const name of Object.keys(pkg.devDependencies)) {
      const m = installed(name);
      expect(refs, name).toContain(`${name} ${m.version}, ${m.license}`);
    }
  });
  it('states how many other packages package-lock.json adds, and that number is right', () => {
    const lock = JSON.parse(read('package-lock.json')) as { packages: Record<string, unknown> };
    const total = Object.keys(lock.packages).filter((k) => k !== '').length;
    const named = Object.keys(pkg.dependencies).length + Object.keys(pkg.devDependencies).length + 1; // + eventemitter3
    expect(refs).toContain(`${total - named} further packages`);
  });
  it('lists the Moon Fact Sheet and all nine Science Card sources (the links on the Attributions page)', () => {
    const page = read('public/attributions.html');
    const section = page.slice(page.indexOf('Sources behind the Science Cards'), page.indexOf('<h2>Software</h2>'));
    const urls = [...section.matchAll(/href="([^"]+)"/g)].map((m) => m[1] as string);
    expect(urls).toHaveLength(9);
    for (const u of urls) expect(refs, u).toContain(u);
    expect(refs).toContain('https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html');
  });
  it('covers code, text, images, fonts, audio, the Resources tab and the partner-data question', () => {
    for (const t of ['SPACE AGENCY PARTNER DATA', 'CODE', 'TEXT', 'IMAGES', 'FONTS, AUDIO, VIDEO', 'CHALLENGE RESOURCES TAB', 'No NASA images, logos or branding']) expect(refs, t).toContain(t);
  });
  it('does not claim any Resources-tab item was used (only the owner can say so)', () => {
    const before = refs.slice(0, refs.indexOf('CHALLENGE RESOURCES TAB'));
    for (const t of ['GMAT', 'Mission Viz', 'Mission Design Lab', 'Concept Maturity', 'CubeSat 101', 'Learning Game About Telescopes']) expect(before, t).not.toContain(t);
  });
  it('names the MIT licence holder and year the project uses', () => {
    expect(refs).toContain('MIT licence (Copyright (c) 2026 Sagar)');
  });
});

describe('the checkboxes and the submission checklist', () => {
  it('leaves both official checkboxes for the owner to tick (unticked in the file)', () => {
    expect(doc).toMatch(/- \[ \] I have read and agree to the terms/);
    expect(doc).toMatch(/- \[ \] The project is our team's original work/);
  });
  it('the checklist covers the public-link test, image limits, both checkboxes, "Submit for Judging" and the deadline', () => {
    const list = doc.slice(doc.indexOf('## Submission checklist'));
    for (const t of ['private window', 'JPG, PNG or GIF up to 10 MB', 'Both checkboxes ticked', 'Submit for Judging', 'Sunday 15 November 2026, 11:59 p.m.', 'Universal', 'at least 2']) expect(list, t).toContain(t);
  });
  it('names Sagar as the only team member and says the AI is not a member', () => {
    expect(doc).toContain('the only team member is **Sagar**');
    expect(doc).toContain('The AI is not a team member and is not listed as one');
  });
});
