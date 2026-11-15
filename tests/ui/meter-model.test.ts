import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import { previewMission } from '@/sim';
import { computeMeters, detailRows, METER_ORDER } from '@/ui/meter-model';
import { buildDesign } from '../sim/helpers';

const meters = (d: ReturnType<typeof buildDesign>) =>
  Object.fromEntries(computeMeters(previewMission(d, LUNAR_RECON), LUNAR_RECON).map((m) => [m.id, m]));

describe('meter model', () => {
  it('returns the five meters in a fixed order', () => {
    const list = computeMeters(previewMission(buildDesign(['imager', 'spectro', 'magneto'], 'light'), LUNAR_RECON), LUNAR_RECON);
    expect(list.map((m) => m.id)).toEqual(METER_ORDER);
  });

  it('a healthy design is OK everywhere', () => {
    const m = meters(buildDesign(['imager', 'spectro', 'magneto'], 'light'));
    for (const id of METER_ORDER) expect(m[id]!.status, id).toBe('ok');
    expect(m['power']!.text).toMatch(/all 14 orbits/);
  });

  it('flags a heavy design as too heavy for its launcher', () => {
    const m = meters(buildDesign(['radar', 'altimeter', 'spectro'], 'light'));
    expect(m['mass']!.status).toBe('bad');
    expect(m['mass']!.statusText).toBe('Too heavy');
    expect(m['mass']!.frac).toBe(1);
  });

  it('shows safe mode on the power meter for a power-hungry design', () => {
    const m = meters(buildDesign(['radar', 'spectro', 'magneto'], 'light'));
    expect(m['power']!.status).toBe('bad');
    expect(m['power']!.statusText).toBe('Safe mode');
    expect(m['power']!.text).toMatch(/orbit 8/);
    expect(m['science']!.status).toBe('tight'); // 93% of potential
  });

  it('shows not-enough-fuel when fuel is cut', () => {
    const d = { ...buildDesign(['imager', 'spectro', 'magneto'], 'light'), propellantKg: 40 };
    const m = meters(d);
    expect(m['fuel']!.status).toBe('bad');
    expect(m['fuel']!.text).toMatch(/^-/);
  });

  it('science waits for all instruments', () => {
    const d = { ...buildDesign(['imager', 'spectro', 'magneto'], 'light'), instruments: ['imager'] };
    const m = meters(d);
    expect(m['science']!.status).toBe('idle');
    expect(m['science']!.statusText).toBe('Pick 2 more');
  });

  it('every meter carries a label, and fuel carries the placeholder badge', () => {
    const m = meters(buildDesign(['imager', 'spectro', 'magneto'], 'light'));
    for (const id of METER_ORDER) expect(m[id]!.labels.length).toBeGreaterThan(0);
    expect(m['fuel']!.labels).toContain('UNVERIFIED PLACEHOLDER');
    expect(m['mass']!.labels).not.toContain('UNVERIFIED PLACEHOLDER');
  });

  it('signature changes only when what the player sees changes', () => {
    const a = meters(buildDesign(['imager', 'spectro', 'magneto'], 'light'));
    const b = meters(buildDesign(['imager', 'spectro', 'magneto'], 'light'));
    const c = meters(buildDesign(['imager', 'spectro', 'thermal'], 'light'));
    expect(a['cost']!.sig).toBe(b['cost']!.sig);
    expect(a['cost']!.sig).not.toBe(c['cost']!.sig);
  });

  it('detail rows label everything and flag the placeholders', () => {
    const d = buildDesign(['imager', 'spectro', 'magneto'], 'light');
    const rows = detailRows(previewMission(d, LUNAR_RECON), d, LUNAR_RECON);
    expect(rows.length).toBeGreaterThan(8);
    for (const row of rows) expect(row.labels.length).toBeGreaterThan(0);
    const dv = rows.find((x) => x.term === 'delta-v')!;
    expect(dv.labels).toContain('UNVERIFIED PLACEHOLDER');
    expect(rows.find((x) => x.label === 'One orbit')!.labels).toContain('NASA DATA');
  });
});

describe('Phase 3: data and storage meter', () => {
  const data = (d: ReturnType<typeof buildDesign>) => meters(d)['data']!;

  it('is labelled GAME MODEL and says how much storage there is', () => {
    const m = data({ ...buildDesign(['imager', 'spectro', 'magneto'], 'light'), storageMb: 120 });
    expect(m.labels).toContain('GAME MODEL');
    expect(m.text).toMatch(/120 Mb/);
  });

  it('warns (never colour alone) when small storage fills and pauses the instruments', () => {
    const m = data({ ...buildDesign(['radar', 'imager', 'spectro'], 'medium'), storageMb: 40 });
    expect(m.status).not.toBe('ok');
    expect(m.statusText).toBeTruthy();
  });
});
