// Release hygiene: the version, the changelog, the known-issues file and the README must agree and stay present.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json')) as { version: string; scripts: Record<string, string> };

describe('release', () => {
  it('the changelog has an entry for the version in package.json, in a tag-ready form', () => {
    const log = read('CHANGELOG.md');
    expect(log).toContain(`## [${pkg.version}]`);
    expect(log).toContain('## [Unreleased]');
    expect(log).toMatch(/Not in this release/);
  });
  it('KNOWN_ISSUES.md is honest about what is untested and unbuilt', () => {
    const k = read('KNOWN_ISSUES.md');
    for (const s of ['## Not tested', '## Not built', 'Firefox', 'Real players', 'antenna-alignment']) expect(k, s).toContain(s);
  });
  it('the README documents each release command, and each documented file exists', () => {
    const r = read('README.md');
    for (const cmd of ['npm run audit:all', 'npm run package:offline', 'npm run screenshots']) expect(r, cmd).toContain(cmd);
    for (const f of ['CHANGELOG.md', 'KNOWN_ISSUES.md', 'docs/offline.md', 'docs/cross-browser.md', 'docs/judge-review.md', 'docs/submission.md']) {
      expect(r, f).toContain(f);
      expect(existsSync(f), `${f} must exist`).toBe(true);
    }
  });
  it('the package scripts the docs mention are real', () => {
    for (const s of ['audit:all', 'package:offline', 'screenshots', 'check', 'build', 'build:pages']) expect(pkg.scripts[s], s).toBeTruthy();
  });
});
