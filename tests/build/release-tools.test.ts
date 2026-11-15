// The release tools: the offline server must never read outside its folder, and the audit runner must read
// the audits' summary lines correctly (a wrong parse would turn a failure into a pass).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Serve = { resolveRequest(root: string, url: string): string | null; MIME: Record<string, string> };
type Summary = {
  parseChecks(t: string): { passed: number; total: number } | null;
  parseVitest(t: string): { failed: number; passed: number; total: number } | null;
  formatTable(rows: { name: string; ok: boolean; skipped?: boolean; detail: string }[]): string;
};
const load = async <T>(p: string): Promise<T> => (await import(/* @vite-ignore */ resolve(p))) as T;

describe('offline server: path safety', async () => {
  const { resolveRequest, MIME } = await load<Serve>('scripts/serve.mjs');
  const root = mkdtempSync(join(tmpdir(), 'serve-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), 'x');
  writeFileSync(join(root, 'assets', 'a.js'), 'x');

  it('maps the root and folders to index.html and files to themselves', () => {
    expect(resolveRequest(root, '/')).toBe(join(root, 'index.html'));
    expect(resolveRequest(root, '/assets/a.js')).toBe(join(root, 'assets', 'a.js'));
    expect(resolveRequest(root, '/assets/a.js?v=1#x')).toBe(join(root, 'assets', 'a.js'));
  });
  it('refuses to leave the folder, however the ".." is written', () => {
    for (const bad of ['/../secret', '/..%2f..%2fsecret', '/%2e%2e/%2e%2e/etc/passwd', '/assets/../../x', '/..\\..\\x', '//../x', '/%00', '/%E0%A4%A']) {
      const r = resolveRequest(root, bad);
      expect(r === null || r.startsWith(root), `${bad} -> ${String(r)}`).toBe(true);
    }
    expect(resolveRequest(root, '/%00')).toBeNull();
    expect(resolveRequest(root, '/%E0%A4%A')).toBeNull(); // malformed escape
    expect(resolveRequest(root, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
  });
  it('knows the types the game needs (a wrong type blocks module scripts)', () => {
    expect(MIME['.js']).toMatch(/javascript/);
    expect(MIME['.css']).toMatch(/css/);
    expect(MIME['.html']).toMatch(/html/);
  });
});

describe('audit runner: reading summaries', async () => {
  const { parseChecks, parseVitest, formatTable } = await load<Summary>('scripts/lib/audit-summary.mjs');
  it('reads "N/M checks passed" and refuses anything else', () => {
    expect(parseChecks('x\n84/84 checks passed\n')).toEqual({ passed: 84, total: 84 });
    expect(parseChecks('41/43 checks passed')).toEqual({ passed: 41, total: 43 });
    expect(parseChecks('Traceback (most recent call last)')).toBeNull();
    expect(parseChecks('')).toBeNull();
  });
  it('reads the vitest summary, with and without failures and colour codes', () => {
    expect(parseVitest('      Tests  421 passed (421)')).toEqual({ failed: 0, passed: 421, total: 421 });
    expect(parseVitest('      Tests  2 failed | 419 passed (421)')).toEqual({ failed: 2, passed: 419, total: 421 });
    expect(parseVitest('\u001b[2m      Tests \u001b[22m \u001b[32m421 passed\u001b[39m\u001b[90m (421)\u001b[39m')).toEqual({ failed: 0, passed: 421, total: 421 });
    expect(parseVitest('nothing')).toBeNull();
  });
  it('the table says PASS, FAIL or SKIP and counts honestly', () => {
    const t = formatTable([{ name: 'a', ok: true, detail: '1/1' }, { name: 'b', ok: false, detail: 'x' }, { name: 'c', ok: false, skipped: true, detail: 'skipped' }]);
    expect(t).toMatch(/PASS {2}a/);
    expect(t).toMatch(/FAIL {2}b/);
    expect(t).toMatch(/SKIP {2}c/);
    expect(t).toContain('2 OF 3 STAGES DID NOT PASS');
    expect(formatTable([{ name: 'a', ok: true, detail: '' }])).toContain('ALL 1 STAGES PASSED');
  });
});

describe('generated folders stay out of lint and git', () => {
  const lint = readFileSync('eslint.config.js', 'utf8');
  const git = readFileSync('.gitignore', 'utf8').split('\n');
  it('lint ignores the offline package, audit logs and review artifacts (a built copy once produced 4,407 false errors)', () => {
    for (const d of ['release/**', 'audit-logs/**', 'review/**']) expect(lint).toContain(`'${d}'`);
  });
  it('git ignores them too', () => {
    for (const d of ['release', 'audit-logs', 'audit-shots', 'review/shots']) expect(git).toContain(d);
  });
});
