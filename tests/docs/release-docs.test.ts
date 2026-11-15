// Release documents stay consistent with the package and with each other.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json')) as { version: string; scripts: Record<string, string> };

describe('CHANGELOG', () => {
  const log = read('CHANGELOG.md');
  it('is tag-ready: the newest version equals package.json, in Keep a Changelog form', () => {
    const top = /^## \[(\d+\.\d+\.\d+)\] - (.+)$/m.exec(log);
    expect(top?.[1]).toBe(pkg.version);
    expect(log).toContain('keepachangelog.com');
    expect(log).toMatch(/### Added/);
    expect(log).toMatch(/### Fixed/);
  });
  it('carries either the YYYY-MM-DD placeholder or a real calendar date (never a made-up one), and the tag command', () => {
    const date = /^## \[\d+\.\d+\.\d+\] - (.+)$/m.exec(log)?.[1]?.trim() ?? '';
    if (date !== 'YYYY-MM-DD') {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(`${date}T00:00:00Z`);
      expect(Number.isNaN(d.getTime()), `${date} is not a real date`).toBe(false);
      expect(d.toISOString().slice(0, 10)).toBe(date);
    }
    expect(log).toContain('git tag -a');
  });
});

describe('KNOWN_ISSUES', () => {
  const issues = read('KNOWN_ISSUES.md');
  it('lists what was not tested, what a human must check, and what was not built', () => {
    for (const s of ['## Not tested', 'Firefox and Safari', 'Real first-time players', '## Needs a human', 'E4 and E6', 'P1 to P4', 'K1 and K2', '## Not built']) expect(issues, s).toContain(s);
  });
  it('is not claiming cross-browser support', () => {
    expect(issues).not.toMatch(/works in (Firefox|Safari)/i);
  });
});

describe('release scripts and docs exist and are wired', () => {
  it('has npm scripts for the release tools', () => {
    for (const s of ['audit:all', 'package:offline', 'screenshots', 'build:pages']) expect(pkg.scripts[s], s).toBeTruthy();
  });
  it('has the documents the README points to', () => {
    for (const f of ['docs/offline.md', 'docs/cross-browser.md', 'docs/judge-review.md', 'docs/submission.md', 'docs/demo-script.md', 'docs/video-script.md', 'docs/how-it-works.md', 'scripts/serve.mjs', 'scripts/audit-all.mjs']) expect(existsSync(f), f).toBe(true);
  });
  it('the README documents audit:all, the offline package and the screenshots', () => {
    const readme = read('README.md');
    for (const s of ['npm run audit:all', 'npm run package:offline', 'npm run screenshots', 'docs/offline.md', 'docs/cross-browser.md', 'KNOWN_ISSUES.md', 'CHANGELOG.md']) expect(readme, s).toContain(s);
  });
});
