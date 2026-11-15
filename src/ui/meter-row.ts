// One live bar (a meter): name, status icon + text, filled bar, one plain-language line, labels.
import { h, uid } from './dom';
import { icon, type IconName } from './icons';
import { tag } from './labels';
import type { MeterView, Status } from './meter-model';

export interface MeterRow {
  el: HTMLElement;
  update(view: MeterView): void;
}

const STATUS_ICON: Record<Status, IconName> = { ok: 'ok', tight: 'tight', bad: 'bad', idle: 'idle' };

export function createMeterRow(view: MeterView): MeterRow {
  const nameId = uid('meter-name');
  const statusIcon = h('span', { class: 'status-icon' });
  const statusText = h('span', { class: 'status-text' });
  const fill = h('div', { class: 'bar-fill' });
  const mark = h('div', { class: 'bar-mark', hidden: true });
  const bar = h(
    'div',
    { class: 'bar', role: 'meter', 'aria-labelledby': nameId, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 },
    fill, mark,
  );
  const text = h('p', { class: 'meter-text' });
  const tags = h('span', { class: 'tags' });
  const el = h(
    'div',
    { class: 'meter', 'data-meter': view.id },
    h(
      'div',
      { class: 'meter-head' },
      h('span', { class: `meter-icon meter-icon--${view.id}` }, icon(view.id, 18)),
      h('span', { class: 'meter-name', id: nameId }, view.name),
      h('span', { class: 'meter-status' }, statusIcon, statusText),
    ),
    bar, text, tags,
  );

  const update = (v: MeterView): void => {
    el.dataset['status'] = v.status;
    el.className = `meter status-${v.status}${el.classList.contains('meter--changed') ? ' meter--changed' : ''}`;
    statusIcon.replaceChildren(icon(STATUS_ICON[v.status], 16));
    statusText.textContent = v.statusText;
    fill.style.width = `${Math.round(v.frac * 100)}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(v.frac * 100)));
    bar.setAttribute('aria-valuetext', v.valueText);
    if (v.markFrac === null) {
      mark.hidden = true;
    } else {
      mark.hidden = false;
      mark.style.left = `${Math.round(v.markFrac * 100)}%`;
    }
    text.textContent = v.text;
    tags.replaceChildren(...v.labels.map(tag));
  };
  update(view);
  return { el, update };
}
