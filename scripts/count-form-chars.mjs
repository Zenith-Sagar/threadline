#!/usr/bin/env node
// Keeps the "Characters:" line of every field in docs/submission-form.md true.
//
//   node scripts/count-form-chars.mjs          rewrite the counts
//   node scripts/count-form-chars.mjs --check  exit 1 if a count is stale (tests/docs/submission-form.test.ts does the same check)
//
// A field is the fenced ```text block under a "## N. Field name" heading. The count is the number of characters in the block,
// exactly as you would paste it (a line break counts as one). A block that still contains an "[OWNER:" placeholder is marked
// "provisional": its count will change when you fill the placeholder in, so run this script again afterwards.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'docs/submission-form.md';
const check = process.argv.includes('--check');
const src = readFileSync(FILE, 'utf8');

export function label(block) {
  const n = block.length;
  return block.includes('[OWNER:') ? `**Characters: ${n} (provisional: it still contains [OWNER: ...] placeholders)**` : `**Characters: ${n}**`;
}

const re = /(\*\*Characters: [^\n]*\*\*)(\n\n```text\n)([\s\S]*?)(\n```)/g;
let stale = 0;
const out = src.replace(re, (_m, line, open, block, close) => {
  const fresh = label(block);
  if (fresh !== line) stale++;
  return fresh + open + block + close;
});

if (check) {
  if (stale) { console.error(`${stale} stale character count(s) in ${FILE}: run node scripts/count-form-chars.mjs`); process.exit(1); }
  console.log('character counts are current');
} else {
  writeFileSync(FILE, out);
  console.log(`${FILE}: ${[...out.matchAll(re)].length} fields counted, ${stale} updated`);
}
