import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_STEPS, initialTutorial, reduceTutorial, tutorialFinished, visibleStep,
  type Observation, type TutorialState,
} from '@/core/tutorial';

const obs = (o: Partial<Observation> = {}): Observation => ({
  screen: 'design', instrumentCount: 0, threadsDrawn: 0, threadControl: null, autoSizes: 0, ...o,
});
const start = (o?: Partial<Observation>): TutorialState => reduceTutorial(initialTutorial(), { type: 'start', obs: obs(o) });
const see = (s: TutorialState, o: Partial<Observation>): TutorialState => reduceTutorial(s, { type: 'observe', obs: obs(o) });

describe('guided first run: shape', () => {
  it('has at most five steps, each one short sentence with one action', () => {
    expect(TUTORIAL_STEPS.length).toBeLessThanOrEqual(5);
    for (const s of TUTORIAL_STEPS) {
      expect(s.text.split(/[.!?]\s/).filter(Boolean)).toHaveLength(1);
      expect(s.text.length).toBeLessThan(120);
      expect(s.action.length).toBeGreaterThan(0);
    }
  });
});

describe('guided first run: state machine', () => {
  it('starts on step 1 and shows only on the design screen', () => {
    const s = start();
    expect(s.status).toBe('active');
    expect(s.step).toBe(0);
    expect(visibleStep(s, 'design')?.id).toBe('instruments');
    expect(visibleStep(s, 'title')).toBeNull();
    expect(visibleStep(initialTutorial(), 'design')).toBeNull();
  });

  it('walks the five steps in order, one real action each', () => {
    let s = start();
    s = see(s, { instrumentCount: 2 });
    expect(s.step).toBe(0); // two is not three
    s = see(s, { instrumentCount: 3 });
    expect(visibleStep(s, 'design')?.id).toBe('thread');
    s = see(s, { instrumentCount: 3, threadsDrawn: 0 });
    expect(s.step).toBe(1); // nothing drawn yet
    s = see(s, { instrumentCount: 3, threadsDrawn: 1, threadControl: 'battery' });
    expect(visibleStep(s, 'design')?.id).toBe('fuel');
    s = see(s, { instrumentCount: 3, threadsDrawn: 1, threadControl: 'battery', autoSizes: 1 });
    expect(visibleStep(s, 'design')?.id).toBe('launch');
    s = see(s, { screen: 'launch', instrumentCount: 3, threadsDrawn: 1, threadControl: 'battery', autoSizes: 1 });
    expect(s.step).toBe(4);
    expect(visibleStep(s, 'launch')).toBeNull(); // hidden during the flight
    expect(visibleStep(s, 'mission')).toBeNull();
    expect(visibleStep(s, 'outcome')?.id).toBe('chain');
    s = reduceTutorial(s, { type: 'ack' });
    expect(s.status).toBe('done');
    expect(tutorialFinished(s)).toBe(true);
  });

  it('a thread drawn BEFORE the thread step does not count (a step needs a fresh action)', () => {
    let s = start({ threadsDrawn: 5 });
    s = see(s, { instrumentCount: 3, threadsDrawn: 5 });
    expect(s.step).toBe(1);
    s = see(s, { instrumentCount: 3, threadsDrawn: 5 });
    expect(s.step).toBe(1);
    s = see(s, { instrumentCount: 3, threadsDrawn: 6, threadControl: 'battery' });
    expect(s.step).toBe(2);
  });

  it('the thread that finishes drawing after the third instrument tick does NOT complete the thread step', () => {
    let s = start();
    s = see(s, { instrumentCount: 3, threadsDrawn: 0 });
    expect(s.step).toBe(1);
    s = see(s, { instrumentCount: 3, threadsDrawn: 1, threadControl: 'instrument' }); // draws just after the tick
    expect(s.step).toBe(1);
    s = see(s, { instrumentCount: 3, threadsDrawn: 2, threadControl: 'battery' }); // the player moved the slider
    expect(s.step).toBe(2);
  });

  it('a player who races ahead and launches early jumps to the matching step', () => {
    let s = start();
    s = see(s, { screen: 'outcome', instrumentCount: 3 });
    expect(visibleStep(s, 'outcome')?.id).toBe('chain');
  });

  it('can be dismissed at every step and then stays dismissed', () => {
    for (let n = 0; n < TUTORIAL_STEPS.length; n++) {
      let s = start();
      s = see(s, { instrumentCount: n >= 1 ? 3 : 0, threadsDrawn: n >= 2 ? 1 : 0, threadControl: n >= 2 ? 'battery' : null, autoSizes: n >= 3 ? 1 : 0, screen: n >= 4 ? 'outcome' : 'design' });
      const dismissed = reduceTutorial(s, { type: 'skip' });
      expect(dismissed.status).toBe('dismissed');
      expect(tutorialFinished(dismissed)).toBe(true);
      expect(visibleStep(dismissed, 'design')).toBeNull();
      expect(see(dismissed, { instrumentCount: 3 }).status).toBe('dismissed'); // observations do not revive it
    }
  });

  it('can be re-opened from "How to play" after finishing', () => {
    const done = reduceTutorial(see(start(), { screen: 'outcome' }), { type: 'ack' });
    expect(done.status).toBe('done');
    const again = reduceTutorial(done, { type: 'start', obs: obs() });
    expect(again.status).toBe('active');
    expect(again.step).toBe(0);
  });

  it('re-opening mid-game skips what is already done', () => {
    const s = start({ instrumentCount: 3 });
    expect(s.step).toBe(1);
  });

  it('"Got it" does nothing before the last step, and leaving for the diff screen finishes it', () => {
    const s = start();
    expect(reduceTutorial(s, { type: 'ack' })).toEqual(s);
    const atChain = see(s, { screen: 'outcome' });
    expect(see(atChain, { screen: 'diff' }).status).toBe('done');
  });
});
