// Pins the numbers derived from NASA's Moon Fact Sheet snapshot (see docs/truth-ledger.md).
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import moon from '@/data/snapshots/moon-facts.json';
import { circularSpeedKmS, eclipseFraction, lightTimeS, orbitPeriodMin } from '@/sim';

describe('lunar orbit constants (SIMPLIFIED PHYSICS on NASA DATA)', () => {
  const orbit = LUNAR_RECON.orbit;

  it('uses the snapshot values for radius and GM', () => {
    expect(orbit.bodyRadiusKm).toBe(moon.values.volumetricMeanRadiusKm);
    expect(orbit.bodyGmKm3S2).toBeCloseTo(4900, 6);
  });

  it('circular speed at 100 km altitude is about 1.63 km/s', () => {
    const v = circularSpeedKmS(orbit.bodyGmKm3S2, orbit.bodyRadiusKm + orbit.altitudeKm);
    expect(v).toBeGreaterThan(1.62);
    expect(v).toBeLessThan(1.64);
  });

  it('orbital period at 100 km altitude is about 118 minutes', () => {
    const p = orbitPeriodMin(orbit);
    expect(p).toBeGreaterThan(117);
    expect(p).toBeLessThan(119);
  });

  it('maximum eclipse fraction at 100 km altitude is about 0.394', () => {
    expect(eclipseFraction(orbit)).toBeCloseTo(0.3945, 3);
  });

  it('one-way light time at the mean Earth-Moon distance is about 1.28 s', () => {
    const meanDistanceKm = moon.values.semimajorAxisE6Km * 1e6;
    expect(lightTimeS(meanDistanceKm)).toBeCloseTo(1.282, 2);
  });
});
