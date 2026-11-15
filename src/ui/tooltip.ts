// Accessible jargon tooltips. A term is a real <button>: it opens on hover, focus or click/tap,
// and Escape closes it. A click PINS the tip so its Science Card button can be reached by keyboard or touch.
// One shared tooltip element keeps the DOM small.
import { openCard } from './cards';
import { h } from './dom';
import { GLOSSARY, type GlossaryKey } from './glossary';
import { CARD_FOR_TERM } from './science-cards';

let tipEl: HTMLElement | null = null;
let current: HTMLElement | null = null;
let pinned = false;

function ensureTip(): HTMLElement {
  if (tipEl && tipEl.isConnected) return tipEl;
  tipEl = h('div', { class: 'tip', role: 'tooltip', id: 'tooltip', hidden: true });
  document.body.append(tipEl);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const back = current;
      const wasPinned = pinned;
      hideTip();
      if (wasPinned) back?.focus();
    }
  });
  return tipEl;
}

function showTip(trigger: HTMLElement, text: string, cardKey?: string): void {
  const tip = ensureTip();
  tip.textContent = text;
  const card = cardKey ? CARD_FOR_TERM[cardKey] : undefined;
  if (card) {
    // The Science Card behind this term. Reachable by keyboard: clicking the term pins the tip and moves focus here.
    const btn = h('button', { type: 'button', class: 'tip-card', onclick: () => { hideTip(); openCard(card, trigger); } }, 'Read the Science Card');
    tip.append(' ', btn);
  }
  tip.hidden = false;
  const rect = trigger.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 300));
  tip.style.left = `${left}px`;
  tip.style.top = `${rect.bottom + 6}px`;
  trigger.setAttribute('aria-describedby', 'tooltip');
  current = trigger;
}

export function hideTip(): void {
  pinned = false;
  if (tipEl) tipEl.hidden = true;
  if (current) current.removeAttribute('aria-describedby');
  current = null;
}

/** A jargon word with a definition. `label` is what the reader sees. */
export function term(label: string, key: GlossaryKey): HTMLButtonElement {
  const text = GLOSSARY[key];
  const btn = h(
    'button',
    { type: 'button', class: 'term', 'aria-label': `${label}: explain` },
    label,
  );
  btn.addEventListener('mouseenter', () => { if (!pinned) showTip(btn, text, key); });
  btn.addEventListener('mouseleave', () => { if (!pinned) hideTip(); });
  btn.addEventListener('focus', () => { if (!pinned) showTip(btn, text, key); });
  btn.addEventListener('blur', () => { if (!pinned) hideTip(); });
  btn.addEventListener('click', () => {
    if (pinned && current === btn) {
      hideTip();
      return;
    }
    showTip(btn, text, key);
    if (key in CARD_FOR_TERM) {
      pinned = true;
      tipEl?.querySelector<HTMLElement>('.tip-card')?.focus();
    }
  });
  return btn;
}
