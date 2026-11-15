#!/usr/bin/env node
// One command, one verdict:  npm run audit:all   (add --no-browser to run only the unit stage)
// Stages: unit tests (typecheck + lint + tests) -> browser audits on the default build -> deploy-path audit on the
// /threadline/ build -> offline package smoke audit. Exit code 0 only if every stage passed.
// Browser stages need Python 3 with Playwright and Chromium (see README). Logs are written to audit-logs/.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatTable, parseChecks, parseVitest } from './lib/audit-summary.mjs';

const noBrowser = process.argv.includes('--no-browser');
const rows = [];
mkdirSync('audit-logs', { recursive: true });
const shell = process.platform === 'win32';
const t0 = () => Date.now();
const secs = (t) => `${((Date.now() - t) / 1000).toFixed(0)}s`;

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: { ...process.env, ...env }, shell, maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
function record(name, ok, detail, log) {
  if (log !== undefined) writeFileSync(join('audit-logs', `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.log`), log);
  rows.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
}
async function waitFor(url, ms = 25000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).status < 500) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
function startServer(cmd, args) {
  const child = spawn(cmd, args, { stdio: 'ignore', shell, detached: process.platform !== 'win32' });
  return () => {
    try {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else process.kill(-child.pid, 'SIGTERM');
    } catch { /* already gone */ }
  };
}
function pythonAudit(name, script, base) {
  const t = t0();
  const r = run('python3', [script], { BASE_URL: base });
  const sum = parseChecks(r.out);
  record(name, r.ok && sum !== null && sum.passed === sum.total, sum ? `${sum.passed}/${sum.total} checks, ${secs(t)}` : `no summary line, ${secs(t)}`, r.out);
}

// ---- Stage 1: unit tests -------------------------------------------------------------------------------------------
{
  const t = t0();
  const r = run('npm', ['run', 'check']);
  const v = parseVitest(r.out);
  // No test summary means typecheck or lint failed first (tests never ran): say so and show the first complaint.
  const firstProblem = r.out.split('\n').find((l) => /error|✖/i.test(l))?.trim().slice(0, 110) ?? 'see audit-logs/';
  record('Unit stage: typecheck + lint + tests', r.ok && v !== null && v.failed === 0,
    v ? `${v.passed}/${v.total} tests${v.failed ? `, ${v.failed} FAILED` : ''}, ${secs(t)}` : `typecheck or lint failed before the tests ran: ${firstProblem}`, r.out);
}

if (noBrowser) {
  rows.push({ name: 'Browser stages', ok: false, skipped: true, detail: 'skipped (--no-browser)' });
} else {
  const py = run('python3', ['-c', 'import playwright; print("ok")']);
  if (!py.ok) {
    record('Browser stages', false, 'Python 3 with Playwright is not installed (pip install playwright && playwright install chromium)', py.out);
  } else {
    // ---- Stage 2: default build, three audits -------------------------------------------------------------------
    let b = run('npm', ['run', 'build']);
    record('Build (default path)', b.ok, b.ok ? 'ok' : 'build failed', b.out);
    if (b.ok) {
      const stop = startServer('npx', ['vite', 'preview', '--port', '4173']);
      if (await waitFor('http://localhost:4173/')) {
        pythonAudit('Browser audit: phases 1-3 (flow, a11y, mobile)', 'scripts/browser-audit.py', 'http://localhost:4173');
        pythonAudit('Browser audit: phase 4 (guide, demo, cards, save, 390 px)', 'scripts/browser-audit-phase4.py', 'http://localhost:4173');
        pythonAudit('Browser audit: phase 6 (review fixes, robustness)', 'scripts/browser-audit-phase6.py', 'http://localhost:4173');
      } else record('Preview server (default path)', false, 'did not start on port 4173');
      stop();
    }
    // ---- Stage 3: GitHub Pages path -----------------------------------------------------------------------------
    b = run('npm', ['run', 'build:pages']);
    record('Build (/threadline/ path)', b.ok, b.ok ? 'ok' : 'build failed', b.out);
    if (b.ok) {
      const stop = startServer('npx', ['vite', 'preview', '--base=/threadline/', '--port', '4173']);
      if (await waitFor('http://localhost:4173/threadline/')) pythonAudit('Browser audit: phase 5 (deploy path, variants, share)', 'scripts/browser-audit-phase5.py', 'http://localhost:4173/threadline');
      else record('Preview server (/threadline/ path)', false, 'did not start on port 4173');
      stop();
    }
    // ---- Stage 4: the offline package, extracted to a fresh folder ----------------------------------------------
    const p = run('npm', ['run', 'package:offline']);
    record('Offline package builds', p.ok, p.ok ? 'release/threadline-offline.zip' : 'failed', p.out);
    if (p.ok) {
      const dir = mkdtempSync(join(tmpdir(), 'threadline-offline-'));
      const x = run('python3', ['-m', 'zipfile', '-e', 'release/threadline-offline.zip', dir]);
      if (x.ok) {
        const stop = startServer('node', [join(dir, 'threadline-offline', 'serve.mjs'), '4180']);
        if (await waitFor('http://127.0.0.1:4180/')) pythonAudit('Offline package smoke audit (fresh unzip, no internet)', 'scripts/browser-audit-offline.py', 'http://127.0.0.1:4180');
        else record('Offline server', false, 'did not start on port 4180');
        stop();
      } else record('Offline package unzip', false, 'failed', x.out);
    }
    run('npm', ['run', 'build']); // leave dist/ built for the default path
  }
}
console.log(`\n${formatTable(rows)}`);
process.exit(rows.every((r) => r.ok || r.skipped) ? 0 : 1);
