// The banner above the page for share links:
//   - "Try to beat this: <tier>" on the Design Bay after opening a link (the tier is computed locally), and
//   - a plain message when a link could not be opened (the game just starts normally; nothing is blocked).
import type { StoreApi } from 'zustand/vanilla';
import { variantById } from '@/content/variants';
import type { GameState } from '@/core/store';
import { responseLabel } from '@/sim';
import { h } from './dom';
import { icon } from './icons';

export interface ShareBanner {
  el: HTMLElement;
  destroy(): void;
}

export function createShareBanner(store: StoreApi<GameState>): ShareBanner {
  const el = h('aside', { class: 'share-banner', hidden: true });

  const render = (): void => {
    const s = store.getState();
    if (s.shareNotice) {
      el.hidden = false;
      el.className = 'share-banner share-banner--notice';
      el.setAttribute('role', 'status');
      el.replaceChildren(
        h('p', null, icon('info', 16), ` ${s.shareNotice}`),
        h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn--small', 'data-action': 'banner-dismiss', onclick: () => store.getState().setShareNotice(null) }, 'Dismiss')),
      );
      return;
    }
    if (s.shared && s.screen === 'design' && !s.demo) {
      const sh = s.shared;
      el.hidden = false;
      el.className = 'share-banner';
      el.setAttribute('role', 'status');
      el.replaceChildren(
        h(
          'p',
          { class: 'share-banner-title' },
          icon('rocket', 16),
          sh.tier ? ` Try to beat this: ${sh.tier}` : ' Shared design: it cannot launch in this version',
          h('span', { class: 'hint' }, ` (${variantById(sh.variant).name}, seed ${sh.seed})`),
        ),
        ...(sh.response ? [h('p', null, `They answered the storm with "${responseLabel(sh.response)}". Yours is your own choice.`)] : []),
        ...sh.notes.map((n) => h('p', { class: 'hint' }, n)),
        h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn--small', 'data-action': 'banner-dismiss', onclick: () => store.getState().dismissShared() }, 'Dismiss')),
      );
      return;
    }
    el.hidden = true;
    el.replaceChildren();
  };

  const unsubscribe = store.subscribe(render);
  render();
  return { el, destroy: unsubscribe };
}
