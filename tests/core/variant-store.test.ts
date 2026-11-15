import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import { applyVariant } from '@/content/variants';
import { createGameStore } from '@/core/store';
import { bestKey, createSave } from '@/save/storage';

const mk = (): ReturnType<typeof createGameStore> => createGameStore({ mission: LUNAR_RECON, newSeed: () => 7 });

describe('variants in the store', () => {
  it('starts on the standard mission', () => {
    const s = mk().getState();
    expect(s.variant).toBe('standard');
    expect(s.mission).toBe(s.baseMission);
  });

  it('can be chosen on the title and brief screens, and the active mission follows', () => {
    const store = mk();
    store.getState().setVariant('tight-budget');
    expect(store.getState().variant).toBe('tight-budget');
    expect(store.getState().mission.rules.budgetM).toBe(applyVariant(LUNAR_RECON, 'tight-budget').rules.budgetM);
    store.getState().newMission(); // title -> brief keeps the choice
    expect(store.getState().screen).toBe('brief');
    store.getState().setVariant('early-storm');
    expect(store.getState().variant).toBe('early-storm');
  });

  it('cannot be changed once the design has started (so Rewind compares like with like)', () => {
    const store = mk();
    store.getState().setVariant('data-rich');
    store.getState().newMission();
    store.getState().go('design');
    expect(store.getState().screen).toBe('design');
    store.getState().setVariant('standard');
    expect(store.getState().variant).toBe('data-rich');
  });

  it('Demo Mode always runs the standard mission, whatever was chosen', () => {
    const store = mk();
    store.getState().setVariant('early-storm');
    store.getState().startDemo();
    expect(store.getState().variant).toBe('standard');
    expect(store.getState().mission).toBe(store.getState().baseMission);
  });

  it('resume restores the variant', () => {
    const store = mk();
    store.getState().resume(store.getState().design, 12, 'tight-budget');
    expect(store.getState().variant).toBe('tight-budget');
    expect(store.getState().mission.rules.budgetM).toBeLessThan(LUNAR_RECON.rules.budgetM);
  });
});

describe('best tier is stored per (seed, variant)', () => {
  it('standard keeps the old key, other variants add a suffix', () => {
    expect(bestKey(5)).toBe('5');
    expect(bestKey(5, 'standard')).toBe('5');
    expect(bestKey(5, 'early-storm')).toBe('5:early-storm');
  });
  it('the same seed in two variants keeps two separate bests', () => {
    const save = createSave(() => null);
    save.recordTier(5, 'Success', 'standard');
    save.recordTier(5, 'Partial', 'early-storm');
    save.recordTier(5, 'Recovered', 'early-storm');
    expect(save.read().bestTierBySeed['5']).toBe('Success');
    expect(save.read().bestTierBySeed['5:early-storm']).toBe('Recovered');
  });
});
