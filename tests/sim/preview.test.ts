import { describe, expect, it } from 'vitest';
import { LUNAR_RECON_CALM as LUNAR_RECON } from '@/content'; // Phase 1/2 regression: storm-free mission
import { maxSciencePerOrbit, previewMission, simulate } from '@/sim';
import { combinations, buildDesign, ARRAY_STEPS, BATTERY_STEPS } from './sweep';

describe('previewMission', () => {
  it('agrees with simulate() on every design that can launch (sampled across the sweep grid)', () => {
    const triples = combinations(LUNAR_RECON.instruments.map((i) => i.id), 3);
    let compared = 0;
    for (const ids of triples) {
      for (const v of LUNAR_RECON.vehicles) {
        for (const b of BATTERY_STEPS) {
          for (const a of ARRAY_STEPS) {
            const d = buildDesign(LUNAR_RECON, ids, v.id, b, a, 0.15);
            const real = simulate(d, LUNAR_RECON, 42);
            if (!real.valid) continue;
            const p = previewMission(d, LUNAR_RECON);
            expect(p.brownoutOrbits).toEqual(real.metrics?.brownoutOrbits);
            expect(p.scienceFrac * 100).toBeCloseTo(real.scores['scienceYield']?.value ?? -1, 0);
            expect(p.validity.ok).toBe(true);
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(300);
  });

  it('still gives live numbers while the design cannot launch yet', () => {
    const partial = { ...buildDesign(LUNAR_RECON, ['radar', 'spectro', 'magneto'], 'light', 150, 200, 0.15), instruments: ['radar'] };
    const p = previewMission(partial, LUNAR_RECON);
    expect(p.validity.ok).toBe(false); // needs 3 instruments
    expect(p.metrics).not.toBeNull();
    expect(p.sciencePerOrbit).toBe(24);
    const empty = previewMission({ ...partial, instruments: [] }, LUNAR_RECON);
    expect(empty.metrics?.loadW).toBe(LUNAR_RECON.bus.baseLoadW);
    expect(empty.brownoutOrbits).toEqual([]);
  });

  it('shows safe mode for an overweight design (meters keep working)', () => {
    const d = buildDesign(LUNAR_RECON, ['radar', 'altimeter', 'spectro'], 'light', 150, 200, 0.15);
    const p = previewMission(d, LUNAR_RECON);
    expect(p.validity.ok).toBe(false);
    expect(p.brownoutOrbits.length).toBeGreaterThan(0);
  });

  it('never throws on garbage numbers', () => {
    const base = buildDesign(LUNAR_RECON, ['imager', 'spectro', 'magneto'], 'light', 150, 200, 0.15);
    for (const bad of [NaN, Infinity, -1, 0]) {
      expect(() => previewMission({ ...base, batteryWh: bad }, LUNAR_RECON)).not.toThrow();
      expect(() => previewMission({ ...base, arrayW: bad }, LUNAR_RECON)).not.toThrow();
    }
    expect(previewMission({ ...base, batteryWh: NaN }, LUNAR_RECON).metrics).toBeNull();
  });

  it('maxSciencePerOrbit is the best possible triple', () => {
    expect(maxSciencePerOrbit(LUNAR_RECON)).toBe(24 + 18 + 14);
  });

  // Phase 3: the equivalence now covers the storm, the responses and the storage size.
  it('agrees with simulate() on storm, responses, damage and storage (Phase 3)', async () => {
    const { LUNAR_RECON: STORM } = await import('@/content');
    const { findPauseOrbit } = await import('@/sim');
    const { STORAGE_STEPS } = await import('./sweep');
    const responses = ['ride-out', 'shed-heaviest', 'safe-mode'] as const;
    const triples = combinations(STORM.instruments.map((i) => i.id), 3);
    let compared = 0;
    let withDamage = 0;
    let withStoragePause = 0;
    for (const [ti, ids] of triples.entries()) {
      for (const [vi, v] of STORM.vehicles.entries()) {
        for (const storage of STORAGE_STEPS) {
        const battery = BATTERY_STEPS[(ti + 2 * vi) % BATTERY_STEPS.length] as number;
        const array = ARRAY_STEPS[(2 * ti + vi) % ARRAY_STEPS.length] as number;
        const d = { ...buildDesign(STORM, ids, v.id, battery, array, 0.15), storageMb: storage };
        for (const seed of [1, 2, 3, 6, 9]) {
          const pause = findPauseOrbit(d, STORM, seed);
          if (pause === null) continue; // invalid design or failed launch: simulate() runs no ops there
          for (const response of responses) {
            const ivs = [{ orbit: pause, response }];
            const real = simulate(d, STORM, seed, ivs);
            const p = previewMission(d, STORM, seed, ivs);
            const m = real.metrics!;
            expect(p.brownoutOrbits).toEqual(m.brownoutOrbits);
            expect(p.storagePauseOrbits).toEqual(m.storagePauseOrbits);
            expect(p.metrics?.damagedInstruments).toEqual(m.damagedInstruments);
            expect(p.metrics?.dataReturnedMb).toBeCloseTo(m.dataReturnedMb ?? -1, 9);
            expect(p.metrics?.dataGeneratedMb).toBeCloseTo(m.dataGeneratedMb ?? -1, 9);
            expect(p.peakStorageMb).toBeCloseTo(m.peakStorageMb ?? -1, 9);
            expect(p.stormOrbit).toBe(real.stormOrbit);
            expect(p.scienceFrac * 100).toBeCloseTo(real.scores['scienceYield']?.value ?? -1, 0);
            expect(p.dataFrac * 100).toBeCloseTo(real.scores['dataReturn']?.value ?? -1, 0);
            if ((m.damagedInstruments ?? []).length > 0) withDamage++;
            if ((m.storagePauseOrbits ?? []).length > 0) withStoragePause++;
            compared++;
          }
        }
        }
      }
    }
    expect(compared).toBeGreaterThan(500);
    // The comparison must actually exercise the new features, not just calm runs.
    expect(withDamage).toBeGreaterThan(20);
    expect(withStoragePause).toBeGreaterThan(20);
  });

  it('without a seed the preview is the calm mission: no storm, no damage', async () => {
    const { LUNAR_RECON: STORM } = await import('@/content');
    const d = buildDesign(STORM, ['imager', 'spectro', 'magneto'], 'medium', 150, 320, 0.15);
    const p = previewMission(d, STORM);
    expect(p.stormOrbit).toBeNull();
    expect(p.metrics?.damagedInstruments).toEqual([]);
  });
});
