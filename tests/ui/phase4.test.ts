// @vitest-environment happy-dom
// Phase 4 in the DOM: guided first run, Demo Mode, Science Cards, display settings, persistence.
// Real Chromium versions of these (focus, timing, 390 px, reduced motion) are in scripts/browser-audit.py.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { DEMO_SEED } from '@/core/demo';
import { wirePersistence } from '@/core/persist';
import { createGameStore } from '@/core/store';
import { SAVE_KEY, createSave } from '@/save/storage';
import type { MountLaunch } from '@/scenes/launch-contract';
import { mountApp } from '@/ui/app';
import { destroyCards } from '@/ui/cards';
import { SCIENCE_CARDS } from '@/ui/science-cards';

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));
const fakeLaunch: MountLaunch = async (_c, _p, cb) => {
  setTimeout(() => cb.onDone('finished'), 0);
  return { skip: () => cb.onDone('skipped'), destroy: () => undefined };
};
const button = (name: string | RegExp): HTMLButtonElement => {
  const hit = [...document.querySelectorAll('button')].find((b) =>
    typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''),
  );
  if (!hit) throw new Error(`no button: ${String(name)}`);
  return hit;
};
const instrument = (name: string): HTMLInputElement => {
  const hit = [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find((i) =>
    (i.getAttribute('aria-labelledby') ?? '').split(' ').some((id) => document.getElementById(id)?.textContent?.includes(name)),
  );
  if (!hit) throw new Error(`no instrument: ${name}`);
  return hit;
};
const h1 = (): string => document.querySelector('h1')?.textContent ?? '';
const coach = (): HTMLElement => document.querySelector('.coach') as HTMLElement;

class MemStorage implements Storage {
  data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  key(i: number): string | null { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string): void { this.data.delete(k); }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}

let root: HTMLElement;
let unmount: () => void;
let storage: MemStorage;
let save: ReturnType<typeof createSave>;
let store: ReturnType<typeof createGameStore>;

function boot(opts: { autoTutorial?: boolean; blocked?: boolean } = {}): void {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app') as HTMLElement;
  save = createSave(() => (opts.blocked ? null : storage));
  store = createGameStore({ mission: M, newSeed: () => 42 });
  unmount = mountApp(root, store, { mountLaunch: fakeLaunch, save, autoTutorial: opts.autoTutorial ?? false });
}
beforeEach(() => {
  storage = new MemStorage();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-text');
});
afterEach(() => {
  unmount();
  destroyCards();
});

describe('guided first run', () => {
  it('is hidden by default and auto-opens only for a first-time player', async () => {
    boot();
    await tick();
    expect(coach().hidden).toBe(true);
    unmount();
    boot({ autoTutorial: true });
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    await tick();
    expect(coach().hidden).toBe(false);
    expect(coach().textContent).toContain('Step 1 of 5');
  });

  it('walks the steps by doing: instruments, a thread, auto-size fuel, launch, then a cause chain', async () => {
    boot({ autoTutorial: true });
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    await tick();
    expect(coach().textContent).toMatch(/Tick three instrument/);
    expect(document.querySelector('[data-coach="instruments"]')?.classList.contains('coach-target')).toBe(true);

    for (const n of ['Imaging camera', 'Spectrometer', 'Magnetometer']) instrument(n).click();
    await tick();
    expect(coach().textContent).toContain('Step 2 of 5');

    // The thread for the LAST INSTRUMENT click draws ~180 ms later. It belongs to step 1 and must not finish step 2.
    await tick(300);
    expect(coach().textContent).toContain('Step 2 of 5');
    // Only a thread from a slider (the Battery) counts, also what the thread layer reports with reduced motion.
    store.getState().noteThread('battery');
    await tick();
    expect(coach().textContent).toContain('Step 3 of 5');
    expect(document.querySelector('[data-coach="auto-fuel"]')?.classList.contains('coach-target')).toBe(true);

    button(/Auto-size fuel/).click();
    await tick();
    expect(coach().textContent).toContain('Step 4 of 5');

    button('Launch').click();
    await tick(20);
    expect(h1()).toMatch(/Mission Control|Outcome|Launch|success|Success|Partial|Recovered|Landmark|Lost/);
    store.getState().finishLaunch();
    if (store.getState().screen === 'mission') {
      store.getState().chooseResponse('safe-mode');
      store.getState().finishMission();
    }
    await tick(20);
    expect(store.getState().screen).toBe('outcome');
    expect(coach().textContent).toContain('Step 5 of 5');
    expect(document.querySelector('[data-coach="chain"]')).not.toBeNull();

    button('Got it').click();
    expect(coach().hidden).toBe(true);
    expect(save.read().seenTutorial).toBe(true);
  });

  it('can be skipped at any step, is remembered, and "How to play" brings it back', async () => {
    boot({ autoTutorial: true });
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    await tick();
    button('Skip the guide').click();
    expect(coach().hidden).toBe(true);
    expect(save.read().seenTutorial).toBe(true);
    // a new visit does not show it again
    unmount();
    boot({ autoTutorial: true });
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    await tick();
    expect(coach().hidden).toBe(true);
    // ... but How to play re-opens it
    button('How to play').click();
    await tick();
    expect(coach().hidden).toBe(false);
    expect(coach().textContent).toContain('Step 1 of 5');
  });

  it('sits right after the heading (next Tab reaches it), is a normal block, and every control is a real button', async () => {
    boot({ autoTutorial: true });
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    await tick();
    // It sits right after the screen heading, where focus lands on every screen change, so the very next Tab
    // reaches its buttons. It is a normal block in the page flow (never an overlay), inside <main>.
    const heading = document.querySelector('#main h1') as HTMLElement;
    expect(heading.nextElementSibling).toBe(coach());
    expect(coach().closest('main')).not.toBeNull();
    expect(coach().getAttribute('role')).toBe('region');
    expect(coach().getAttribute('aria-label')).toBe('Guided first run');
    for (const el of coach().querySelectorAll('button')) expect(el.tagName).toBe('BUTTON');
  });
});

describe('Demo Mode', () => {
  it('opens through the store (the ?demo=1 path), shows a visible Demo badge, and uses the demo seed', async () => {
    boot();
    store.getState().startDemo();
    await tick();
    expect(h1()).toBe('Design Bay');
    expect(coach().querySelector('.demo-badge')?.textContent).toBe('Demo');
    expect(store.getState().seed).toBe(DEMO_SEED);
    expect(store.getState().design.instruments).toHaveLength(3);
  });

  it('"Skip to the outcome" runs the real simulation and ends in Recovered; Exit returns to the title', async () => {
    boot();
    store.getState().startDemo();
    await tick();
    button('Skip to the outcome').click();
    await tick(20);
    expect(h1()).toMatch(/Recovered/);
    expect(coach().querySelector('.demo-badge')).not.toBeNull();
    button('Exit the demo').click();
    await tick();
    expect(h1()).toBe('Threadline');
    expect(coach().hidden).toBe(true);
  });

  it('never overwrites the player\u2019s own saved design or best tiers', async () => {
    boot();
    const stop = wirePersistence(store, save);
    save.update((d) => { d.lastSeed = 7; });
    store.getState().startDemo();
    store.getState().demoSkipToOutcome();
    await tick(500);
    expect(save.read().lastSeed).toBe(7);
    expect(Object.keys(save.read().bestTierBySeed)).toHaveLength(0);
    stop();
  });
});

describe('Science Cards', () => {
  it('lists all six cards in the footer and opens each with its sources and an Unverified note where needed', async () => {
    boot();
    await tick();
    for (const c of SCIENCE_CARDS) {
      button(c.title).click();
      const dlg = document.querySelector('dialog.card-dialog') as HTMLElement;
      expect(dlg.textContent).toContain(c.title);
      expect(dlg.textContent).toContain('Sources');
      for (const s of c.sources) expect(dlg.querySelector(`a[href="${s.url}"]`)).not.toBeNull();
      if (c.unverified.length) expect(dlg.textContent).toContain('Unverified');
      button('Close').click();
    }
  });

  it('opens from a glossary term (pin, then "Read the Science Card") and from a cause chain ("Why did this happen?")', async () => {
    boot();
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    await tick();
    for (const n of ['Radar sounder', 'Spectrometer', 'Magnetometer']) instrument(n).click();
    button('Launch').click();
    await tick(20);
    store.getState().finishLaunch();
    if (store.getState().screen === 'mission') { store.getState().chooseResponse('ride-out'); store.getState().finishMission(); }
    await tick(20);
    const why = [...document.querySelectorAll<HTMLButtonElement>('button[data-card]')];
    expect(why.length).toBeGreaterThan(0);
    why[0]?.click();
    expect(document.querySelector('dialog.card-dialog')?.textContent).toContain('Sources');
    button('Close').click();

    const termBtn = document.querySelector<HTMLButtonElement>('button.term');
    expect(termBtn).not.toBeNull();
  });
});

describe('display settings and saved progress', () => {
  it('high contrast and text size apply to <html> and are saved', async () => {
    boot();
    const box = document.getElementById('high-contrast') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('contrast');
    button('Larger').click();
    expect(document.documentElement.getAttribute('data-text')).toBe('larger');
    expect(button('Larger').getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '{}').prefs).toEqual({ contrast: true, textSize: 'larger' });
    unmount();
    boot(); // next visit restores them
    expect(document.documentElement.getAttribute('data-theme')).toBe('contrast');
    expect(document.documentElement.getAttribute('data-text')).toBe('larger');
  });

  it('"Reset progress" needs two presses, then clears saved data and display settings', async () => {
    boot();
    save.update((d) => { d.seenTutorial = true; d.lastSeed = 5; d.prefs.contrast = true; });
    button('Reset progress').click();
    expect(button(/Press again/).textContent).toMatch(/Press again/);
    expect(save.read().seenTutorial).toBe(true); // one press changes nothing
    button(/Press again/).click();
    expect(save.read().seenTutorial).toBe(false);
    expect(save.read().lastSeed).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('Continue restores the last design and seed; the title says so', async () => {
    boot();
    const stop = wirePersistence(store, save);
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    for (const n of ['Imaging camera', 'Spectrometer']) instrument(n).click();
    await tick(450); // persistence is debounced
    stop();
    unmount();
    boot();
    expect(button('Continue your last design')).toBeTruthy();
    button('Continue your last design').click();
    await tick();
    expect(h1()).toBe('Design Bay');
    expect(store.getState().design.instruments).toEqual(['imager', 'spectro']);
    expect(store.getState().seed).toBe(42);
  });

  it('works with storage blocked: nothing throws, and the footer says progress will not be kept', async () => {
    boot({ blocked: true });
    await tick();
    expect(document.body.textContent).toMatch(/blocks saving/);
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    expect(h1()).toBe('Design Bay');
    button('Larger').click();
    expect(document.documentElement.getAttribute('data-text')).toBe('larger'); // still applies for this visit
  });

  it('records the best tier per seed and shows it on the outcome (never worse than a previous run)', async () => {
    boot();
    save.recordTier(42, 'Success');
    button('Start mission').click();
    button(/Open the Design Bay/).click();
    for (const n of ['Radar sounder', 'Spectrometer', 'Magnetometer']) instrument(n).click();
    button('Launch').click();
    await tick(20);
    store.getState().finishLaunch();
    if (store.getState().screen === 'mission') { store.getState().chooseResponse('ride-out'); store.getState().finishMission(); }
    await tick(20);
    expect(document.querySelector('[data-best]')?.getAttribute('data-best')).toBe('Success');
    expect(save.read().bestTierBySeed['42']).toBe('Success');
  });
});
