// "Copy link" and "Copy summary" on the outcome screen. If the browser refuses to copy, the text is shown
// in a read-only box, already selected, so the player can copy it by hand. Nothing here needs storage.
import { variantById } from '@/content/variants';
import { encodeShare } from '@/share/code';
import { copyText } from '@/share/clipboard';
import { buildSummary } from '@/share/summary';
import { h } from './dom';
import { icon } from './icons';
import type { Ctx } from './screens/types';

/** The link for the current mission: this page's address plus the share hash. */
export function currentLink(ctx: Ctx): string {
  const s = ctx.store.getState();
  const hash = encodeShare({ variant: s.variant, seed: s.seed, design: s.design, response: s.interventions[0]?.response ?? null });
  const base = window.location.origin === 'null' ? window.location.href.split('#')[0]?.split('?')[0] ?? '' : window.location.origin + window.location.pathname;
  return `${base}#${hash}`;
}

export function createSharePanel(ctx: Ctx): HTMLElement {
  const status = h('p', { class: 'hint', role: 'status' });
  const area = h('textarea', { class: 'share-text', readonly: '', rows: 4, 'aria-label': 'Text to copy by hand' });
  const fallback = h('div', { class: 'share-fallback', hidden: true }, h('p', null, "Couldn't copy automatically. Select the text below and copy it."), area);

  const run = async (what: 'link' | 'summary'): Promise<void> => {
    const s = ctx.store.getState();
    const link = currentLink(ctx);
    const text = what === 'link' ? link : s.result ? buildSummary({ result: s.result, design: s.design, mission: s.mission, variantName: variantById(s.variant).name, seed: s.seed, link }) : link;
    const ok = await copyText(text);
    if (ok) {
      fallback.hidden = true;
      status.textContent = what === 'link' ? 'Link copied.' : 'Summary copied.';
      ctx.announce(status.textContent);
      return;
    }
    area.value = text;
    fallback.hidden = false;
    area.focus();
    area.select();
    status.textContent = "Copying isn't available here.";
    ctx.announce("Copying isn't available here. The text is shown so you can copy it by hand.");
  };

  return h(
    'section',
    { class: 'panel share-panel', 'aria-label': 'Share this mission' },
    h('h2', null, 'Share this mission'),
    h('p', { class: 'hint' }, 'The link opens this exact design and seed, so a friend can try to beat your result.'),
    h(
      'div',
      { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn', 'data-action': 'copy-link', onclick: () => void run('link') }, icon('arrow', 16), 'Copy link'),
      h('button', { type: 'button', class: 'btn', 'data-action': 'copy-summary', onclick: () => void run('summary') }, icon('check', 16), 'Copy summary'),
    ),
    status,
    fallback,
  );
}
