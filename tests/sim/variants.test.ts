// Slice B: variants are CONTENT ONLY. A variant is a pure function from the base mission to a changed copy.
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as BASE } from '@/content';
import {
  DATA_RICH_FACTOR, EARLY_STORM, TIGHT_BUDGET_FACTOR, VARIANTS, applyVariant, isVariantId, variantById,
} from '@/content/variants';
import type { MissionDef } from '@/data/schemas/types';
import { findPauseOrbit, simulate, stormOrbit } from '@/sim';
import { buildDesign } from './helpers';

/** Every leaf of an object as "a.b.c" -> value, so two missions can be compared path by path. */
function flatten(o: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (Array.isArray(o)) o.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (typeof o === 'object' && o !== null) for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = o;
  return out;
}
function changedPaths(a: MissionDef, b: MissionDef): string[] {
  const fa = flatten(a), fb = flatten(b);
  return [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => fa[k] !== fb[k]);
}

describe('variants: shape', () => {
  it('has the standard mission plus exactly three modifiers, with unique ids', () => {
    expect(VARIANTS.map((v) => v.id)).toEqual(['standard', 'early-storm', 'tight-budget', 'data-rich']);
  });
  it('each modifier has a one-sentence description and says which number changes', () => {
    for (const v of VARIANTS) {
      expect(v.description.split(/[.!?]\s/).filter(Boolean), v.id).toHaveLength(1);
      expect(v.change(BASE).length, v.id).toBeGreaterThan(5);
    }
  });
  it('isVariantId and variantById are safe with untrusted input', () => {
    expect(isVariantId('early-storm')).toBe(true);
    expect(isVariantId('hack')).toBe(false);
    expect(isVariantId(42)).toBe(false);
    expect(variantById('nope').id).toBe('standard');
  });
});

describe('variants: content only, nothing else differs', () => {
  it('standard changes nothing at all', () => {
    expect(changedPaths(BASE, applyVariant(BASE, 'standard'))).toEqual([]);
  });
  it('early storm changes only the storm window, to orbits 2 to 4', () => {
    const m = applyVariant(BASE, 'early-storm');
    expect(changedPaths(BASE, m).sort()).toEqual(['storm.earliestOrbit', 'storm.latestOrbit']);
    expect(m.storm?.latestOrbit).toBeLessThanOrEqual(4);
    expect(m.storm?.earliestOrbit).toBe(EARLY_STORM.earliestOrbit);
    expect(m.storm?.earliestOrbit).toBeGreaterThanOrEqual(2); // there is always one calm orbit before the warning
  });
  it('tight budget changes only the budget, by minus 15 percent', () => {
    const m = applyVariant(BASE, 'tight-budget');
    expect(changedPaths(BASE, m)).toEqual(['rules.budgetM']);
    expect(m.rules.budgetM).toBe(Math.round(BASE.rules.budgetM * TIGHT_BUDGET_FACTOR));
    expect(m.rules.budgetM / BASE.rules.budgetM).toBeCloseTo(0.85, 2);
  });
  it('data-rich changes only each instrument\u2019s data, by plus 30 percent', () => {
    const m = applyVariant(BASE, 'data-rich');
    const paths = changedPaths(BASE, m);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((p) => /^instruments\[\d+\]\.dataMbPerOrbit$/.test(p))).toBe(true);
    m.instruments.forEach((i, n) => {
      const was = (BASE.instruments[n] as { dataMbPerOrbit: number }).dataMbPerOrbit;
      expect(i.dataMbPerOrbit / was).toBeCloseTo(DATA_RICH_FACTOR, 1);
    });
  });
  it('never mutates the base mission', () => {
    const before = JSON.stringify(BASE);
    for (const v of VARIANTS) applyVariant(BASE, v.id);
    expect(JSON.stringify(BASE)).toBe(before);
  });
});

describe('variants: the SAME simulate() runs them', () => {
  const design = buildDesign(['imager', 'spectro', 'thermal'], 'medium', 150, 320);
  it('is deterministic for every variant', () => {
    for (const v of VARIANTS) {
      const m = applyVariant(BASE, v.id);
      expect(JSON.stringify(simulate(design, m, 29))).toBe(JSON.stringify(simulate(design, m, 29)));
    }
  });
  it('early storm: the storm is on orbit 4 or earlier for every seed, and the pause orbit agrees', () => {
    const m = applyVariant(BASE, 'early-storm');
    for (let seed = 0; seed < 200; seed++) {
      const orbit = stormOrbit(seed, m);
      expect(orbit).not.toBeNull();
      expect(orbit as number).toBeLessThanOrEqual(4);
      expect(orbit as number).toBeGreaterThanOrEqual(2);
      const pause = findPauseOrbit(design, m, seed);
      if (pause !== null) expect(pause).toBe(orbit);
    }
  });
  it('tight budget: a design that fits the standard budget can be rejected, with a readable reason', () => {
    const heavy = buildDesign(['radar', 'spectro', 'thermal'], 'medium', 150, 260); // costs about $168M: inside $175M, outside $149M
    const std = simulate(heavy, BASE, 1);
    const tight = simulate(heavy, applyVariant(BASE, 'tight-budget'), 1);
    expect(std.valid).toBe(true);
    expect(tight.valid).toBe(false);
    expect(tight.reasons.join(' ')).toMatch(/budget/i);
  });
  it('data-rich: more data is generated by the same instruments', () => {
    const a = simulate(design, BASE, 29).metrics?.dataGeneratedMb ?? 0;
    const b = simulate(design, applyVariant(BASE, 'data-rich'), 29).metrics?.dataGeneratedMb ?? 0;
    expect(b).toBeGreaterThan(a);
  });
});
