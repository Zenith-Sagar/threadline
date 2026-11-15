// @vitest-environment happy-dom
// Space Apps 2026 Project Submission Guide (13 Nov 2026, p. 9): SI use is allowed, must not be used to come up with the idea, and
// audio, code and data must be acknowledged in descriptive text AND metadata; no NASA logos or branding in generated content.
// This test checks that the acknowledgment appears in every place the project promises, and that none of them says who had the idea.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { createGameStore } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { mountApp } from '@/ui/app';
import { destroyCards } from '@/ui/cards';

const read = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const LINE = 'Built with SI assistance (Claude, Anthropic)';
const ORIGIN_CLAIM = /\b(the idea was|our idea|my idea|idea came from|the AI (suggested|proposed|invented|came up)|Claude (suggested|proposed|invented|came up|had the idea))/i;

describe('SI acknowledgment: descriptive text', () => {
  const places: [string, string][] = [
    ['README.md', 'README.md'],
    ['SI_DISCLOSURE.md', 'SI_DISCLOSURE.md'],
    ['public/attributions.html', 'public/attributions.html'],
    ['docs/submission-form.md', 'docs/submission-form.md'],
    ['docs/submission.md', 'docs/submission.md'],
  ];
  for (const [label, path] of places) {
    it(`${label} carries the line and makes no claim about the idea`, () => {
      const text = read(path);
      expect(text).toContain(LINE);
      expect(text).not.toMatch(ORIGIN_CLAIM);
    });
  }
  it('the README has the section, and SI_DISCLOSURE.md covers every category the guide names', () => {
    expect(read('README.md')).toContain('## Use of Super Intelligence (SI)');
    const d = read('SI_DISCLOSURE.md');
    for (const c of ['Code', 'Tests and checks', 'Text', 'Images and slides', 'Audio', 'Data', 'NASA logos or branding']) expect(d, c).toContain(`| ${c} |`);
    expect(d).toContain('Who came up with the idea');
  });
  it('SI_DISCLOSURE.md names the tool and says it is not a team member', () => {
    const d = read('SI_DISCLOSURE.md');
    expect(d).toContain('Claude (Anthropic)');
    expect(d).toContain('is not a member of the team');
  });
});

describe('SI acknowledgment: metadata', () => {
  it('index.html has the meta tags', () => {
    const html = read('index.html');
    expect(html).toMatch(/<meta name="si-disclosure" content="[^"]*Built with SI assistance \(Claude, Anthropic\)/);
    expect(html).toMatch(/<meta name="description" content="[^"]*Built with SI assistance/);
  });
  it('the Attributions page has the meta tag too', () => {
    expect(read('public/attributions.html')).toMatch(/<meta name="si-disclosure" content="[^"]*Claude/);
  });
  it('the offline package ships SI_DISCLOSURE.md and LICENSE and says so in START-HERE.txt', () => {
    const src = read('scripts/package-offline.mjs');
    expect(src).toContain("['LICENSE', 'SI_DISCLOSURE.md']");
    expect(src).toContain(LINE);
  });
});

describe('SI acknowledgment: visible in the game', () => {
  const fakeLaunch: MountLaunch = async (_c, _p, cb) => ({ skip: () => cb.onDone('skipped'), destroy: () => undefined });
  afterEach(() => { destroyCards(); document.body.innerHTML = ''; });
  it('the footer shows the line and links to the SI section of the Attributions page', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const unmount = mountApp(document.getElementById('app') as HTMLElement, createGameStore({ mission: M, newSeed: () => 1 }), { mountLaunch: fakeLaunch });
    const note = document.querySelector('[data-si="footer"]');
    expect(note?.textContent).toContain(LINE);
    const a = document.querySelector('a[data-link="si-disclosure"]');
    expect(a?.getAttribute('href')).toBe('attributions.html#si-disclosure');
    expect(a?.getAttribute('rel')).toContain('noopener');
    expect(a?.textContent).toContain('opens in a new tab');
    // the existing Attributions link stays first and unchanged
    expect(document.querySelector('a[data-link="attributions"]')?.getAttribute('href')).toBe('attributions.html');
    unmount();
  });
});
