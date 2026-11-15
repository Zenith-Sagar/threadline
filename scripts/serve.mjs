#!/usr/bin/env node
// Zero-dependency static server for the OFFLINE package (and for any built copy of the game).
//
//   node serve.mjs                 serves ./app on http://127.0.0.1:8080  (the folder the offline zip contains)
//   node serve.mjs --root=dist     serves another folder
//   node serve.mjs 9000            another port (if the port is busy it tries the next ones)
//
// It listens on this computer only (127.0.0.1) and needs no internet and no npm install.
// A page opened straight from disk (file://) cannot load the game's scripts, which is why this server exists.
import { createServer } from 'node:http';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.map': 'application/json',
};

/**
 * Turn a request URL into a file path INSIDE root, or null if it is not allowed (path traversal, NUL bytes,
 * malformed escapes). Directories map to their index.html. Pure apart from checking the disk for directories.
 */
export function resolveRequest(root, rawUrl) {
  let path;
  try {
    path = decodeURIComponent(String(rawUrl).split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (path.includes('\0')) return null;
  const rootAbs = resolve(root);
  let file = normalize(join(rootAbs, path));
  if (file !== rootAbs && !file.startsWith(rootAbs + sep)) return null;
  try {
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    return null;
  }
  return file;
}

export function createStaticServer(root) {
  return createServer(async (req, res) => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...headers, Allow: 'GET, HEAD' }).end();
      return;
    }
    const file = resolveRequest(root, req.url ?? '/');
    if (file === null) {
      res.writeHead(400, headers).end('Bad request');
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { ...headers, 'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      // The game is one page: an unknown address shows the game (the same fallback GitHub Pages uses).
      try {
        const fallback = await readFile(join(resolve(root), '404.html'));
        res.writeHead(404, { ...headers, 'Content-Type': MIME['.html'] });
        res.end(req.method === 'HEAD' ? undefined : fallback);
      } catch {
        res.writeHead(404, headers).end('Not found');
      }
    }
  });
}

function listen(server, port, triesLeft) {
  return new Promise((ok, fail) => {
    server.once('error', (e) => (e.code === 'EADDRINUSE' && triesLeft > 0 ? ok(listen(server, port + 1, triesLeft - 1)) : fail(e)));
    server.listen(port, '127.0.0.1', () => ok(server.address().port));
  });
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootArg = args.find((a) => a.startsWith('--root='))?.slice(7);
  const portArg = args.find((a) => /^\d+$/.test(a));
  const root = resolve(rootArg ?? (existsSync(join(here, 'app')) ? join(here, 'app') : join(here, '..', 'dist')));
  if (!existsSync(join(root, 'index.html'))) {
    console.error(`No game found in ${root} (index.html is missing).`);
    process.exit(1);
  }
  const port = await listen(createStaticServer(root), Number(portArg ?? process.env.PORT ?? 8080), 20);
  console.log(`Threadline is running. Open  http://127.0.0.1:${port}/  in your browser.  (Press Ctrl+C to stop.)`);
}
