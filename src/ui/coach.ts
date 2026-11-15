// The coach strip: the guided first run (one step at a time) and the Demo Mode bar.
//
// It is a normal block above the page content, never an overlay, so it cannot hide what it points at.
// The thing it points at gets a visible outline (class "coach-target"). Everything in it is a real button.
// The logic lives in src/core/tutorial.ts (pure, unit-tested); this file only renders it and listens to the store.
import type { StoreApi } from 'zustand/vanilla';
import { DEMO_LINES } from '@/core/demo';
import type { GameState } from '@/core/store';
import {
  TUTORIAL_STEPS, initialTutorial, reduceTutorial, tutorialFinished, visibleStep,
  type Observation, type TutorialEvent, type TutorialState,
} from '@/core/tutorial';
import type { SaveStore } from '@/save/storage';
import { h } from './dom';
import { icon } from './icons';

export interface CoachOptions {
  store: StoreApi<GameState>;
  save: SaveStore;
  announce(message: string): void;
  /** Open the guided run by itself (first visit). Off by default so tests and screenshots stay quiet. */
  autoStart?: boolean;
}

export interface Coach {
  el: HTMLElement;
  /** "How to play": (re)start the guided run from wherever the player is. */
  start(): void;
  destroy(): void;
}

/** Where each step points (data-coach attributes set by the screens). */
const TARGETS: Record<string, string> = {
  instruments: '[data-coach="instruments"]',
  thread: '[data-coach="battery"]',
  fuel: '[data-coach="auto-fuel"]',
  launch: '[data-coach="launch"]',
  chain: '[data-coach="chain"]',
};

export function createCoach(opts: CoachOptions): Coach {
  const { store, save, announce } = opts;
  const el = h('aside', { class: 'coach', hidden: true });
  let tut: TutorialState = initialTutorial();
  let pointed: Element | null = null;

  const observe = (): Observation => {
    const s = store.getState();
    return { screen: s.screen, instrumentCount: s.design.instruments.length, threadsDrawn: s.threadsDrawn, threadControl: s.lastThreadControl, autoSizes: s.autoSizes };
  };
  const point = (target: Element | null): void => {
    if (pointed && pointed !== target) pointed.classList.remove('coach-target');
    pointed = target;
    target?.classList.add('coach-target');
  };
  const markSeen = (): void => {
    if (tutorialFinished(tut) && !save.read().seenTutorial) save.update((d) => { d.seenTutorial = true; });
  };

  const dispatch = (event: TutorialEvent): void => {
    tut = reduceTutorial(tut, event);
    markSeen();
    render();
  };

  function render(): void {
    const s = store.getState();
    // Sit right after the screen heading: focus lands on the heading when a screen opens, so the very next Tab
    // reaches the coach's buttons (and it is still a normal block, never an overlay).
    const heading = document.querySelector('#main h1');
    if (heading && heading.nextElementSibling !== el) heading.after(el);
    if (s.demo) {
      el.hidden = false;
      el.className = 'coach coach--demo';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'Demo Mode');
      const canSkip = (s.screen === 'design' || s.screen === 'launch' || s.screen === 'mission') && !s.baseline;
      el.replaceChildren(
        h('p', { class: 'coach-step' }, h('span', { class: 'demo-badge' }, 'Demo'), ' A scripted path. Every result is real.'),
        h('p', { class: 'coach-text' }, DEMO_LINES[s.screen] ?? ''),
        h(
          'div',
          { class: 'btn-row' },
          canSkip ? h('button', { type: 'button', class: 'btn btn--primary', 'data-action': 'demo-skip', onclick: () => store.getState().demoSkipToOutcome() }, icon('rocket', 16), 'Skip to the outcome') : null,
          h('button', { type: 'button', class: 'btn btn--small', 'data-action': 'demo-exit', onclick: () => store.getState().exitDemo() }, 'Exit the demo'),
        ),
      );
      point(null);
      return;
    }
    const step = visibleStep(tut, s.screen);
    if (!step) {
      el.hidden = true;
      el.replaceChildren();
      point(null);
      return;
    }
    el.hidden = false;
    el.className = 'coach coach--tutorial';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Guided first run');
    el.replaceChildren(
      h('p', { class: 'coach-step' }, `Step ${tut.step + 1} of ${TUTORIAL_STEPS.length}`),
      h('p', { class: 'coach-text' }, step.text),
      h(
        'div',
        { class: 'btn-row' },
        step.id === 'chain' ? h('button', { type: 'button', class: 'btn btn--primary', 'data-action': 'coach-ack', onclick: () => dispatch({ type: 'ack' }) }, icon('check', 16), 'Got it') : null,
        h('button', { type: 'button', class: 'btn btn--small', 'data-action': 'coach-skip', onclick: () => dispatch({ type: 'skip' }) }, 'Skip the guide'),
      ),
    );
    point(document.getElementById('main')?.querySelector(TARGETS[step.id] ?? '#none') ?? null);
  }

  if (opts.autoStart && !save.read().seenTutorial) tut = reduceTutorial(tut, { type: 'start', obs: observe() });

  // Subscribed before the app's own router, so the new screen does not exist yet when this runs:
  // render in a microtask, after every subscriber has built its DOM.
  const unsubscribe = store.subscribe(() => {
    if (tut.status === 'active') {
      tut = reduceTutorial(tut, { type: 'observe', obs: observe() });
      markSeen();
    }
    queueMicrotask(render);
  });
  queueMicrotask(render);

  return {
    el,
    start() {
      if (store.getState().demo) return;
      dispatch({ type: 'start', obs: observe() });
      announce(store.getState().screen === 'design' ? 'Guided run started.' : 'The guided run will appear in the Design Bay.');
    },
    destroy() {
      unsubscribe();
      point(null);
    },
  };
}
