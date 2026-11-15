// The demo guard: if a content retune ever stops the demo from ending in Recovered, THIS test fails first.
import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { DEMO_LINES, DEMO_RESPONSE, DEMO_SEED, buildDemoDesign } from '@/core/demo';
import { createGameStore } from '@/core/store';
import { findPauseOrbit, simulate } from '@/sim';

describe('Demo Mode guard', () => {
  const design = buildDemoDesign(M);

  it('the demo design is valid and the storm gives a real decision', () => {
    expect(simulate(design, M, DEMO_SEED).valid).toBe(true);
    expect(findPauseOrbit(design, M, DEMO_SEED)).not.toBeNull();
  });

  it('the demo seed still ends in Recovered with the demo response, through the real simulate()', () => {
    const orbit = findPauseOrbit(design, M, DEMO_SEED);
    const r = simulate(design, M, DEMO_SEED, [{ orbit: orbit as number, response: DEMO_RESPONSE }]);
    expect(r.tier).toBe('Recovered');
    expect(r.log.some((e) => e.kind === 'decision')).toBe(true); // the choice is logged, not faked
  });

  it('riding the storm out on the same seed does NOT end Recovered (so the choice really mattered)', () => {
    const r = simulate(design, M, DEMO_SEED, []);
    expect(r.tier).not.toBe('Recovered');
    expect(r.tier).not.toBe('Success');
    expect(r.tier).not.toBe('Landmark');
  });

  it('through the store: startDemo then skip-to-outcome lands on the outcome screen as Recovered', () => {
    const store = createGameStore({ mission: M, newSeed: () => 1 });
    store.getState().startDemo();
    expect(store.getState().demo).toBe(true);
    expect(store.getState().seed).toBe(DEMO_SEED);
    expect(store.getState().screen).toBe('design');
    store.getState().demoSkipToOutcome();
    expect(store.getState().screen).toBe('outcome');
    expect(store.getState().result?.tier).toBe('Recovered');
    store.getState().exitDemo();
    expect(store.getState().demo).toBe(false);
    expect(store.getState().screen).toBe('title');
  });

  it('has a line for every screen, each one short', () => {
    for (const k of ['title', 'brief', 'design', 'launch', 'mission', 'outcome', 'diff']) {
      expect(DEMO_LINES[k]?.length).toBeGreaterThan(10);
      expect(DEMO_LINES[k]?.length).toBeLessThan(170);
    }
  });
});

describe('Demo Mode guard across variants (Slice B)', () => {
  it('stays on the standard variant and still ends Recovered, even after another variant was chosen', () => {
    for (const choice of ['early-storm', 'tight-budget', 'data-rich'] as const) {
      const store = createGameStore({ mission: M, newSeed: () => 1 });
      store.getState().setVariant(choice);
      store.getState().startDemo();
      expect(store.getState().variant).toBe('standard');
      store.getState().demoSkipToOutcome();
      expect(store.getState().result?.tier, choice).toBe('Recovered');
    }
  });
});
