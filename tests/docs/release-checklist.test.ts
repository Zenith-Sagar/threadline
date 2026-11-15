// RELEASE_CHECKLIST.md must stay one screen, cover every release item, carry the official deadline, never tick what only the owner can
// do, and match the licence that is actually in the repository. (Phase 9, deliberate change: the owner chose MIT and the official
// guides replaced the unknown event rules, so the old "list licence options, never choose" test is replaced.)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('RELEASE_CHECKLIST.md', 'utf8');

describe('RELEASE_CHECKLIST.md', () => {
  it('fits on one screen (45 lines or fewer)', () => {
    expect(doc.trimEnd().split('\n').length).toBeLessThanOrEqual(45);
  });
  it('covers every release item', () => {
    for (const item of ['Deployed URL loads', 'Demo works', 'Offline zip works', 'Screenshots current', 'Official demo ready',
      'Submission text complete', 'Licence', 'Known issues honest', 'Event rules checked', 'GitHub Pages', 'Submit for Judging', 'Tag']) {
      expect(doc, item).toContain(`**${item}**`);
    }
  });
  it('carries the official deadline', () => {
    expect(doc).toContain('Sunday 15 November 2026, 11:59 p.m.');
    expect(doc).toContain('Submit for Judging');
  });
  it('the licence row matches LICENSE and package.json (MIT, Sagar, 2026)', () => {
    const lic = readFileSync('LICENSE', 'utf8');
    expect(lic).toMatch(/^MIT License/);
    expect(lic).toContain('Copyright (c) 2026 Sagar');
    expect((JSON.parse(readFileSync('package.json', 'utf8')) as { license: string }).license).toBe('MIT');
    const row = doc.split('\n').find((l) => l.includes('**Licence**')) ?? '';
    expect(row).toContain('MIT, Copyright (c) 2026 Sagar');
  });
  it('does not tick anything it cannot know: undone items say NOT DONE', () => {
    for (const open of ['Deployed URL loads', 'Submission text complete', 'GitHub Pages', 'Submit for Judging', 'Tag']) {
      const row = doc.split('\n').find((l) => l.includes(`**${open}**`)) ?? '';
      expect(row, open).toContain('NOT DONE');
    }
    expect(doc.split('\n').find((l) => l.includes('**Event rules checked**'))).toContain('E4');
  });
  it('points at the documents it relies on', () => {
    for (const f of ['docs/offline.md', 'docs/demo/', 'docs/submission.md', 'KNOWN_ISSUES.md', 'CHANGELOG.md', 'docs/truth-ledger.md']) expect(doc, f).toContain(f);
  });
});
