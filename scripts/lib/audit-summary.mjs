// Parse the summary line every browser audit prints ("N/M checks passed"). Pure, unit-tested.
export function parseChecks(text) {
  const m = /(\d+)\s*\/\s*(\d+)\s+checks passed/.exec(String(text));
  return m ? { passed: Number(m[1]), total: Number(m[2]) } : null;
}
/** Vitest's own summary: "Tests  421 passed (421)" (and "N failed" when there are failures). */
export function parseVitest(text) {
  const plain = String(text).replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '');
  const m = /Tests\s+(?:(\d+) failed \| )?(\d+) passed(?: \| (\d+) skipped)? \((\d+)\)/.exec(plain);
  return m ? { failed: Number(m[1] ?? 0), passed: Number(m[2]), total: Number(m[4]) } : null;
}
export function formatTable(rows) {
  const w = Math.max(...rows.map((r) => r.name.length));
  const lines = rows.map((r) => `  ${r.ok ? 'PASS' : r.skipped ? 'SKIP' : 'FAIL'}  ${r.name.padEnd(w)}  ${r.detail}`);
  const bad = rows.filter((r) => !r.ok);
  return [...lines, '', bad.length === 0 ? `ALL ${rows.length} STAGES PASSED` : `${bad.length} OF ${rows.length} STAGES DID NOT PASS`].join('\n');
}
