// Licences cannot drift: this reads the INSTALLED packages (package.json "license" field and the LICENSE file) and
// checks that the attributions page names every shipped dependency, at its installed version, with its real
// copyright line and licence text. If a dependency is added or upgraded, this fails until the page is updated.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const page = read('public/attributions.html');
const pageText = page.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const direct = Object.keys((JSON.parse(read('package.json')) as { dependencies: Record<string, string> }).dependencies);
// Phaser depends on eventemitter3 at runtime, so it is shipped too (found in Phase 9; it was missing from the page). Every
// non-dev package in the lockfile is shipped, so the list is read from the lockfile and compared with what the test knows.
const lock = JSON.parse(read('package-lock.json')) as { packages: Record<string, { dev?: boolean }> };
const shipped = Object.entries(lock.packages).filter(([k, v]) => k && !v.dev).map(([k]) => k.replace(/^node_modules\//, ''));

function licenceFile(pkg: string): string {
  const dir = join('node_modules', pkg);
  const name = readdirSync(dir).find((f) => /^licen[sc]e(\.md|\.txt)?$/i.test(f));
  if (!name) throw new Error(`no LICENSE file in node_modules/${pkg}`);
  return read(join(dir, name));
}

describe('shipped dependencies and their licences', () => {
  it('the project ships exactly the dependencies this test knows about (add a new one here AND on the page)', () => {
    expect([...shipped].sort()).toEqual(['eventemitter3', 'phaser', 'zustand']);
    expect([...direct].sort()).toEqual(['phaser', 'zustand']);
  });

  for (const pkg of shipped) {
    const meta = JSON.parse(read(join('node_modules', pkg, 'package.json'))) as { version: string; license?: string };
    describe(pkg, () => {
      it('declares the MIT licence in its package.json', () => {
        expect(meta.license).toBe('MIT');
      });
      it('has a LICENSE file that is the MIT licence, with a copyright line', () => {
        const text = licenceFile(pkg);
        expect(text).toMatch(/MIT License/i);
        expect(text).toMatch(/Permission is hereby granted, free of charge/);
        expect(text).toMatch(/^Copyright \(c\) \d{4} .+/m);
      });
      it('is on the attributions page at its INSTALLED version, as MIT, with the real copyright line', () => {
        const copyright = /^Copyright \(c\) \d{4} .+/m.exec(licenceFile(pkg))?.[0] ?? '';
        expect(copyright).not.toBe('');
        expect(pageText).toContain(`${meta.version}`);
        expect(pageText.toLowerCase()).toContain(pkg);
        expect(pageText).toContain(copyright.trim());
        expect(pageText).toContain('Licence: MIT');
      });
      it('has its full licence text on the page (the MIT licence requires the notice to travel with the code)', () => {
        const body = licenceFile(pkg).split('\n').filter((l) => l.trim()).slice(-3).join(' ').replace(/\s+/g, ' ').trim();
        expect(pageText.replace(/\s+/g, ' ')).toContain(body);
      });
    });
  }

  it('the page no longer calls these licences unverified', () => {
    expect(page).not.toMatch(/Phaser[^<]*<span class="unverified">/);
    expect(page).not.toMatch(/zustand[^<]*<span class="unverified">/);
  });
});

describe('no bundled fonts', () => {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  it('there are no font files in public/ or src/', () => {
    const files = [...(existsSync('public') ? walk('public') : []), ...walk('src')];
    expect(files.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([]);
  });
  it('no stylesheet or page loads a web font (@font-face, or a font host)', () => {
    const sources = [read('index.html'), read('src/ui/styles.css'), page];
    for (const s of sources) {
      expect(s).not.toMatch(/@font-face/);
      expect(s).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
  });
});
