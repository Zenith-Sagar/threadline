import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import { isDesign, parseDesign } from '@/data/schemas/guards';

describe('content sanity', () => {
  it('has unique ids and enough instruments to choose from', () => {
    const ids = LUNAR_RECON.instruments.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(LUNAR_RECON.rules.instrumentCount);
    const vIds = LUNAR_RECON.vehicles.map((v) => v.id);
    expect(new Set(vIds).size).toBe(vIds.length);
  });

  it('has positive, finite numbers everywhere they matter', () => {
    for (const i of LUNAR_RECON.instruments) {
      for (const n of [i.massKg, i.powerW, i.costM, i.science, i.dataMbPerOrbit]) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThan(0);
      }
      expect(i.why.length).toBeGreaterThan(0);
    }
    for (const v of LUNAR_RECON.vehicles) {
      expect(v.reliability).toBeGreaterThan(0);
      expect(v.reliability).toBeLessThanOrEqual(1);
      expect(v.capacityKg).toBeGreaterThan(0);
    }
  });
});

describe('design guards', () => {
  const good = { instruments: ['radar'], vehicle: 'light', batteryWh: 150, arrayW: 200, propellantKg: 80 };

  it('accepts a well-formed design', () => {
    expect(isDesign(good)).toBe(true);
    expect(parseDesign(JSON.stringify(good))).toEqual(good);
  });

  it('rejects malformed, non-finite, or oversized input without throwing', () => {
    expect(parseDesign('not json')).toBeNull();
    expect(parseDesign('null')).toBeNull();
    expect(parseDesign(JSON.stringify({ ...good, batteryWh: 'lots' }))).toBeNull();
    expect(parseDesign(JSON.stringify({ ...good, instruments: 'radar' }))).toBeNull();
    expect(parseDesign('x'.repeat(5000))).toBeNull();
  });
});
