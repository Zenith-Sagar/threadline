// Phase 3 engine tests: the seeded storm, the in-flight decision, the data channel.
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON, LUNAR_RECON_CALM } from '@/content';
import type { Design, Intervention, ResponseId } from '@/data/schemas/types';
import {
  RESPONSE_IDS, findPauseOrbit, hitRoll, listResponses, simulate, stormOrbit,
} from '@/sim';
import { buildDesign, buildUiDesign } from './helpers';

const M = LUNAR_RECON;
const respond = (seed: number, response: ResponseId): Intervention[] => [
  { orbit: stormOrbit(seed, M) ?? 0, response },
];
const STARTER = ['radar', 'spectro', 'magneto'];
const designs: Design[] = [
  buildUiDesign(STARTER, 'light', 150, 200),
  buildUiDesign(['imager', 'spectro', 'magneto'], 'medium', 150, 320),
  buildUiDesign(['imager', 'spectro', 'altimeter'], 'medium', 150, 260),
  buildUiDesign(['imager', 'thermal', 'magneto'], 'heavy', 300, 200, 60),
  buildUiDesign(['imager', 'spectro', 'radar'], 'medium', 150, 260, 240),
];

describe('the seeded storm: Rewind fairness', () => {
  it('starts on an orbit decided by the seed alone, never by the design', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const expected = stormOrbit(seed, M);
      expect(expected).not.toBeNull();
      for (const d of designs) {
        const r = simulate(d, M, seed);
        if (!r.valid) continue;
        const launched = r.trace.length > 0;
        expect(r.stormOrbit).toBe(launched ? expected : null);
        if (launched) expect(findPauseOrbit(d, M, seed)).toBe(expected);
      }
    }
  });

  it('lands inside the configured window and varies from seed to seed', () => {
    const storm = M.storm!;
    const orbits = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const o = stormOrbit(seed, M) as number;
      expect(o).toBeGreaterThanOrEqual(storm.earliestOrbit);
      expect(o + storm.durationOrbits - 1).toBeLessThanOrEqual(M.rules.opsOrbits);
      orbits.add(o);
    }
    expect(orbits.size).toBeGreaterThanOrEqual(4);
  });

  it('uses its own stream: the launch roll does not move the storm', () => {
    // Seeds 16 and 21 fail the Light launch; the storm orbit is still defined for them.
    expect(stormOrbit(16, M)).toBe(7);
    expect(simulate(designs[0] as Design, M, 16).stormOrbit).toBeNull(); // no flight, so nothing to pause for
  });

  it('rolls the radiation dice from (seed, orbit, instrument) only', () => {
    expect(hitRoll(7, 5, 'radar')).toBe(hitRoll(7, 5, 'radar'));
    const rolls = new Set([hitRoll(7, 5, 'radar'), hitRoll(7, 6, 'radar'), hitRoll(7, 5, 'imager'), hitRoll(8, 5, 'radar')]);
    expect(rolls.size).toBe(4);
    for (const r of rolls) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it('two designs sharing an instrument face the same dice for it', () => {
    // Imager + spectrometer + altimeter vs imager + spectrometer + thermal: the imager and spectrometer share rolls.
    const a = simulate(designs[2] as Design, M, 2);
    const b = simulate(buildUiDesign(['imager', 'spectro', 'thermal'], 'medium', 150, 260), M, 2);
    const damaged = (r: typeof a, id: string): number[] =>
      r.trace.filter((f) => f.damagedIds.includes(id)).map((f) => f.orbit);
    for (const id of ['imager', 'spectro']) expect(damaged(a, id)).toEqual(damaged(b, id));
  });
});

describe('findPauseOrbit', () => {
  it('is null when there is nothing to decide', () => {
    const ok = designs[1] as Design;
    expect(findPauseOrbit(ok, M, 2)).toBe(stormOrbit(2, M));
    expect(findPauseOrbit(ok, LUNAR_RECON_CALM, 2)).toBeNull(); // no storm in this mission
    expect(findPauseOrbit(designs[0] as Design, M, 16)).toBeNull(); // launch fails first
    const overweight = buildDesign(['radar', 'altimeter', 'spectro'], 'light');
    expect(findPauseOrbit(overweight, M, 2)).toBeNull(); // cannot launch
  });
});

describe('the in-flight decision', () => {
  it('is deterministic', () => {
    const d = designs[2] as Design;
    const a = simulate(d, M, 6, respond(6, 'safe-mode'));
    const b = simulate(d, M, 6, respond(6, 'safe-mode'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('changes only what happens from the storm orbit on', () => {
    let compared = 0;
    for (const d of designs) {
      for (const seed of [1, 2, 6, 7, 10]) {
        const base = simulate(d, M, seed);
        if (!base.valid || base.trace.length === 0) continue;
        const s = base.stormOrbit as number;
        for (const response of RESPONSE_IDS) {
          const alt = simulate(d, M, seed, respond(seed, response));
          // Every orbit before the storm is identical.
          expect(alt.trace.slice(0, s - 1)).toEqual(base.trace.slice(0, s - 1));
          // Every logged event that happened before the storm is identical.
          const early = (r: typeof base): string[] =>
            r.log.filter((e) => e.kind === 'event' && Number(e.payload?.['orbit'] ?? 99) < s).map((e) => `${e.key}|${e.label}|${e.t}`);
          expect(early(alt)).toEqual(early(base));
          // The design decisions are untouched; the storm event itself is the same.
          const design = (r: typeof base): string[] => r.log.filter((e) => e.kind === 'design').map((e) => e.key + e.label);
          expect(design(alt)).toEqual(design(base));
          expect(alt.log.find((e) => e.key === 'event.storm')).toEqual(base.log.find((e) => e.key === 'event.storm'));
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(30);
  });

  it('is logged as a decision that follows the storm event', () => {
    const r = simulate(designs[2] as Design, M, 6, respond(6, 'safe-mode'));
    const storm = r.log.find((e) => e.key === 'event.storm');
    const decision = r.log.find((e) => e.kind === 'decision');
    expect(decision?.key).toBe('decision.response.safe-mode');
    expect(decision?.label).toMatch(/You chose: Enter safe mode early/);
    expect(decision?.causes).toEqual([storm?.id]);
    expect(r.interventions).toEqual([{ orbit: 6, response: 'safe-mode' }]);
    // With no intervention the default is logged too, so every storm outcome has a decision to trace to.
    const dflt = simulate(designs[2] as Design, M, 6);
    expect(dflt.log.find((e) => e.kind === 'decision')?.key).toBe('decision.response.ride-out');
    expect(dflt.log.find((e) => e.kind === 'decision')?.label).toMatch(/No response chosen/);
  });

  it('appears among the causes of what it caused', () => {
    // Seed 1, starter design: riding the storm out causes safe mode during the storm.
    const r = simulate(designs[0] as Design, M, 1);
    const decision = r.log.find((e) => e.kind === 'decision');
    const stormSafe = r.log.filter((e) => e.key === 'event.safe.mode' && r.trace[Number(e.payload?.['orbit']) - 1]?.stormActive);
    expect(stormSafe.length).toBeGreaterThan(0);
    for (const e of stormSafe) expect(e.causes).toContain(decision?.id);
  });

  it('ignores interventions at the wrong orbit and unknown responses', () => {
    const d = designs[2] as Design;
    const base = JSON.stringify(simulate(d, M, 6));
    const wrongOrbit: Intervention[] = [{ orbit: (stormOrbit(6, M) ?? 0) + 1, response: 'safe-mode' }];
    const bogus = [{ orbit: stormOrbit(6, M) ?? 0, response: 'bogus' as ResponseId }, { orbit: NaN, response: 'safe-mode' as ResponseId }];
    expect(JSON.stringify(simulate(d, M, 6, wrongOrbit))).toBe(base);
    expect(JSON.stringify(simulate(d, M, 6, bogus))).toBe(base);
  });

  it('shed-heaviest switches off the biggest power user, safe-mode switches off everything', () => {
    const d = designs[1] as Design; // imager 10 W, spectrometer 12 W, magnetometer 3 W
    const shed = simulate(d, M, 2, respond(2, 'shed-heaviest'));
    const safe = simulate(d, M, 2, respond(2, 'safe-mode'));
    const s = shed.stormOrbit as number;
    const inStorm = (r: typeof shed): typeof shed.trace => r.trace.filter((f) => f.stormActive);
    expect(s).toBe(6);
    for (const f of inStorm(shed)) expect(f.activeIds).not.toContain('spectro');
    for (const f of inStorm(safe)) expect(f.activeIds).toEqual([]);
    // After the storm everything that is not damaged is back on.
    expect(safe.trace[safe.trace.length - 1]?.activeIds.length).toBeGreaterThan(0);
  });

  it('safe mode protects the instruments from radiation; riding it out does not', () => {
    let rideDamage = 0;
    let safeDamage = 0;
    for (let seed = 1; seed <= 30; seed++) {
      rideDamage += simulate(designs[1] as Design, M, seed).metrics?.damagedInstruments.length ?? 0;
      safeDamage += simulate(designs[1] as Design, M, seed, respond(seed, 'safe-mode')).metrics?.damagedInstruments.length ?? 0;
    }
    expect(safeDamage).toBe(0);
    expect(rideDamage).toBeGreaterThan(0);
  });
});

describe('response options shown to the player', () => {
  const opts = listResponses(designs[1] as Design, M, 2);

  it('lists all three, with costs and risks, and no built-in recommendation', () => {
    expect(opts.map((o) => o.id)).toEqual(RESPONSE_IDS);
    for (const o of opts) {
      expect(o.label.length).toBeGreaterThan(3);
      expect(Object.keys(o)).not.toContain('recommended');
      expect(Object.keys(o)).not.toContain('best');
    }
    const [ride, shed, safe] = opts as [typeof opts[0], typeof opts[0], typeof opts[0]];
    expect(ride.scienceGivenUpPerOrbit).toBe(0);
    expect(shed.scienceGivenUpPerOrbit).toBe(18); // the spectrometer (12 W) is the biggest power user here
    expect(shed.label).toBe('Switch off the Spectrometer');
    expect(safe.scienceGivenUpPerOrbit).toBe(18 + 14 + 6);
    expect(ride.damageChancePerInstrument).toBe(M.storm?.damageChance);
    expect(safe.damageChancePerInstrument).toBe(0);
    expect(ride.stormOrbits).toBe(M.storm?.durationOrbits);
  });

  it('projects safe mode without revealing the radiation dice', () => {
    // Showing the options must not depend on whether an instrument will be hit.
    const a = listResponses(designs[1] as Design, M, 2);
    const b = listResponses(designs[1] as Design, M, 2);
    expect(a).toEqual(b);
    expect(listResponses(designs[1] as Design, LUNAR_RECON_CALM, 2)).toEqual([]);
  });
});

describe('the data channel', () => {
  const heavy = (storageMb: number): Design => buildUiDesign(['imager', 'spectro', 'radar'], 'medium', 150, 260, storageMb);

  it('fills small storage, pauses the instruments, and logs which instruments filled it', () => {
    const r = simulate(heavy(60), LUNAR_RECON_CALM, 2);
    expect(r.valid).toBe(true);
    const pauses = r.metrics?.storagePauseOrbits ?? [];
    expect(pauses.length).toBeGreaterThan(0);
    const ev = r.log.find((e) => e.key === 'event.storage.full');
    expect(ev).toBeDefined();
    const feeders = ['radar', 'imager', 'spectro'].map((id) => r.log.find((e) => e.key === `design.instrument.${id}`)?.id);
    for (const f of feeders) expect(ev?.causes).toContain(f);
    expect(ev?.causes).toContain(r.log.find((e) => e.key === 'design.storage')?.id);
    // A pause loses that orbit's science.
    const frame = r.trace.find((f) => f.status === 'storage-full');
    expect(frame?.generatedMb).toBe(0);
    expect((r.scores['scienceYield']?.value ?? 100)).toBeLessThan(100);
    expect(r.scores['dataReturn']?.causes.length).toBeGreaterThan(0);
  });

  it('more storage fixes it, at a price in mass and money', () => {
    const small = simulate(heavy(60), LUNAR_RECON_CALM, 2);
    const big = simulate(heavy(240), LUNAR_RECON_CALM, 2);
    expect(big.metrics?.storagePauseOrbits.length).toBeLessThan(small.metrics?.storagePauseOrbits.length ?? 0);
    expect(big.metrics?.totalCostM).toBeGreaterThan(small.metrics?.totalCostM ?? 0);
    expect(big.metrics?.dryKg).toBeGreaterThan(small.metrics?.dryKg ?? 0);
  });

  it('never loses data it has stored: returned never exceeds generated', () => {
    for (const d of designs) {
      for (const seed of [1, 2, 6]) {
        const r = simulate(d, M, seed);
        if (!r.valid || !r.metrics || r.trace.length === 0) continue;
        expect(r.metrics.dataReturnedMb).toBeLessThanOrEqual(r.metrics.dataGeneratedMb + 1e-9);
        const last = r.trace[r.trace.length - 1];
        expect(r.metrics.dataGeneratedMb - r.metrics.dataReturnedMb).toBeCloseTo(last?.storageEndMb ?? 0, 6);
        for (const f of r.trace) {
          expect(f.storageEndMb).toBeLessThanOrEqual(r.metrics.storageMb + 1e-9);
          expect(f.downlinkedMb).toBeLessThanOrEqual(M.bus.downlinkMbPerOrbit + 1e-9);
        }
      }
    }
  });
});
