// Runs after `vite build`:
//   1. copies index.html to 404.html (GitHub Pages serves 404.html for unknown paths; the app is one page, so
//      the app itself is the right fallback, and its asset URLs already include the base path)
//   2. writes .nojekyll (Pages must not process the folder)
//   3. FAILS the build if any source map slipped into the bundle
// Usage: node scripts/postbuild.mjs [distDir]
import { copyFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
if (!existsSync(join(dist, 'index.html'))) {
  console.error(`postbuild: ${dist}/index.html not found. Run the build first.`);
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const maps = walk(dist).filter((f) => f.endsWith('.map'));
if (maps.length > 0) {
  console.error(`postbuild: source maps must not ship, found: ${maps.join(', ')}`);
  process.exit(1);
}

copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`postbuild: wrote ${dist}/404.html and ${dist}/.nojekyll (no source maps)`);
