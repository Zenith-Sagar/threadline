#!/usr/bin/env node
// Build the OFFLINE package: the production build with relative URLs (works from any folder), the zero-dependency
// server, and a one-page START-HERE. Output: release/threadline-offline/ and release/threadline-offline.zip
//   npm run package:offline
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';

const out = 'release/threadline-offline';
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
rmSync('release', { recursive: true, force: true });
mkdirSync(out, { recursive: true });
run('npx', ['vite', 'build', '--base=./', '--outDir', `${out}/app`, '--emptyOutDir']);
run('node', ['scripts/postbuild.mjs', `${out}/app`]);
cpSync('scripts/serve.mjs', `${out}/serve.mjs`);
// The licence and the SI acknowledgment travel with the package (MIT requires the notice; the Space Apps rules want SI use stated).
for (const f of ['LICENSE', 'SI_DISCLOSURE.md']) cpSync(f, `${out}/${f}`);
writeFileSync(`${out}/START-HERE.txt`, `THREADLINE: offline copy
=========================
Independent project created for the NASA Space Apps Challenge. Not affiliated with or endorsed by NASA.
Built with SI assistance (Claude, Anthropic). See SI_DISCLOSURE.md in this folder. Licence: MIT (file LICENSE).

WHAT YOU NEED: a web browser (Chrome, Edge, Firefox or Safari) and ONE of: Node.js, or Python 3.
No internet. No install. No account.

START (pick one; open a terminal in THIS folder):
  1.  node serve.mjs                          then open  http://127.0.0.1:8080/
  2.  python3 -m http.server 8080 -d app      then open  http://127.0.0.1:8080/      (use "python" on Windows)

TRY THE 90-SECOND DEMO:   http://127.0.0.1:8080/?demo=1

WHAT WORKS WITH NO INTERNET: everything in the game: the demo, all four mission variants, the launch animation,
Mission Control, the outcome, Rewind, saved progress, share links (copying works on this computer address),
the Science Cards (their text and their source list).

WHAT NEEDS THE INTERNET: only the links that open the original NASA and other source pages (they are just links).

WHAT DOES NOT WORK: double-clicking app/index.html. Browsers block the game's scripts when a page is opened straight
from disk (file://). Use one of the two commands above.

IF THE PORT IS BUSY: node serve.mjs picks the next free port and prints the address. With Python, change 8080.
To stop: press Ctrl+C in the terminal.

HOW TO CHECK THIS COPY IS GOOD: open the address, press "Try the 90-second demo", press "Skip to the outcome".
You should see "Recovered".
`);
// Zip with Python's built-in zipfile (no extra tool needed). If python3 is missing, zip the folder with any tool.
const z = spawnSync('python3', ['-m', 'zipfile', '-c', 'release/threadline-offline.zip', out], { stdio: 'inherit' });
if (z.status !== 0) console.warn('Could not zip automatically; zip the folder', out, 'with any tool.');
else console.log(`package-offline: ${out}/ and release/threadline-offline.zip (${Math.round(statSync('release/threadline-offline.zip').size / 1024)} KB)`);
if (!existsSync(`${out}/app/index.html`)) process.exit(1);
