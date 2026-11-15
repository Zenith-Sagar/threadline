// Fuzz test: no random design may crash the engine or produce NaN, negative mass, or runaway loops.
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import type { Design, ResponseId } from '@/data/schemas/types';
import { createRng, simulate } from '@/sim';
import { MAX_OPS_ORBITS } from '@/sim/constants';

describe('simulate: fuzz', () => {
  it('survives 1,000 random designs, including garbage numbers', () => {
    const rng = createRng(2026);
    const pick = <T>(list: T[]): T => list[Math.floor(rng() * list.length)] as T;
    const weird = [NaN, Infinity, -Infinity, -5, 0, 1e12];
    const num = (max: number): number => (rng() < 0.1 ? pick(weird) : rng() * max);
    const ids = LUNAR_RECON.instruments.map((i) => i.id).concat(['ghost']);
    const vehicles = LUNAR_RECON.vehicles.map((v) => v.id).concat(['nope']);

    let validCount = 0;
    for (let n = 0; n < 1000; n++) {
      const design: Design = {
        instruments: Array.from({ length: Math.floor(rng() * 6) }, () => pick(ids)),
        vehicle: pick(vehicles),
        batteryWh: num(400),
        arrayW: num(400),
        propellantKg: num(200),
      };
      const r = simulate(design, LUNAR_RECON, Math.floor(rng() * 1e9));
      expect(r.trace.length).toBeLessThanOrEqual(MAX_OPS_ORBITS);
      if (r.valid) {
        validCount++;
        const m = r.metrics!;
        for (const v of [m.dryKg, m.wetKg, m.dvAvailableMps, m.totalCostM, m.periodMin]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        expect(m.dryKg).toBeGreaterThan(0);
        expect(r.reasons).toHaveLength(0);
        for (const f of r.trace) {
          expect(Number.isFinite(f.batteryStartWh)).toBe(true);
          expect(f.batteryStartWh).toBeGreaterThanOrEqual(0);
        }
      } else {
        expect(r.reasons.length).toBeGreaterThan(0);
        expect(r.tier).toBeNull();
      }
    }
    // Sanity: the fuzzer should actually reach the valid path sometimes.
    expect(validCount).toBeGreaterThan(0);
  });

  // Phase 3: random storage sizes and garbage interventions must never crash or poison a result.
  it('survives random designs with random storage and garbage interventions (Phase 3)', () => {
    const rng = createRng(31337);
    const pick = <T>(list: T[]): T => list[Math.floor(rng() * list.length)] as T;
    const weird = [NaN, Infinity, -Infinity, -5, 0, 1e12];
    const num = (max: number): number => (rng() < 0.1 ? pick(weird) : rng() * max);
    const ids = LUNAR_RECON.instruments.map((i) => i.id).concat(['ghost']);
    const vehicles = LUNAR_RECON.vehicles.map((v) => v.id).concat(['nope']);
    const responses = ['ride-out', 'shed-heaviest', 'safe-mode', 'bogus', '', 42];

    let launched = 0;
    for (let n = 0; n < 1500; n++) {
      const design: Design = {
        instruments: Array.from({ length: 3 }, () => pick(ids)),
        vehicle: rng() < 0.8 ? 'medium' : pick(vehicles),
        batteryWh: rng() < 0.9 ? 100 + rng() * 300 : num(400),
        arrayW: rng() < 0.9 ? 150 + rng() * 250 : num(400),
        propellantKg: rng() < 0.9 ? 60 + rng() * 100 : num(200),
        storageMb: rng() < 0.2 ? num(500) : rng() < 0.5 ? 30 + rng() * 300 : (undefined as unknown as number),
      };
      if (design.storageMb === undefined) delete (design as { storageMb?: number }).storageMb;
      const ivs = Array.from({ length: Math.floor(rng() * 4) }, () => ({
        orbit: rng() < 0.5 ? Math.floor(rng() * 16) : pick(weird),
        response: pick(responses) as ResponseId,
      }));
      const seed = rng() < 0.1 ? pick(weird) : Math.floor(rng() * 1e9);
      const r = simulate(design, LUNAR_RECON, seed, ivs);
      const again = simulate(design, LUNAR_RECON, seed, ivs);
      expect(JSON.stringify(again)).toBe(JSON.stringify(r)); // deterministic, even for garbage
      expect(r.trace.length).toBeLessThanOrEqual(MAX_OPS_ORBITS);
      if (!r.valid) {
        expect(r.reasons.length).toBeGreaterThan(0);
        expect(r.tier).toBeNull();
        continue;
      }
      if (r.trace.length > 0) launched++;
      for (const v of Object.values(r.scores)) {
        expect(Number.isFinite(v.value)).toBe(true);
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
      for (const f of r.trace) {
        for (const x of [f.batteryStartWh, f.batteryAfterEclipseWh, f.arrayW, f.storageStartMb, f.storageEndMb, f.generatedMb, f.downlinkedMb]) {
          expect(Number.isFinite(x)).toBe(true);
        }
        expect(f.storageEndMb).toBeGreaterThanOrEqual(0);
      }
      for (const e of r.log) for (const c of e.causes) expect(c).toBeLessThan(e.id);
    }
    expect(launched).toBeGreaterThan(50);
  });
});
