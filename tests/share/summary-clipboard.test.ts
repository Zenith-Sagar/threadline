import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { DEMO_RESPONSE, DEMO_SEED, buildDemoDesign } from '@/core/demo';
import { copyText } from '@/share/clipboard';
import { buildSummary } from '@/share/summary';
import { findPauseOrbit, simulate } from '@/sim';

const design = buildDemoDesign(M);
const orbit = findPauseOrbit(design, M, DEMO_SEED) as number;
const result = simulate(design, M, DEMO_SEED, [{ orbit, response: DEMO_RESPONSE }]);

describe('summary text', () => {
  it('has the tier, all four scores, the top cause chain and the link', () => {
    const text = buildSummary({ result, design, mission: M, variantName: 'Standard mission', seed: DEMO_SEED, link: 'https://example.test/#v=1' });
    const lines = text.split('\n');
    expect(lines[0]).toBe('Threadline: Recovered (Standard mission, seed 29)');
    for (const label of ['Science yield', 'Data return', 'Spacecraft health', 'Budget margin']) expect(lines[1]).toContain(label);
    expect(lines[1]).toMatch(/\d+\/100/);
    expect(lines[2]).toMatch(/^Why: .{20,}/);
    expect(lines[3]).toBe('Try to beat it: https://example.test/#v=1');
    expect(text).not.toMatch(/undefined|NaN/);
  });

  it('is honest when there is no finished mission', () => {
    const bad = simulate({ ...design, instruments: [] }, M, 1);
    expect(buildSummary({ result: bad, design, mission: M, variantName: 'x', seed: 1, link: 'L' })).toBe('Threadline: no finished mission yet.\nL');
  });
});

describe('clipboard', () => {
  it('uses the modern clipboard when it works', async () => {
    let copied = '';
    expect(await copyText('hello', { writeText: async (t) => { copied = t; } })).toBe(true);
    expect(copied).toBe('hello');
  });
  it('falls back to the legacy route when the modern one rejects', async () => {
    expect(await copyText('x', { writeText: async () => { throw new Error('denied'); }, legacy: () => true })).toBe(true);
  });
  it('reports failure (so the UI shows the text for manual copying) when every route fails or throws', async () => {
    expect(await copyText('x', { writeText: async () => { throw new Error('denied'); }, legacy: () => false })).toBe(false);
    expect(await copyText('x', { writeText: async () => { throw new Error('denied'); }, legacy: () => { throw new Error('no'); } })).toBe(false);
    expect(await copyText('x', {})).toBe(false);
  });
});
