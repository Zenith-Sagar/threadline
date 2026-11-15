// Slice A: deploy config. These tests read the config files so a careless edit cannot silently break the deploy.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import config from '../../vite.config';

const root = join(__dirname, '..', '..');
const read = (p: string): string => readFileSync(join(root, p), 'utf8');

describe('vite config', () => {
  it('ships no source maps in the production bundle', () => {
    expect(config.build?.sourcemap).toBe(false);
  });
  it('keeps the default base "/" (a sub-path is passed on the command line, never hard-coded)', () => {
    expect(config.base).toBeUndefined();
  });
});

describe('npm scripts', () => {
  const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
  it('build runs the type check, the production build and the post-build step', () => {
    expect(scripts['build']).toContain('typecheck');
    expect(scripts['build']).toContain('vite build');
    expect(scripts['build']).toContain('scripts/postbuild.mjs');
  });
  it('build:pages passes a base path, preview:pages serves under the same one', () => {
    expect(scripts['build:pages']).toMatch(/--base=\/threadline\//);
    expect(scripts['preview:pages']).toMatch(/--base=\/threadline\//);
  });
});

describe('CI workflow', () => {
  const yml = read('.github/workflows/ci.yml');
  it('runs npm run check, then a production build with the repository name as base path', () => {
    expect(yml).toContain('npm run check');
    expect(yml).toMatch(/vite build --base=\/\$\{\{ github\.event\.repository\.name \}\}\//);
    expect(yml).toContain('scripts/postbuild.mjs');
  });
  it('deploys only from a push to main, after the check and build', () => {
    expect(yml).toMatch(/if: github\.ref == 'refs\/heads\/main' && github\.event_name == 'push'/);
    expect(yml).toMatch(/deploy:[\s\S]*needs: build/);
    expect(yml).toMatch(/build:[\s\S]*needs: check/);
  });
  it('admits that the action versions are unverified', () => {
    expect(yml).toContain('UNVERIFIED');
  });
});

describe('scripts/postbuild.mjs', () => {
  const dirs: string[] = [];
  afterEach(() => { while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true }); });
  const makeDist = (files: Record<string, string>): string => {
    const dir = mkdtempSync(join(tmpdir(), 'threadline-dist-'));
    dirs.push(dir);
    mkdirSync(join(dir, 'assets'));
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    return dir;
  };
  const run = (dir: string) => spawnSync('node', [join(root, 'scripts', 'postbuild.mjs'), dir], { encoding: 'utf8' });

  it('writes 404.html (a copy of index.html) and .nojekyll', () => {
    const dir = makeDist({ 'index.html': '<html>app</html>', 'assets/a.js': 'x' });
    const r = run(dir);
    expect(r.status).toBe(0);
    expect(readFileSync(join(dir, '404.html'), 'utf8')).toBe('<html>app</html>');
    expect(existsSync(join(dir, '.nojekyll'))).toBe(true);
  });
  it('fails the build when a source map slipped in', () => {
    const dir = makeDist({ 'index.html': 'x', 'assets/a.js.map': '{}' });
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('source maps must not ship');
  });
  it('fails with a clear message when there is no build', () => {
    const dir = makeDist({});
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('index.html not found');
  });
});
