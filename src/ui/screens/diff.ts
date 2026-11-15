// Outcome diff: what changed between the last flight and the rewound flight.
import type { Tier } from '@/data/schemas/types';
import { TIER_DEFINITIONS } from '@/sim';
import { compact, h } from '../dom';
import { icon } from '../icons';
import { money, r0, signed } from '../format';
import { tag } from '../labels';
import type { Ctx, Screen } from './types';

/**
 * Rewind diff timing (game feel): rows whose value changed flash an accent tint at 0 ms, hold it for 400 ms,
 * and fade to a thin accent bar over 1.2 s (CSS .diff-row--changed). The bar stays, so changed rows can still be
 * found afterwards without colour: each also says what changed in words. Reduced motion: the bar only, instantly.
 */
export const DIFF_FLASH_MS = 1600;

const DIRECTION_TEXT = { better: 'Better', worse: 'Worse', same: 'Same' } as const;
const DIRECTION_ICON = { better: 'up', worse: 'down', same: 'idle' } as const;

export function createDiffScreen(ctx: Ctx): Screen {
  const s = ctx.store.getState();
  const diff = s.diff;
  const heading = h('h1', { tabindex: -1 }, 'Compared with your last flight');
  const el = h('section', { class: 'screen screen--diff' }, heading);
  if (!diff) {
    el.append(h('p', null, 'There is nothing to compare yet.'), h('button', { type: 'button', class: 'btn', onclick: () => s.go('design') }, 'Back to the Design Bay'));
    return { el, heading };
  }

  const tierName = (t: Tier | null): string => t ?? 'No result';
  const dir = diff.tier.direction;
  const dvChange = diff.numbers.dvMarginFrac;
  const list = (label: string, items: string[], empty: string, changed = false): HTMLElement =>
    h(
      'div',
      { class: changed && items.length > 0 ? 'diff-row diff-row--changed' : 'diff-row' },
      h('span', { class: 'label' }, label),
      items.length === 0 ? h('span', { class: 'hint' }, empty) : h('ul', null, ...items.map((i) => h('li', null, i))),
    );

  const rowClass = (changed: boolean): string => (changed ? 'diff-row diff-row--changed' : 'diff-row');
  const sameLaunchFailure = diff.events.unchanged.includes('Launch failure');

  el.append(
    ...compact([
    h('p', null, `Same seed (${s.seed}), so the luck is identical. Only your decisions changed.`),
    h(
      'div',
      { class: 'panel' },
      h('h2', null, 'What you changed'),
      s.decisionChanges.length === 0
        ? h('p', { class: 'hint' }, 'Nothing: the design is the same as before.')
        : h('ul', null, ...s.decisionChanges.map((c) => h('li', null, `${c.label}: ${c.from} to ${c.to}`))),
      s.decisionChanges.length > 1 ? h('p', { class: 'hint' }, 'More than one decision changed, so the cause of any difference is mixed.') : null,
    ),
    h(
      'div',
      { class: 'panel diff-grid' },
      h('h2', null, 'What happened differently'),
      h(
        'div',
        { class: rowClass(diff.tier.before !== diff.tier.after) },
        h('span', { class: 'label' }, 'Outcome'),
        h('span', null, `${tierName(diff.tier.before)} to ${tierName(diff.tier.after)} `),
        h('span', { class: `delta--${dir}` }, icon(DIRECTION_ICON[dir], 16), ` ${DIRECTION_TEXT[dir]}`),
      ),
      h(
        'div',
        { class: rowClass(diff.sciencePct.delta !== 0) },
        h('span', { class: 'label' }, 'Science collected'),
        h('span', null, `${diff.sciencePct.before}% to ${diff.sciencePct.after}% `),
        h('span', { class: `delta--${diff.sciencePct.delta > 0 ? 'better' : diff.sciencePct.delta < 0 ? 'worse' : 'same'}` }, `(${signed(diff.sciencePct.delta)} points) `),
        tag('GAME MODEL'),
      ),
      ...(['dataReturn', 'spacecraftHealth', 'budgetMargin'] as const).map((k) => {
        const d = diff.scores[k];
        const names = { dataReturn: 'Data returned', spacecraftHealth: 'Spacecraft health', budgetMargin: 'Budget margin' } as const;
        if (!d) return null;
        const delta = d.after - d.before;
        return h(
          'div',
          { class: rowClass(delta !== 0), 'data-diff': k },
          h('span', { class: 'label' }, names[k]),
          h('span', null, `${r0(d.before)}% to ${r0(d.after)}% `),
          h('span', { class: `delta--${delta > 0 ? 'better' : delta < 0 ? 'worse' : 'same'}` }, `(${signed(delta)} points) `),
          tag('GAME MODEL'),
        );
      }),
      list('Problems that went away', diff.events.vanished, 'None', true),
      list('New problems', diff.events.appeared, 'None', true),
      list('Problems that stayed', diff.events.unchanged, 'None'),
      h('div', { class: rowClass(diff.numbers.costM.before !== diff.numbers.costM.after) }, h('span', { class: 'label' }, 'Cost'), h('span', null, `${money(diff.numbers.costM.before)} to ${money(diff.numbers.costM.after)}`), tag('GAME MODEL')),
      h(
        'div',
        { class: rowClass(Math.round(diff.numbers.wetKg.before) !== Math.round(diff.numbers.wetKg.after)) },
        h('span', { class: 'label' }, 'Weight at launch'),
        h('span', null, `${r0(diff.numbers.wetKg.before)} kg to ${r0(diff.numbers.wetKg.after)} kg`),
        tag('GAME MODEL'),
      ),
      h(
        'div',
        { class: rowClass(Math.round(diff.numbers.dvMarginFrac.before * 100) !== Math.round(dvChange.after * 100)) },
        h('span', { class: 'label' }, 'Fuel margin'),
        h('span', null, `${r0(diff.numbers.dvMarginFrac.before * 100)}% to ${r0(dvChange.after * 100)}%`),
        tag('SIMPLIFIED PHYSICS'),
        tag('UNVERIFIED PLACEHOLDER'),
      ),
    ),
    diff.tier.after ? h('p', { class: 'tier-def' }, h('strong', null, `${diff.tier.after}: `), TIER_DEFINITIONS[diff.tier.after]) : null,
    sameLaunchFailure
      ? h('p', { class: 'hint' }, 'The launch failed again because the seed (the luck) is the same. A different launcher changes the odds.')
      : null,
    h(
      'div',
      { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => ctx.store.getState().continueRewind() }, icon('rewind', 18), 'Change another decision'),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.store.getState().go('outcome') }, 'See why this flight went this way'),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.store.getState().newMission() }, 'Start over'),
    ),
    ]),
  );
  return { el, heading };
}
