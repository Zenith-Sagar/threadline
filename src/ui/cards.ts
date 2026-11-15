// Science Card dialog. A native <dialog>: focus is trapped while it is open, Escape closes it,
// and focus goes back to whatever opened it. Content comes from science-cards.ts (sources shown on every card).
import { h } from './dom';
import { icon } from './icons';
import { cardById, type CardId } from './science-cards';

let dialog: HTMLDialogElement | null = null;
let opener: HTMLElement | null = null;

function ensureDialog(): HTMLDialogElement {
  if (dialog && dialog.isConnected) return dialog;
  const d = h('dialog', { class: 'card-dialog', 'aria-labelledby': 'card-title' });
  d.addEventListener('close', () => {
    opener?.focus();
    opener = null;
  });
  // A click on the backdrop (outside the content box) closes it.
  d.addEventListener('click', (e) => {
    if (e.target === d) closeCard();
  });
  document.body.append(d);
  dialog = d;
  return d;
}

export function closeCard(): void {
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else {
    dialog.removeAttribute('open');
    opener?.focus();
    opener = null;
  }
}

/** Open a Science Card. Focus returns to `from` (or the previously focused element) when it closes. */
export function openCard(id: CardId, from?: HTMLElement | null): void {
  const d = ensureDialog();
  const card = cardById(id);
  opener = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  d.replaceChildren(
    h(
      'div',
      { class: 'card-body' },
      h('h2', { id: 'card-title', tabindex: -1 }, icon('info', 20), card.title),
      h('p', { class: 'card-text' }, card.body),
      h('h3', null, 'Sources'),
      h(
        'ul',
        { class: 'card-sources' },
        ...card.sources.map((s) =>
          h(
            'li',
            null,
            h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title),
            ` (${s.publisher}, read ${s.retrieved})`,
          ),
        ),
      ),
      card.unverified.length
        ? h('p', { class: 'card-unverified' }, h('strong', null, 'Unverified: '), card.unverified.join(' '))
        : null,
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn--primary', onclick: closeCard }, 'Close')),
    ),
  );
  if (typeof d.showModal === 'function') {
    if (!d.open) d.showModal();
  } else {
    d.setAttribute('open', '');
  }
  (d.querySelector('#card-title') as HTMLElement | null)?.focus();
}

/** Remove the dialog from the page (app unmount, tests). */
export function destroyCards(): void {
  dialog?.remove();
  dialog = null;
  opener = null;
}
