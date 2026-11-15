import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { VARIANTS, applyVariant } from '@/content/variants';
import { RANGES } from '@/core/store';
import type { Design } from '@/data/schemas/types';
import { MAX_HASH_LENGTH, SHARE_VERSION, decodeShare, encodeShare, isShareHash, type SharedMission } from '@/share/code';
import { createRng } from '@/sim';

const design: Design = { instruments: ['imager', 'spectro', 'thermal'], vehicle: 'medium', batteryWh: 150, arrayW: 320, propellantKg: 63, storageMb: 120 };
const share: SharedMission = { variant: 'standard', seed: 29, design, response: 'shed-heaviest' };
const good = encodeShare(share);

describe('share link: round trip', () => {
  it('encodes to a short, readable, versioned hash', () => {
    expect(good).toBe('v=1&seed=29&mission=standard&inst=imager,spectro,thermal&veh=medium&bat=150&arr=320&fuel=63&store=120&resp=shed-heaviest');
    expect(good.length).toBeLessThan(200);
    expect(SHARE_VERSION).toBe(1);
  });

  it('decodes exactly what was encoded (with or without the leading #)', () => {
    for (const h of [good, `#${good}`]) {
      const r = decodeShare(h, M);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.share).toEqual(share);
        expect(r.adjusted).toEqual([]);
      }
    }
  });

  it('round-trips every variant, every response and a missing response', () => {
    for (const v of VARIANTS) {
      for (const response of ['ride-out', 'shed-heaviest', 'safe-mode', null] as const) {
        const s: SharedMission = { ...share, variant: v.id, response };
        const r = decodeShare(encodeShare(s), M);
        expect(r.ok, `${v.id}/${response}`).toBe(true);
        if (r.ok) expect(r.share).toEqual(s);
      }
    }
  });

  it('recognises a share hash and ignores other hashes', () => {
    expect(isShareHash('#v=1&seed=1')).toBe(true);
    expect(isShareHash('#top')).toBe(false);
    expect(isShareHash('')).toBe(false);
  });
});

describe('share link: untrusted input', () => {
  const reason = (h: string): string => {
    const r = decodeShare(h, M);
    expect(r.ok, h).toBe(false);
    return r.ok ? '' : r.reason;
  };

  it('rejects oversize input (and does not choke on huge text)', () => {
    expect(reason(`${good}&x=${'a'.repeat(MAX_HASH_LENGTH)}`)).toMatch(/too long/);
    expect(reason('x'.repeat(200_000))).toMatch(/too long/);
  });

  it('rejects an unknown or missing version', () => {
    expect(reason(good.replace('v=1', 'v=2'))).toMatch(/different version/);
    expect(reason(good.replace('v=1&', ''))).toMatch(/no version/);
    expect(reason(good.replace('v=1', 'v=abc'))).toMatch(/no version/);
  });

  it('rejects an empty link, repeated fields, bad seeds and unknown variants', () => {
    expect(reason('#')).toMatch(/empty/);
    expect(reason(`${good}&seed=1`)).toMatch(/repeats a field/);
    expect(reason(good.replace('seed=29', 'seed=-1'))).toMatch(/seed/);
    expect(reason(good.replace('seed=29', 'seed=99999999999'))).toMatch(/seed/);
    expect(reason(good.replace('seed=29', 'seed=1e9'))).toMatch(/seed/);
    expect(reason(good.replace('mission=standard', 'mission=hard-mode'))).toMatch(/variant/);
  });

  it('rejects unknown, repeated or wrongly counted instruments and unknown launchers', () => {
    expect(reason(good.replace('imager', 'ghost'))).toMatch(/instrument/);
    expect(reason(good.replace('thermal', 'imager'))).toMatch(/repeats an instrument/);
    expect(reason(good.replace('inst=imager,spectro,thermal', 'inst=imager,spectro'))).toMatch(/exactly 3/);
    expect(reason(good.replace('veh=medium', 'veh=moonshot'))).toMatch(/launcher/);
    expect(reason(good.replace('inst=imager', 'inst=<script>'))).toMatch(/instrument/);
  });

  it('rejects missing or non-numeric numbers', () => {
    expect(reason(good.replace('bat=150&', ''))).toMatch(/number/);
    expect(reason(good.replace('bat=150', 'bat=lots'))).toMatch(/number/);
    expect(reason(good.replace('arr=320', 'arr=NaN'))).toMatch(/number/);
    expect(reason(good.replace('fuel=63', 'fuel=Infinity'))).toMatch(/number/);
  });

  it('CLAMPS out-of-range numbers to the slider ranges and says so', () => {
    const r = decodeShare(good.replace('bat=150', 'bat=99999').replace('arr=320', 'arr=-50').replace('store=120', 'store=1'), M);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.share.design.batteryWh).toBe(RANGES.batteryWh.max);
      expect(r.share.design.arrayW).toBe(RANGES.arrayW.min);
      expect(r.share.design.storageMb).toBe(RANGES.storageMb.min);
      expect(r.adjusted.join(' ')).toMatch(/Battery size.*Solar array.*Storage/);
    }
  });

  it('drops an unknown storm response with a note instead of trusting it', () => {
    const r = decodeShare(good.replace('shed-heaviest', 'win-instantly'), M);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.share.response).toBeNull();
      expect(r.adjusted.join(' ')).toMatch(/not recognised/);
    }
  });

  it('never carries a tier: a "tier" field in the link is ignored (the receiver recomputes it)', () => {
    const r = decodeShare(`${good}&tier=Landmark`, M);
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.stringify(r.share)).not.toContain('Landmark');
  });

  it('survives 3,000 randomly tampered links: never throws; any accepted link is a safe design', () => {
    const rng = createRng(2026);
    const pick = (n: number): number => Math.floor(rng() * n);
    const junk = ['&', '=', ',', '%', '#', '\u0000', '\u202e', 'é', '9', '-', '.', 'x', ' ', '%00', '%zz'];
    let accepted = 0;
    for (let n = 0; n < 3000; n++) {
      let h = good;
      for (let k = 0, edits = 1 + pick(4); k < edits; k++) {
        const at = pick(h.length + 1);
        const kind = pick(3);
        if (kind === 0) h = h.slice(0, at) + h.slice(at + 1 + pick(3));
        else if (kind === 1) h = h.slice(0, at) + junk[pick(junk.length)] + h.slice(at);
        else h = h.slice(0, at) + String(pick(100000)) + h.slice(at);
      }
      const r = decodeShare(h, M);
      if (!r.ok) continue;
      accepted++;
      const mission = applyVariant(M, r.share.variant);
      const d = r.share.design;
      expect(d.instruments).toHaveLength(mission.rules.instrumentCount);
      for (const id of d.instruments) expect(mission.instruments.some((i) => i.id === id)).toBe(true);
      expect(mission.vehicles.some((v) => v.id === d.vehicle)).toBe(true);
      expect(d.batteryWh).toBeGreaterThanOrEqual(RANGES.batteryWh.min);
      expect(d.batteryWh).toBeLessThanOrEqual(RANGES.batteryWh.max);
      expect(d.arrayW).toBeGreaterThanOrEqual(RANGES.arrayW.min);
      expect(d.arrayW).toBeLessThanOrEqual(RANGES.arrayW.max);
      expect(Number.isFinite(d.propellantKg)).toBe(true);
      expect(Number.isInteger(r.share.seed)).toBe(true);
    }
    expect(accepted).toBeGreaterThan(0); // the fuzzer does reach the accept path
  });
});
