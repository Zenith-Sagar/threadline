import { describe, expect, it } from 'vitest';
import { createGameStore } from '@/core/store';
import { LUNAR_RECON_CALM as LUNAR_RECON, LUNAR_RECON as STORM_MISSION } from '@/content'; // CALM = Phase 2 regression pins

const make = (seed = 42) => createGameStore({ mission: LUNAR_RECON, newSeed: () => seed });
const pick = (s: ReturnType<typeof make>, ids: string[]) => ids.forEach((id) => s.getState().toggleInstrument(id));

describe('game store', () => {
  it('starts on the title screen and begins a mission with a seed', () => {
    const s = make(1234);
    expect(s.getState().screen).toBe('title');
    s.getState().newMission();
    expect(s.getState().screen).toBe('brief');
    expect(s.getState().seed).toBe(1234);
    expect(s.getState().design.instruments).toEqual([]);
    s.getState().newMission(7);
    expect(s.getState().seed).toBe(7);
  });

  it('limits the design to 3 instruments and allows removing', () => {
    const s = make();
    s.getState().newMission();
    pick(s, ['radar', 'spectro', 'imager']);
    expect(s.getState().toggleInstrument('thermal')).toBe(false);
    expect(s.getState().design.instruments).toEqual(['radar', 'spectro', 'imager']);
    expect(s.getState().toggleInstrument('radar')).toBe(true);
    expect(s.getState().design.instruments).toEqual(['spectro', 'imager']);
    expect(s.getState().toggleInstrument('nope')).toBe(false);
  });

  it('clamps slider values to their ranges and ignores garbage', () => {
    const s = make();
    s.getState().newMission();
    s.getState().setBattery(9999);
    expect(s.getState().design.batteryWh).toBe(400);
    s.getState().setArray(-5);
    expect(s.getState().design.arrayW).toBe(100);
    s.getState().setPropellant(NaN);
    expect(s.getState().design.propellantKg).toBe(0);
    s.getState().setVehicle('nope');
    expect(s.getState().design.vehicle).toBe('light');
  });

  it('auto-sizes fuel to a 15% margin and the result validates', () => {
    const s = make();
    s.getState().newMission();
    pick(s, ['imager', 'spectro', 'magneto']);
    s.getState().autoSizeFuel();
    expect(s.getState().launch()).toBe(true);
    const margin = s.getState().result!.metrics!.dvMarginFrac;
    expect(margin).toBeGreaterThanOrEqual(0.15);
    expect(margin).toBeLessThan(0.17);
  });

  it('refuses to launch an invalid design without changing screen, and counts the attempt', () => {
    const s = make();
    s.getState().newMission();
    s.getState().go('design');
    expect(s.getState().launch()).toBe(false);
    expect(s.getState().screen).toBe('design');
    expect(s.getState().blockedLaunches).toBe(1);
    expect(s.getState().result).toBeNull();
  });

  it('runs the full loop: launch, outcome, rewind with the same seed, diff', () => {
    const s = make(42);
    s.getState().newMission();
    pick(s, ['radar', 'spectro', 'magneto']);
    s.getState().autoSizeFuel();
    expect(s.getState().launch()).toBe(true);
    expect(s.getState().screen).toBe('launch');
    expect(s.getState().result?.metrics?.brownoutOrbits.length).toBeGreaterThan(0);
    s.getState().finishLaunch();
    expect(s.getState().screen).toBe('outcome');

    s.getState().beginRewind('instrument:radar');
    expect(s.getState().screen).toBe('design');
    expect(s.getState().seed).toBe(42); // luck stays the same
    expect(s.getState().baseline).not.toBeNull();

    s.getState().toggleInstrument('radar');
    s.getState().toggleInstrument('imager');
    s.getState().autoSizeFuel();
    expect(s.getState().launch()).toBe(true);
    expect(s.getState().screen).toBe('diff'); // rewinds skip the launch animation
    const diff = s.getState().diff!;
    expect(diff.tier.direction).toBe('better');
    expect(diff.events.vanished.length).toBeGreaterThan(0);
    expect(s.getState().decisionChanges.map((c) => c.key)).toContain('instrument:radar');
  });

  it('cancelRewind restores the design from the run being rewound', () => {
    const s = make();
    s.getState().newMission();
    pick(s, ['imager', 'spectro', 'magneto']);
    s.getState().autoSizeFuel();
    s.getState().launch();
    s.getState().finishLaunch();
    s.getState().beginRewind();
    s.getState().toggleInstrument('imager');
    s.getState().cancelRewind();
    expect(s.getState().screen).toBe('outcome');
    expect(s.getState().design.instruments).toEqual(['imager', 'spectro', 'magneto']);
    expect(s.getState().baseline).toBeNull();
  });

  it('continueRewind uses the newest run as the next baseline', () => {
    const s = make();
    s.getState().newMission();
    pick(s, ['radar', 'spectro', 'magneto']);
    s.getState().autoSizeFuel();
    s.getState().launch();
    s.getState().finishLaunch();
    s.getState().beginRewind();
    s.getState().toggleInstrument('radar');
    s.getState().toggleInstrument('imager');
    s.getState().autoSizeFuel();
    s.getState().launch();
    const second = s.getState().result;
    s.getState().continueRewind();
    expect(s.getState().screen).toBe('design');
    expect(s.getState().baseline?.result).toBe(second);
    expect(s.getState().diff).toBeNull();
  });
});

describe('finishLaunch is idempotent (found while testing Demo Mode)', () => {
  it('a late launch-animation callback does not pull the player back from the outcome', () => {
    const store = createGameStore({ mission: STORM_MISSION, newSeed: () => 29 }); // the storm mission: it has a Mission Control to be pulled back to
    store.getState().startDemo();
    store.getState().demoSkipToOutcome();
    expect(store.getState().screen).toBe('outcome');
    store.getState().finishLaunch(); // what the animation's onDone does if it fires late
    expect(store.getState().screen).toBe('outcome');
  });
});
