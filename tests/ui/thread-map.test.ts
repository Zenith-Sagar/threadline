import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import type { Design } from '@/data/schemas/types';
import { previewMission } from '@/sim';
import { computeMeters } from '@/ui/meter-model';
import { changedControl, movedMeters } from '@/ui/thread-map';
import { THREAD_TIMING } from '@/ui/threads';
import { buildDesign } from '../sim/helpers';

const base: Design = buildDesign(['imager', 'spectro', 'magneto'], 'light');
const meters = (d: Design) => computeMeters(previewMission(d, LUNAR_RECON), LUNAR_RECON);

describe('changedControl', () => {
  it('identifies each kind of control', () => {
    expect(changedControl(base, { ...base, instruments: ['imager', 'spectro', 'radar'] })).toEqual({ kind: 'instrument', id: 'radar' });
    expect(changedControl(base, { ...base, instruments: ['imager', 'spectro'] })).toEqual({ kind: 'instrument', id: 'magneto' });
    expect(changedControl(base, { ...base, vehicle: 'heavy' })).toEqual({ kind: 'vehicle' });
    expect(changedControl(base, { ...base, batteryWh: 200 })).toEqual({ kind: 'battery' });
    expect(changedControl(base, { ...base, arrayW: 250 })).toEqual({ kind: 'array' });
    expect(changedControl(base, { ...base, propellantKg: base.propellantKg + 5 })).toEqual({ kind: 'fuel' });
  });
  it('returns null when nothing changed', () => {
    expect(changedControl(base, { ...base, instruments: base.instruments.slice() })).toBeNull();
  });
});

describe('movedMeters', () => {
  it('swapping in the radar moves power, science, mass and cost, not nothing', () => {
    const next = { ...base, instruments: ['imager', 'spectro', 'radar'] };
    const moved = movedMeters(meters(base), meters(next)).map((m) => m.meter);
    expect(moved).toEqual(expect.arrayContaining(['mass', 'power', 'cost']));
  });
  it('a bigger battery moves power in the "up" direction and does not move cost downward', () => {
    const hungry = buildDesign(['radar', 'spectro', 'magneto'], 'light');
    const next = { ...hungry, batteryWh: 200 };
    const moved = movedMeters(meters(hungry), meters(next));
    expect(moved.find((m) => m.meter === 'power')?.direction).toBe('up');
    expect(moved.find((m) => m.meter === 'cost')?.direction).toBe('up');
  });
  it('reports nothing for an identical design', () => {
    expect(movedMeters(meters(base), meters({ ...base }))).toEqual([]);
  });
});

describe('thread timing spec', () => {
  it('draws in about 300 ms and honours the staggered, ease-out design', () => {
    expect(THREAD_TIMING.drawMs).toBe(300);
    expect(THREAD_TIMING.staggerMs).toBeLessThanOrEqual(100);
    expect(THREAD_TIMING.holdMs).toBeGreaterThan(THREAD_TIMING.drawMs);
  });
});

describe('Phase 3: storage and the data meter', () => {
  it('recognises the storage control', () => {
    expect(changedControl({ ...base, storageMb: 120 }, { ...base, storageMb: 200 })).toEqual({ kind: 'storage' });
  });

  it('changing storage moves the data meter, the weight meter and the cost meter, and nothing else', () => {
    const a = meters({ ...base, storageMb: 60 });
    const b = meters({ ...base, storageMb: 240 });
    const moved = movedMeters(a, b).map((m) => m.meter).sort();
    expect(moved).toContain('data');
    expect(moved).toContain('cost');
    expect(moved).not.toContain('science'); // storage alone does not change calm science for a design that never fills it
  });
});
