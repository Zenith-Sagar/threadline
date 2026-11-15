// @vitest-environment happy-dom
// DOM-level run of the whole loop with a fake launch (Phaser is never loaded here):
// Title -> Brief -> Design -> Launch -> Outcome -> Rewind -> Diff.
// The real-browser version of this (plus layout, focus and timing) is scripts/browser-audit.py.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LUNAR_RECON_CALM as LUNAR_RECON } from '@/content'; // Phase 2 loop on the storm-free mission
import { createGameStore } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { mountApp } from '@/ui/app';

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

const fakeLaunch: MountLaunch = async (_container, _plan, cb) => {
  setTimeout(() => cb.onDone('finished'), 0);
  return { skip: () => cb.onDone('skipped'), destroy: () => undefined };
};

let root: HTMLElement;
let unmount: () => void;
let seedUsed = 0;

const button = (name: string | RegExp): HTMLButtonElement => {
  const hit = [...document.querySelectorAll('button')].find((b) =>
    typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''),
  );
  if (!hit) throw new Error(`no button: ${String(name)}`);
  return hit;
};
const instrument = (name: string): HTMLInputElement => {
  const hit = [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find((i) => {
    const ids = (i.getAttribute('aria-labelledby') ?? '').split(' ');
    return ids.some((id) => document.getElementById(id)?.textContent?.includes(name));
  });
  if (!hit) throw new Error(`no instrument: ${name}`);
  return hit;
};
const h1 = (): string => document.querySelector('h1')?.textContent ?? '';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app') as HTMLElement;
  seedUsed = 42;
  const store = createGameStore({ mission: LUNAR_RECON, newSeed: () => seedUsed });
  unmount = mountApp(root, store, { mountLaunch: fakeLaunch });
});
afterEach(() => unmount());

describe('the complete loop', () => {
  it('goes Title -> Brief -> Design -> Launch -> Outcome -> Rewind -> Diff', async () => {
    expect(h1()).toBe('Threadline');
    button('Start mission').click();
    expect(h1()).toMatch(/^Mission brief/);
    button(/Open the Design Bay/).click();
    expect(h1()).toBe('Design Bay');

    // Not launchable yet: reasons are inline, never a modal.
    expect(document.querySelector('.validity')?.textContent).toContain('Cannot launch because');
    expect(document.querySelectorAll('[role="dialog"], dialog')).toHaveLength(0);

    for (const n of ['Radar sounder', 'Spectrometer', 'Magnetometer']) instrument(n).click();
    expect(document.querySelector('.validity')?.textContent).toContain('Ready to launch');
    expect(document.querySelector('.validity')?.textContent).toContain('safe mode on orbit 8');

    button('Launch').click();
    expect(h1()).toMatch(/^Launch/);
    await tick();
    expect(h1()).toMatch(/Partial success/);

    const chains = [...document.querySelectorAll('.chain')];
    expect(chains.length).toBeGreaterThanOrEqual(1);
    expect(chains.length).toBeLessThanOrEqual(3);
    expect(chains[0]?.textContent).toContain('Radar sounder');
    expect(chains[0]?.textContent).toMatch(/Safe mode on orbit 8/);

    button('Change one decision').click();
    expect(h1()).toBe('Design Bay');
    expect(document.querySelector('.rewind')?.textContent).toContain('42');
    instrument('Radar sounder').click(); // remove
    instrument('Imaging camera').click(); // add
    button('Run the mission again').click();
    await tick();

    expect(h1()).toBe('Compared with your last flight');
    const text = document.querySelector('main')?.textContent ?? '';
    expect(text).toContain('Partial');
    expect(text).toContain('Landmark'); // scoring v2: this rewind now earns Landmark (was Success)
    expect(text).toMatch(/Safe mode on orbit 8/);
    expect(text).toContain('Radar sounder');
  });

  it('refuses a 4th instrument and says why', async () => {
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    for (const n of ['Radar sounder', 'Spectrometer', 'Magnetometer', 'Thermal']) instrument(n).click();
    await tick();
    const chosen = ['Radar sounder', 'Spectrometer', 'Magnetometer', 'Thermal'].filter((n) => instrument(n).checked);
    expect(chosen).toEqual(['Radar sounder', 'Spectrometer', 'Magnetometer']);
    expect(document.getElementById('live')?.textContent).toMatch(/already have 3 instruments/i);
  });

  it('every meter carries a model label; the fuel meter carries the placeholder badge', () => {
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    const meters = [...document.querySelectorAll<HTMLElement>('.meter')];
    expect(meters.map((m) => m.dataset['meter']).sort()).toEqual(['cost', 'data', 'fuel', 'mass', 'power', 'science']) // Phase 3 adds the data meter;
    for (const m of meters) {
      expect(/GAME MODEL|SIMPLIFIED PHYSICS/.test(m.textContent ?? ''), m.dataset['meter']).toBe(true);
    }
    expect(meters.find((m) => m.dataset['meter'] === 'fuel')?.textContent).toMatch(/Unverified placeholder/i);
  });
});
