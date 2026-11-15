// Golden-seed tests: the same design + seed must always give the same mission.
// If one of these fails after you change the engine, either you found a bug or the
// change is intentional. In the second case, update the pinned values deliberately.
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON_CALM as LUNAR_RECON } from '@/content'; // Phase 1/2 regression: storm-free mission
import { simulate } from '@/sim';
import { buildDesign } from './helpers';

const POWER_HUNGRY = ['radar', 'spectro', 'magneto'];

describe('simulate: golden seeds', () => {
  it('is deterministic: identical inputs give identical results', () => {
    const design = buildDesign(POWER_HUNGRY, 'light');
    const a = simulate(design, LUNAR_RECON, 42);
    const b = simulate(design, LUNAR_RECON, 42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('matches pinned golden values (radar + spectrometer + magnetometer, Light launcher, seed 42)', () => {
    const r = simulate(buildDesign(POWER_HUNGRY, 'light'), LUNAR_RECON, 42);
    expect(r.valid).toBe(true);
    expect(r.metrics).not.toBeNull();
    const m = r.metrics!;
    expect(m.dryKg).toBeCloseTo(173, 6);
    expect(m.wetKg).toBeCloseTo(263.87, 1);
    expect(m.dvAvailableMps).toBeCloseTo(1242, 3); // (80 + 900 + 100) m/s * 1.15
    expect(m.totalCostM).toBeCloseTo(140, 6); // retuned in Phase 2 (was 135)
    expect(m.periodMin).toBeCloseTo(117.82, 1);
    expect(m.eclipseMin).toBeCloseTo(46.48, 1);
    expect(m.brownoutOrbits).toEqual([8]);
    expect(r.tier).toBe('Partial');
    expect(r.scores.scienceYield?.value).toBe(93); // 13 of 14 orbits collected science
  });

  it('a light, thrifty design never browns out', () => {
    const r = simulate(buildDesign(['imager', 'spectro', 'magneto'], 'light'), LUNAR_RECON, 42);
    expect(r.metrics?.brownoutOrbits).toEqual([]);
    expect(r.tier).toBe('Landmark'); // Phase 3: a clean run with healthy data return is a Landmark (was Success)
    expect(r.scores.scienceYield?.value).toBe(100);
  });

  it('traces a safe-mode event back to the design choices that caused it', () => {
    const r = simulate(buildDesign(POWER_HUNGRY, 'light'), LUNAR_RECON, 42);
    const safeMode = r.log.find((e) => e.key === 'event.safe.mode');
    expect(safeMode).toBeDefined();
    const radarEntry = r.log.find((e) => e.key === 'design.instrument.radar');
    const batteryEntry = r.log.find((e) => e.key === 'design.battery');
    expect(radarEntry).toBeDefined();
    expect(safeMode!.causes).toContain(radarEntry!.id);
    expect(safeMode!.causes).toContain(batteryEntry!.id);
    // Causes always point to earlier entries.
    for (const cause of safeMode!.causes) expect(cause).toBeLessThan(safeMode!.id);
  });

  it('a different seed with a successful launch changes nothing about the power outcome', () => {
    const design = buildDesign(POWER_HUNGRY, 'light');
    const a = simulate(design, LUNAR_RECON, 42);
    const b = simulate(design, LUNAR_RECON, 7);
    expect(b.metrics?.brownoutOrbits).toEqual(a.metrics?.brownoutOrbits);
  });

  it('seed 16 fails the Light launcher roll and logs the cause', () => {
    const r = simulate(buildDesign(POWER_HUNGRY, 'light'), LUNAR_RECON, 16);
    expect(r.valid).toBe(true);
    expect(r.tier).toBe('Lost with Lessons');
    const failure = r.log.find((e) => e.key === 'event.launch.failure');
    const vehicleEntry = r.log.find((e) => e.key === 'design.vehicle.light');
    expect(failure?.causes).toEqual([vehicleEntry!.id]);
    expect(r.trace).toHaveLength(0);
  });

  it('explains an unlaunchable design instead of crashing', () => {
    // Radar + altimeter + spectrometer is too heavy for the Light launcher.
    const r = simulate(buildDesign(['radar', 'altimeter', 'spectro'], 'light'), LUNAR_RECON, 42);
    expect(r.valid).toBe(false);
    expect(r.tier).toBeNull();
    expect(r.reasons.join(' ')).toMatch(/lifts at most 270 kg/);
  });
});
