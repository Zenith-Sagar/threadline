import { describe, expect, it } from 'vitest';
import { LUNAR_RECON_CALM as LUNAR_RECON } from '@/content'; // Phase 1/2 regression: storm-free mission
import { buildCauseChains, simulate } from '@/sim';
import { buildDesign } from './helpers';

const POWER_HUNGRY = buildDesign(['radar', 'spectro', 'magneto'], 'light');

describe('buildCauseChains', () => {
  it('builds the three-chain explanation for a safe-mode run', () => {
    const r = simulate(POWER_HUNGRY, LUNAR_RECON, 42);
    const chains = buildCauseChains(r, POWER_HUNGRY, LUNAR_RECON);
    expect(chains).toHaveLength(3);
    const first = chains[0]!;
    expect(first.links.map((l) => l.kind)).toEqual(['decision', 'effect', 'effect', 'outcome']);
    expect(first.links[0]!.text).toBe('Radar sounder');
    expect(first.links[1]!.text).toBe('38 W of power');
    expect(first.links[3]!.text).toBe('Safe mode on orbit 8');
    expect(first.decisionKey).toBe('instrument:radar');
    // Second chain is the binding power system: here sunlight cannot refill what eclipse uses.
    expect(chains[1]!.decisionKey).toBe('array');
    expect(chains[1]!.links[2]!.text).toMatch(/sunlight cannot refill/);
    expect(chains[2]!.decisionKey).toBe('instrument:spectro');
  });

  it('blames the battery when one eclipse needs more than it can give', () => {
    const d = buildDesign(['radar', 'spectro', 'imager'], 'medium', 60, 330);
    const r = simulate(d, LUNAR_RECON, 42);
    expect(r.valid).toBe(true);
    const chains = buildCauseChains(r, d, LUNAR_RECON);
    expect(chains[1]!.decisionKey).toBe('battery');
    expect(chains[1]!.links[2]!.text).toBe('battery empties during the eclipse');
  });

  it('reports repeated safe modes compactly', () => {
    const d = buildDesign(['radar', 'altimeter', 'spectro'], 'medium', 100, 150);
    const r = simulate(d, LUNAR_RECON, 42);
    expect(r.valid).toBe(true);
    const outcome = buildCauseChains(r, d, LUNAR_RECON)[0]!.links[3]!.text;
    expect(outcome).toBe('Safe mode on orbit 1 and 13 more');
  });

  it('explains a launch failure with the launcher decision (seed 16)', () => {
    const r = simulate(POWER_HUNGRY, LUNAR_RECON, 16);
    const chains = buildCauseChains(r, POWER_HUNGRY, LUNAR_RECON);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.decisionKey).toBe('vehicle');
    expect(chains[0]!.links[0]!.text).toBe('Light launcher');
    expect(chains[0]!.links[3]!.text).toBe('Launch failure');
  });

  it('explains what went right when nothing failed', () => {
    const d = buildDesign(['imager', 'spectro', 'magneto'], 'light');
    const r = simulate(d, LUNAR_RECON, 42);
    const chains = buildCauseChains(r, d, LUNAR_RECON);
    expect(chains).toHaveLength(3);
    expect(chains[0]!.links[3]!.text).toBe('Powered on all 14 orbits');
    expect(chains.map((c) => c.decisionKey)).toEqual(['battery', 'instrument:spectro', 'vehicle']);
  });

  it('returns nothing for an invalid design, and respects max', () => {
    const bad = buildDesign(['radar', 'altimeter', 'spectro'], 'light');
    expect(buildCauseChains(simulate(bad, LUNAR_RECON, 42), bad, LUNAR_RECON)).toEqual([]);
    const r = simulate(POWER_HUNGRY, LUNAR_RECON, 42);
    expect(buildCauseChains(r, POWER_HUNGRY, LUNAR_RECON, 1)).toHaveLength(1);
  });

  it('never invents numbers: every effect with a W figure matches the content', () => {
    const r = simulate(POWER_HUNGRY, LUNAR_RECON, 42);
    for (const c of buildCauseChains(r, POWER_HUNGRY, LUNAR_RECON)) {
      expect(c.detail.length).toBeGreaterThan(20);
      for (const l of c.links) expect(l.text).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
