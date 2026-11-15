// @vitest-environment happy-dom
// DOM tests for Mission Control (Phase 3): pacing, the storm pause, the three responses, keyboard
// operability, live-region announcements, and Rewind changing only the storm response.
// Phaser is never loaded: the launch is faked. Timers are fake so 0.5 s ticks are exact.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LUNAR_RECON } from '@/content';
import { createGameStore } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { mountApp } from '@/ui/app';
import { TICK_MS } from '@/ui/screens/mission';

/** Launch always succeeds for the Medium launcher on this seed; the storm reaches the Moon on orbit 7. */
const SEED = 1;

const fakeLaunch: MountLaunch = async (_container, _plan, cb) => {
  setTimeout(() => cb.onDone('finished'), 0);
  return { skip: () => cb.onDone('skipped'), destroy: () => undefined };
};

let unmount: () => void;
let store: ReturnType<typeof createGameStore>;

const button = (name: string | RegExp): HTMLButtonElement => {
  const hit = [...document.querySelectorAll('button')].find((b) =>
    typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''),
  );
  if (!hit) throw new Error(`no button: ${String(name)}`);
  return hit;
};
const maybeButton = (name: RegExp): HTMLButtonElement | undefined =>
  [...document.querySelectorAll('button')].find((b) => name.test(b.textContent ?? ''));
const mission = (): HTMLElement => document.querySelector('.screen--mission') as HTMLElement;
const phase = (): string => mission().dataset['phase'] ?? '';
const revealed = (): number => Number(mission().dataset['revealed']);
const live = (): string => document.getElementById('live')?.textContent ?? '';
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
};

/** Build a valid design through the store (the Design Bay's own actions), launch, and land in Mission Control. */
async function flyToMissionControl(): Promise<number> {
  store.getState().newMission(SEED);
  for (const id of ['imager', 'spectro', 'thermal']) store.getState().toggleInstrument(id);
  store.getState().setVehicle('medium');
  store.getState().setBattery(150);
  store.getState().setArray(320);
  store.getState().autoSizeFuel();
  expect(store.getState().launch()).toBe(true);
  await advance(5);
  return store.getState().pauseOrbit as number;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  store = createGameStore({ mission: LUNAR_RECON, newSeed: () => SEED });
  unmount = mountApp(document.getElementById('app') as HTMLElement, store, { mountLaunch: fakeLaunch });
});
afterEach(() => {
  unmount();
  vi.useRealTimers();
});

describe('Mission Control', () => {
  it('follows the launch (the storm needs a decision) instead of jumping to the outcome', async () => {
    const pause = await flyToMissionControl();
    expect(pause).toBe(7);
    expect(store.getState().screen).toBe('mission');
    expect(document.querySelector('h1')?.textContent).toBe('Mission Control');
    expect(phase()).toBe('running');
  });

  it(`advances one orbit every ${TICK_MS} ms and pauses before the storm orbit`, async () => {
    const pause = await flyToMissionControl();
    await advance(TICK_MS * 2);
    expect(revealed()).toBe(2);
    await advance(TICK_MS * (pause - 1 - 2));
    expect(revealed()).toBe(pause - 1);
    expect(phase()).toBe('deciding');
    // Nothing more happens while the player thinks, however long that takes.
    await advance(60_000);
    expect(revealed()).toBe(pause - 1);
    expect(phase()).toBe('deciding');
  });

  it('shows a storm warning with all three responses, their costs and risks, and no recommendation', async () => {
    await flyToMissionControl();
    button(/Skip to the storm decision/).click();
    expect(phase()).toBe('deciding');
    expect(document.querySelector('.storm-panel h2')?.textContent).toMatch(/Solar storm warning: orbit 7/);
    const options = [...document.querySelectorAll<HTMLElement>('.response')];
    expect(options.map((o) => o.dataset['response'])).toEqual(['ride-out', 'shed-heaviest', 'safe-mode']);
    for (const o of options) {
      const text = o.textContent ?? '';
      expect(text).toContain('Costs');
      expect(text).toContain('Risks');
      expect(text).toContain('Power');
      expect(text).toContain('GAME MODEL');
      expect(text).not.toMatch(/recommend|best choice|safest|optimal/i);
      // Phase 7 (F4): the button moved out of the card into the shared Choose row (still one per response).
      expect(o.querySelector('button')).toBeNull();
      expect(document.querySelector(`.choose-row button[data-choose="${o.dataset['response']}"]`)).not.toBeNull();
    }
    // Phase 7 (F4): the chance is stated ONCE for the whole decision, not in every card.
    const shared = document.querySelectorAll('.storm-panel .storm-risk');
    expect(shared).toHaveLength(1);
    expect(shared[0]?.textContent).toContain('15% chance of permanent radiation damage');
    expect(document.querySelector('.storm-panel')?.textContent?.match(/chance of permanent radiation damage/g)).toHaveLength(1);
    // ...and each card still names the instruments it leaves exposed (or says nothing is).
    expect(options[0]?.textContent).toMatch(/Left running and exposed: Imaging camera/);
    expect(options[2]?.textContent).toMatch(/Nothing is left running/);
    expect(options[2]?.textContent).toContain('no radiation damage');
  });

  it('moves focus to the warning and announces it to screen readers', async () => {
    await flyToMissionControl();
    button(/Skip to the storm decision/).click();
    expect(document.activeElement?.id).toBe('storm-title');
    await advance(10);
    expect(live()).toMatch(/Solar storm warning on orbit 7/);
  });

  it('Skip never skips the decision: it stops at the storm', async () => {
    await flyToMissionControl();
    expect(button(/Skip to the storm decision/)).toBeTruthy();
    button(/Skip to the storm decision/).click();
    expect(revealed()).toBe(6);
    expect(phase()).toBe('deciding');
    expect(store.getState().interventions).toEqual([]); // nothing was decided for the player
  });

  it('Pause stops the ticks and Resume restarts them', async () => {
    await flyToMissionControl();
    await advance(TICK_MS * 2);
    button('Pause').click();
    expect(button('Resume').getAttribute('aria-pressed')).toBe('true');
    await advance(10_000);
    expect(revealed()).toBe(2);
    button('Resume').click();
    await advance(TICK_MS);
    expect(revealed()).toBe(3);
  });

  it('records the chosen response, finishes within 45 s, and leads to the outcome', async () => {
    await flyToMissionControl();
    const started = 0;
    button(/Skip to the storm decision/).click();
    button(/Choose: Switch off the/).click();
    expect(store.getState().interventions).toEqual([{ orbit: 7, response: 'shed-heaviest' }]);
    expect(document.activeElement?.textContent).toMatch(/Pause/); // focus returns to the playback controls
    // 8 orbits (7-14) left at one tick each.
    await advance(TICK_MS * 8);
    expect(phase()).toBe('finished');
    // The whole phase (all 14 orbits, answering instantly) is far inside the 45 s budget.
    expect(TICK_MS * 14 - started).toBeLessThanOrEqual(45_000);
    button('See the outcome').click();
    expect(store.getState().screen).toBe('outcome');
    expect(document.querySelector('main')?.textContent).toMatch(/You chose: Switch off the/);
  });

  it('orbit cells always say their status in words and with an icon, never colour alone', async () => {
    await flyToMissionControl();
    button(/Skip to the storm decision/).click();
    const cells = [...document.querySelectorAll<HTMLElement>('.orbit-cell[data-status]')];
    expect(cells).toHaveLength(6);
    for (const c of cells) {
      expect(c.textContent).toMatch(/OK|Safe mode|Storage full/);
      expect(c.querySelector('svg')).not.toBeNull();
    }
  });

  it('every control on the screen is a real, enabled, focusable button', async () => {
    await flyToMissionControl();
    button(/Skip to the storm decision/).click();
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.screen--mission button')];
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    for (const b of buttons) {
      expect(b.disabled).toBe(false);
      expect(b.tabIndex).toBeGreaterThanOrEqual(0);
      expect((b.textContent ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('a failed launch skips Mission Control: there is no storm to decide', async () => {
    store.getState().newMission(16); // seed 16 fails the Medium launcher
    for (const id of ['imager', 'spectro', 'thermal']) store.getState().toggleInstrument(id);
    store.getState().setVehicle('medium');
    store.getState().setArray(320);
    store.getState().autoSizeFuel();
    expect(store.getState().launch()).toBe(true);
    await advance(5);
    expect(store.getState().pauseOrbit).toBeNull();
    expect(store.getState().screen).toBe('outcome');
    expect(maybeButton(/Skip to the storm decision/)).toBeUndefined();
  });
});

describe('Rewind with a storm', () => {
  it('can change only the storm response, with the same seed and design', async () => {
    await flyToMissionControl();
    button(/Skip to the storm decision/).click();
    button(/Choose: Ride it out/).click();
    button(/Skip to the end/).click();
    button('See the outcome').click();
    const before = store.getState();
    const designBefore = JSON.stringify(before.design);
    const tierBefore = before.result?.tier;

    button(/Change one decision/).click();
    expect(store.getState().screen).toBe('design');
    const picker = document.querySelector<HTMLElement>('.response-pick');
    expect(picker?.hidden).toBe(false);
    const safe = document.querySelector<HTMLInputElement>('input[name="storm-response"][value="safe-mode"]');
    safe?.click();
    expect(store.getState().interventions).toEqual([{ orbit: 7, response: 'safe-mode' }]);

    button(/Run the mission again/).click();
    const after = store.getState();
    expect(after.screen).toBe('diff');
    expect(after.seed).toBe(SEED);
    expect(JSON.stringify(after.design)).toBe(designBefore);
    expect(after.decisionChanges.map((c) => c.key)).toEqual(['response']);
    expect(after.diff?.tier.before).toBe(tierBefore);
    expect(document.querySelector('main')?.textContent).toMatch(/Storm response/);
  });

  it('Phase 7 (F4): the three Choose buttons are in ONE group outside the cards, each pointing at its own card', async () => {
    await flyToMissionControl();
    button(/Skip to the storm decision/).click();
    const row = document.querySelector('.choose-row');
    expect(row?.getAttribute('role')).toBe('group');
    const buttons = [...document.querySelectorAll('.choose-row button')];
    expect(buttons).toHaveLength(3);
    expect(document.querySelectorAll('.response button')).toHaveLength(0); // no button left inside a card
    for (const b of buttons) {
      const id = b.getAttribute('aria-describedby') ?? '';
      const card = document.getElementById(id);
      expect(card?.classList.contains('response'), `${id} must be a card`).toBe(true);
      // the card named by the button is the one for the same response id, and it still holds that response's cost and risk
      expect(card?.getAttribute('data-response')).toBe(b.getAttribute('data-choose'));
      expect(card?.textContent).toMatch(/Costs/);
      expect(card?.textContent).toMatch(/Risks/);
    }
    expect(buttons.map((b) => b.textContent)).toEqual(
      [...document.querySelectorAll('.response h3')].map((h) => `Choose: ${h.textContent}`),
    );
  });
});
