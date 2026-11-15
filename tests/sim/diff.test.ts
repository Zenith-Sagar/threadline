import { describe, expect, it } from 'vitest';
import { LUNAR_RECON_CALM as LUNAR_RECON } from '@/content'; // Phase 1/2 regression: storm-free mission
import { diffDesigns, diffResults, simulate } from '@/sim';
import { buildDesign } from './helpers';

describe('diffResults', () => {
  it('shows safe mode vanishing when the radar is swapped for the imager', () => {
    const before = buildDesign(['radar', 'spectro', 'magneto'], 'light');
    const after = buildDesign(['imager', 'spectro', 'magneto'], 'light');
    const d = diffResults(simulate(before, LUNAR_RECON, 42), simulate(after, LUNAR_RECON, 42));
    expect(d.tier).toEqual({ before: 'Partial', after: 'Landmark', direction: 'better' }); // Phase 3: was Success
    expect(d.sciencePct).toEqual({ before: 93, after: 100, delta: 7 });
    expect(d.events.vanished).toEqual(['Safe mode on orbit 8']);
    expect(d.events.appeared).toEqual([]);
    expect(d.numbers.loadW.before).toBeGreaterThan(d.numbers.loadW.after);
  });

  it('shows a launch failure vanishing with a more reliable launcher (same seed 37)', () => {
    const before = buildDesign(['imager', 'spectro', 'magneto'], 'light');
    const after = buildDesign(['imager', 'spectro', 'magneto'], 'heavy');
    const d = diffResults(simulate(before, LUNAR_RECON, 37), simulate(after, LUNAR_RECON, 37));
    expect(d.tier.before).toBe('Lost with Lessons');
    expect(d.tier.after).toBe('Landmark'); // Phase 3: was Success
    expect(d.events.vanished).toEqual(['Launch failure']);
  });

  it('reports "same" and unchanged events when nothing improves', () => {
    const d0 = buildDesign(['radar', 'spectro', 'magneto'], 'light');
    const r = simulate(d0, LUNAR_RECON, 42);
    const d = diffResults(r, r);
    expect(d.tier.direction).toBe('same');
    expect(d.events.unchanged).toEqual(['Safe mode on orbit 8']);
    expect(d.sciencePct.delta).toBe(0);
  });

  it('can detect a worse outcome', () => {
    const good = simulate(buildDesign(['imager', 'spectro', 'magneto'], 'light'), LUNAR_RECON, 42);
    const bad = simulate(buildDesign(['radar', 'spectro', 'magneto'], 'light'), LUNAR_RECON, 42);
    expect(diffResults(good, bad).tier.direction).toBe('worse');
  });
});

describe('diffDesigns', () => {
  it('lists every changed decision in plain language', () => {
    const a = buildDesign(['radar', 'spectro', 'magneto'], 'light', 150, 200);
    const b = { ...buildDesign(['imager', 'spectro', 'magneto'], 'medium', 225, 200), propellantKg: a.propellantKg };
    const changes = diffDesigns(a, b, LUNAR_RECON);
    expect(changes).toContainEqual({ key: 'instrument:radar', label: 'Instrument removed', from: 'Radar sounder', to: 'none' });
    expect(changes).toContainEqual({ key: 'instrument:imager', label: 'Instrument added', from: 'none', to: 'Imaging camera' });
    expect(changes).toContainEqual({ key: 'vehicle', label: 'Launcher', from: 'Light launcher', to: 'Medium launcher' });
    expect(changes).toContainEqual({ key: 'battery', label: 'Battery', from: '150 Wh', to: '225 Wh' });
    expect(changes.find((c) => c.key === 'fuel')).toBeUndefined();
    expect(diffDesigns(a, a, LUNAR_RECON)).toEqual([]);
  });
});
