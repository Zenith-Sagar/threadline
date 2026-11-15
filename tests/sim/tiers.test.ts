// Tier recipes and golden cases for the storm mission (Phase 3).
// Every recipe uses a design a player can build with the Design Bay sliders (steps of 10, Auto-size fuel).
// These are the exact seeds listed in the "What to test" instructions.
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import type { Design, MissionResult, ResponseId, Tier } from '@/data/schemas/types';
import { TIER_DEFINITIONS, findPauseOrbit, simulate } from '@/sim';
import { buildUiDesign } from './helpers';

/** imager + spectrometer + thermal radiometer, Medium launcher, 150 Wh, 320 W array, default storage. */
const A = buildUiDesign(['imager', 'spectro', 'thermal'], 'medium', 150, 320);
/** The same, with the magnetometer instead of the thermal radiometer (less data, so Landmark is reachable). */
const B = buildUiDesign(['imager', 'spectro', 'magneto'], 'medium', 150, 320);

function fly(design: Design, seed: number, response: ResponseId): MissionResult {
  const pause = findPauseOrbit(design, M, seed);
  return simulate(design, M, seed, pause === null ? [] : [{ orbit: pause, response }]);
}

const RECIPES: { tier: Tier; design: Design; seed: number; response: ResponseId; note: string }[] = [
  { tier: 'Landmark', design: B, seed: 2, response: 'ride-out', note: 'storm passes with no damage; 93% of the data comes home' },
  { tier: 'Success', design: A, seed: 2, response: 'ride-out', note: 'all science, but only 78% of the data comes home' },
  { tier: 'Recovered', design: A, seed: 29, response: 'shed-heaviest', note: 'riding it out would have ended at 61% science' },
  { tier: 'Partial', design: A, seed: 1, response: 'ride-out', note: 'radiation damages the imager' },
  { tier: 'Lost with Lessons', design: A, seed: 16, response: 'ride-out', note: 'the launcher fails (Medium launcher, seed 16)' },
];

describe('one seed per tier', () => {
  for (const r of RECIPES) {
    it(`${r.tier}: seed ${r.seed}, ${r.response} (${r.note})`, () => {
      expect(fly(r.design, r.seed, r.response).tier).toBe(r.tier);
    });
  }

  it('Recovered really is a rescue: the same seed riding it out is worse', () => {
    const saved = fly(A, 29, 'shed-heaviest');
    const ride = fly(A, 29, 'ride-out');
    expect(saved.tier).toBe('Recovered');
    expect(ride.tier).toBe('Partial');
    expect(saved.metrics?.rideOutSciencePct).toBe(ride.scores['scienceYield']?.value);
    expect((saved.scores['scienceYield']?.value ?? 0) - (ride.scores['scienceYield']?.value ?? 0)).toBeGreaterThanOrEqual(15);
  });

  it('a clean ride-out is never labelled Recovered (nothing needed rescuing)', () => {
    expect(fly(A, 2, 'ride-out').tier).not.toBe('Recovered');
  });
});

describe('tier definitions', () => {
  it('has exactly one sentence for each of the five tiers', () => {
    const tiers: Tier[] = ['Landmark', 'Success', 'Recovered', 'Partial', 'Lost with Lessons'];
    expect(Object.keys(TIER_DEFINITIONS).sort()).toEqual([...tiers].sort());
    for (const t of tiers) {
      const text = TIER_DEFINITIONS[t];
      expect(text.length).toBeGreaterThan(20);
      expect(text.endsWith('.')).toBe(true);
      expect(text.slice(0, -1)).not.toMatch(/\.\s/); // one sentence
    }
  });
});

describe('golden cases (pinned numbers)', () => {
  const scores = (r: MissionResult): Record<string, number> =>
    Object.fromEntries(Object.entries(r.scores).map(([k, v]) => [k, v.value]));

  it('Landmark: imager + spectrometer + magnetometer, seed 2', () => {
    const r = fly(B, 2, 'ride-out');
    expect(scores(r)).toEqual({ scienceYield: 100, dataReturn: 93, spacecraftHealth: 100, budgetMargin: 100 });
    expect(r.stormOrbit).toBe(6);
    expect(r.metrics?.totalCostM).toBeCloseTo(134, 6);
  });

  it('Recovered: seed 29, switching off the biggest power user', () => {
    const r = fly(A, 29, 'shed-heaviest');
    expect(r.stormOrbit).toBe(5);
    expect(scores(r)).toEqual({ scienceYield: 79, dataReturn: 78, spacecraftHealth: 88, budgetMargin: 100 });
    expect(r.metrics?.damagedInstruments).toEqual(['thermal']);
    expect(r.metrics?.rideOutSciencePct).toBe(61);
  });

  it('seed 29 under the other two responses', () => {
    expect(scores(fly(A, 29, 'ride-out'))).toEqual({ scienceYield: 61, dataReturn: 67, spacecraftHealth: 76, budgetMargin: 100 });
    expect(fly(A, 29, 'ride-out').metrics?.damagedInstruments).toEqual(['spectro', 'thermal']);
    expect(scores(fly(A, 29, 'safe-mode'))).toEqual({ scienceYield: 79, dataReturn: 67, spacecraftHealth: 100, budgetMargin: 100 });
  });

  it('is deterministic with an intervention', () => {
    const a = JSON.stringify(fly(A, 29, 'shed-heaviest'));
    const b = JSON.stringify(fly(A, 29, 'shed-heaviest'));
    expect(a).toBe(b);
  });

  it('every score keeps a plain-language why and its causes point at earlier log entries', () => {
    for (const r of RECIPES) {
      const res = fly(r.design, r.seed, r.response);
      for (const key of ['scienceYield', 'dataReturn', 'spacecraftHealth', 'budgetMargin']) {
        const s = res.scores[key];
        expect(s, `${r.tier} ${key}`).toBeDefined();
        expect(s!.why.length).toBeGreaterThan(5);
        for (const id of s!.causes) expect(res.log.some((e) => e.id === id), `${r.tier} ${key} cause ${id}`).toBe(true);
      }
    }
  });
});
