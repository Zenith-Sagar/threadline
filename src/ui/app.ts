// App shell: header, skip link, live region, coach strip, footer (labels, display settings, Science Cards,
// reset), and the screen router.
// The router mounts exactly one screen at a time, destroys the previous one, and moves focus to the
// new screen's heading so keyboard and screen-reader users always start at the top.
import type { StoreApi } from 'zustand/vanilla';
import type { GameState, Screen as ScreenName } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { createSave, type SaveStore, type TextSize } from '@/save/storage';
import { openCard } from './cards';
import { createCoach } from './coach';
import { createShareBanner } from './share-banner';
import { h, prefersReducedMotion } from './dom';
import { labelLegend } from './labels';
import { applyPrefs, TEXT_SIZES } from './prefs';
import { createBriefScreen } from './screens/brief';
import { createDesignScreen } from './screens/design';
import { createDiffScreen } from './screens/diff';
import { createLaunchScreen } from './screens/launch';
import { createMissionScreen } from './screens/mission';
import { createOutcomeScreen } from './screens/outcome';
import { createTitleScreen } from './screens/title';
import type { Ctx, Screen } from './screens/types';
import { SCIENCE_CARDS } from './science-cards';
import { hideTip } from './tooltip';

const TITLES: Record<ScreenName, string> = {
  title: 'Threadline',
  brief: 'Mission brief',
  design: 'Design Bay',
  launch: 'Launch',
  mission: 'Mission Control',
  outcome: 'Outcome',
  diff: 'Compared with your last flight',
};

export interface AppOptions {
  mountLaunch: MountLaunch;
  /** Saved progress. Defaults to an in-memory save, so tests and blocked-storage browsers work. */
  save?: SaveStore;
  /** Open the guided first run by itself for a new player. Off by default (tests, screenshots). */
  autoTutorial?: boolean;
}

export function mountApp(root: HTMLElement, store: StoreApi<GameState>, opts: AppOptions): () => void {
  const save = opts.save ?? createSave(() => null);
  let reduceOverride = false;
  const reducedMotion = (): boolean => reduceOverride || prefersReducedMotion();

  const live = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', id: 'live' });
  const announce = (message: string): void => {
    live.textContent = '';
    queueMicrotask(() => {
      live.textContent = message;
    });
  };

  const main = h('main', { id: 'main', tabindex: -1 });
  const reduceBox = h('input', { type: 'checkbox', id: 'reduce-motion' });
  reduceBox.addEventListener('change', () => {
    reduceOverride = reduceBox.checked;
    document.documentElement.classList.toggle('reduce-motion', reduceOverride);
  });

  // ---- Coach strip (guided first run / Demo bar) and header ----------------------------------------
  const coach = createCoach({ store, save, announce, autoStart: opts.autoTutorial === true });
  const howTo = h('button', { type: 'button', class: 'btn btn--small', onclick: () => coach.start() }, 'How to play');

  // ---- Display settings (high contrast, text size), saved with the player's progress ----------------
  applyPrefs(save.read().prefs);
  const contrastBox = h('input', { type: 'checkbox', id: 'high-contrast' });
  contrastBox.checked = save.read().prefs.contrast;
  contrastBox.addEventListener('change', () => {
    save.update((d) => { d.prefs.contrast = contrastBox.checked; });
    applyPrefs(save.read().prefs);
    announce(contrastBox.checked ? 'High contrast on.' : 'High contrast off.');
  });
  const sizeButtons = TEXT_SIZES.map((t) => {
    const b = h('button', { type: 'button', class: 'btn btn--small', 'aria-pressed': String(save.read().prefs.textSize === t.id), 'data-size': t.id }, t.label);
    b.addEventListener('click', () => {
      save.update((d) => { d.prefs.textSize = t.id as TextSize; });
      applyPrefs(save.read().prefs);
      for (const x of sizeButtons) x.setAttribute('aria-pressed', String(x.getAttribute('data-size') === t.id));
      announce(`Text size ${t.label}.`);
    });
    return b;
  });

  // ---- Science Cards list (the glossary's long-form half) --------------------------------------------
  const cardsList = h(
    'details',
    { class: 'legend cards-list' },
    h('summary', null, 'Science Cards'),
    h('p', { class: 'hint' }, 'Short explainers with their sources.'),
    h(
      'ul',
      null,
      ...SCIENCE_CARDS.map((c) =>
        h('li', null, h('button', { type: 'button', class: 'btn btn--link', onclick: (e: Event) => openCard(c.id, e.currentTarget as HTMLElement) }, c.title)),
      ),
    ),
  );

  // ---- Reset progress (two presses, no modal) --------------------------------------------------------
  let resetArmed: ReturnType<typeof setTimeout> | undefined;
  const resetBtn = h('button', { type: 'button', class: 'btn btn--small' }, 'Reset progress');
  const resetNote = h('span', { class: 'hint', role: 'status' });
  resetBtn.addEventListener('click', () => {
    if (resetArmed === undefined) {
      resetBtn.textContent = 'Press again to confirm';
      resetArmed = setTimeout(() => {
        resetArmed = undefined;
        resetBtn.textContent = 'Reset progress';
      }, 5000);
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = undefined;
    resetBtn.textContent = 'Reset progress';
    save.reset();
    applyPrefs(save.read().prefs);
    contrastBox.checked = false;
    for (const x of sizeButtons) x.setAttribute('aria-pressed', String(x.getAttribute('data-size') === 'normal'));
    resetNote.textContent = 'Progress cleared.';
    announce('Progress cleared.');
    if (store.getState().screen === 'title') show('title'); // refresh the Continue button
  });
  const storageNote = h('p', { class: 'hint' }, save.persistent ? 'Progress is saved in this browser.' : 'This browser blocks saving, so progress lasts only for this visit. The game works the same.');

  const shareBanner = createShareBanner(store);
  root.replaceChildren(
    h('a', { class: 'skip-link', href: '#main' }, 'Skip to main content'),
    h('header', { class: 'app-header' }, h('span', { class: 'brand' }, 'Threadline'), howTo),
    coach.el,
    shareBanner.el,
    main,
    h(
      'footer',
      { class: 'app-footer' },
      h('div', { class: 'row' }, h('label', null, reduceBox, ' Reduce motion'), h('label', null, contrastBox, ' High contrast')),
      h('div', { class: 'row', role: 'group', 'aria-label': 'Text size' }, h('span', null, 'Text size:'), ...sizeButtons),
      labelLegend(),
      cardsList,
      h('div', { class: 'row' }, resetBtn, resetNote),
      storageNote,
      h(
        'p',
        null,
        // Relative on purpose: works under any deploy base path. A static page, so the game state is untouched.
        h('a', { class: 'btn--link', href: 'attributions.html', target: '_blank', rel: 'noopener', 'data-link': 'attributions' }, 'Attributions and sources (opens in a new tab)'),
      ),
      h(
        'p',
        null,
        h('small', null, 'Independent project created for the NASA Space Apps Challenge. Not affiliated with or endorsed by NASA. All spacecraft numbers are game-scaled unless labelled otherwise.'),
      ),
      h(
        'p',
        { class: 'si-note', 'data-si': 'footer' },
        // Space Apps 2026 Submission Guide, "Use of Super Intelligence (SI)": SI use must be clearly indicated in the project.
        h('small', null, 'Built with SI assistance (Claude, Anthropic).'),
      ),
      h(
        'p',
        null,
        h('a', { class: 'btn--link', href: 'attributions.html#si-disclosure', target: '_blank', rel: 'noopener', 'data-link': 'si-disclosure' }, 'How SI was used (opens in a new tab)'),
      ),
    ),
    live,
  );

  const ctx: Ctx = { store, announce, reducedMotion, mountLaunch: opts.mountLaunch, save, openCard };

  const create = (name: ScreenName): Screen => {
    switch (name) {
      case 'title': return createTitleScreen(ctx);
      case 'brief': return createBriefScreen(ctx);
      case 'design': return createDesignScreen(ctx);
      case 'launch': return createLaunchScreen(ctx);
      case 'mission': return createMissionScreen(ctx);
      case 'outcome': return createOutcomeScreen(ctx);
      case 'diff': return createDiffScreen(ctx);
    }
  };

  let current: Screen | null = null;
  let currentName: ScreenName | null = null;
  const show = (name: ScreenName): void => {
    hideTip();
    current?.destroy?.();
    current = create(name);
    currentName = name;
    main.replaceChildren(current.el);
    document.title = `${TITLES[name]} - Threadline`;
    current.heading.focus();
    window.scrollTo?.(0, 0);
    announce(`${TITLES[name]} screen.`);
  };

  /** Remember the best tier per seed (never in Demo Mode, which must not touch the player's own progress). */
  const recordBest = (s: GameState): void => {
    if (s.demo || (s.screen !== 'outcome' && s.screen !== 'diff')) return;
    if (s.result?.valid && s.result.tier) save.recordTier(s.seed, s.result.tier, s.variant);
  };

  recordBest(store.getState());
  show(store.getState().screen);
  const unsubscribe = store.subscribe((s) => {
    recordBest(s); // before the new screen is built, so "best on this seed" is already up to date
    if (s.screen !== currentName) show(s.screen);
  });

  return () => {
    unsubscribe();
    coach.destroy();
    shareBanner.destroy();
    if (resetArmed !== undefined) clearTimeout(resetArmed);
    current?.destroy?.();
    root.replaceChildren();
  };
}
