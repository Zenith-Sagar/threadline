import { describe, expect, it } from 'vitest';
import { beatIndexAt, LAUNCH_MS, launchBeats, makeLaunchPlan } from '@/scenes/launch-plan';

const plan = (outcome: 'success' | 'failure', reducedMotion = false) =>
  makeLaunchPlan({ outcome, vehicleName: 'Light launcher', reducedMotion });

describe('launch plan', () => {
  it('runs 8 to 12 seconds normally, for both outcomes', () => {
    for (const o of ['success', 'failure'] as const) {
      const d = plan(o).durationMs;
      expect(d).toBeGreaterThanOrEqual(8000);
      expect(d).toBeLessThanOrEqual(12000);
    }
  });
  it('is shorter and calmer with reduced motion', () => {
    expect(plan('success', true).durationMs).toBe(LAUNCH_MS.reduced);
    expect(plan('success', true).durationMs).toBeLessThan(plan('success').durationMs);
  });
  it('failure is not a bare "failed": it has a thrust loss, a safe flight end and an aftermath', () => {
    const text = launchBeats(plan('failure')).map((b) => b.caption).join(' ');
    expect(text).toMatch(/losing thrust/);
    expect(text).toMatch(/flight cannot continue/); // Q2: softened, no unsourced claim about range safety
    expect(text).toMatch(/trace what went wrong/);
    expect(launchBeats(plan('failure')).length).toBeGreaterThanOrEqual(5);
  });
  it('success and failure sequences differ after liftoff', () => {
    const s = launchBeats(plan('success')).map((b) => b.caption);
    const f = launchBeats(plan('failure')).map((b) => b.caption);
    expect(s.slice(0, 3)).toEqual(f.slice(0, 3));
    expect(s.slice(3)).not.toEqual(f.slice(3));
  });
  it('beats are ordered, start at 0 and finish before the end, at every duration', () => {
    for (const p of [plan('success'), plan('failure'), plan('success', true), plan('failure', true)]) {
      const beats = launchBeats(p);
      expect(beats[0]?.atMs).toBe(0);
      for (let i = 1; i < beats.length; i++) expect(beats[i]!.atMs).toBeGreaterThan(beats[i - 1]!.atMs);
      expect(beats[beats.length - 1]!.atMs).toBeLessThan(p.durationMs);
    }
  });
  it('beatIndexAt picks the current beat', () => {
    const beats = launchBeats(plan('success'));
    expect(beatIndexAt(beats, 0)).toBe(0);
    expect(beatIndexAt(beats, 2500)).toBe(1);
    expect(beatIndexAt(beats, 99999)).toBe(beats.length - 1);
  });
});
