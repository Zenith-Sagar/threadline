// @vitest-environment happy-dom
// Slice B in the DOM: choosing a variant on the Brief changes the numbers shown, carries into the Design Bay,
// and uses the same screens afterwards.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import { createGameStore } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { mountApp } from '@/ui/app';

const fakeLaunch: MountLaunch = async (_c, _p, cb) => {
  setTimeout(() => cb.onDone('finished'), 0);
  return { skip: () => cb.onDone('skipped'), destroy: () => undefined };
};
let unmount: () => void;
let store: ReturnType<typeof createGameStore>;
const button = (name: string | RegExp): HTMLButtonElement => {
  const hit = [...document.querySelectorAll('button')].find((b) => (typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? '')));
  if (!hit) throw new Error(`no button ${String(name)}`);
  return hit;
};
const radio = (id: string): HTMLInputElement => document.getElementById(`variant-${id}`) as HTMLInputElement;
const pick = (id: string): void => { const r = radio(id); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); };
/** Only the constraint panels (the radio labels also mention both budgets on purpose). */
const detailsText = (): string => document.querySelector('.brief-details')?.textContent ?? '';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  store = createGameStore({ mission: LUNAR_RECON, newSeed: () => 5 });
  unmount = mountApp(document.getElementById('app') as HTMLElement, store, { mountLaunch: fakeLaunch });
  button('Start mission').click();
});
afterEach(() => unmount());

describe('Brief: choose your mission', () => {
  it('offers four choices as one radio group, Standard selected, each with a sentence and its one number', () => {
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[name="variant"]')];
    expect(radios.map((r) => r.value)).toEqual(['standard', 'early-storm', 'tight-budget', 'data-rich']);
    expect(radio('standard').checked).toBe(true);
    expect(document.querySelectorAll('fieldset.variants legend')).toHaveLength(1);
    for (const l of document.querySelectorAll('label.variant')) {
      expect(l.querySelector('.variant-change')?.textContent).toMatch(/^Changes: /);
      expect(l.textContent).toContain('GAME MODEL');
    }
    expect(detailsText()).toContain('Budget: $175M');
  });

  it('Tight budget shows the lower budget at once (minus 15 percent) and the store follows', () => {
    pick('tight-budget');
    expect(store.getState().variant).toBe('tight-budget');
    expect(detailsText()).toContain('Budget: $149M');
    expect(detailsText()).not.toContain('Budget: $175M');
  });

  it('Early storm changes the storm window shown in "What makes this hard"', () => {
    expect(detailsText()).toContain('between 4 and 9');
    pick('early-storm');
    expect(detailsText()).toContain('between 2 and 4');
  });

  it('the choice carries into the Design Bay (cost meter shows the new budget)', () => {
    pick('tight-budget');
    button(/Open the Design Bay/).click();
    expect(document.querySelector('h1')?.textContent).toBe('Design Bay');
    expect(document.body.textContent).toContain('$149M budget');
  });

  it('choosing again keeps exactly one selection (a normal radio group, keyboard friendly)', () => {
    pick('data-rich');
    pick('standard');
    expect(document.querySelectorAll('input[name="variant"]:checked')).toHaveLength(1);
    expect(radio('standard').checked).toBe(true);
    expect(store.getState().variant).toBe('standard');
  });
});
