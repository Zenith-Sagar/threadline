import { applyVariant, isVariantId } from '@/content/variants';
import { sanitizeDesign } from '@/core/restore';
import { bestKey } from '@/save/storage';
import { compact, h } from '../dom';
import { icon } from '../icons';
import type { Ctx, Screen } from './types';

export function createTitleScreen(ctx: Ctx): Screen {
  const heading = h('h1', { tabindex: -1 }, 'Threadline');
  const { store, save } = ctx;
  const saved = save.read();
  const mission = store.getState().baseMission;
  const savedVariant = isVariantId(saved.lastVariant) ? saved.lastVariant : 'standard';
  const canContinue = saved.lastDesign !== null && saved.lastSeed !== null;
  const best = saved.lastSeed !== null ? saved.bestTierBySeed[bestKey(saved.lastSeed, savedVariant)] : undefined;

  const start = h(
    'button',
    { type: 'button', class: 'btn btn--primary', onclick: () => store.getState().newMission() },
    icon('rocket', 18),
    'Start mission',
  );
  const demo = h(
    'button',
    { type: 'button', class: 'btn', 'data-action': 'demo', onclick: () => store.getState().startDemo() },
    'Try the 90-second demo',
  );
  const resume = canContinue
    ? h(
        'button',
        {
          type: 'button', class: 'btn', 'data-action': 'continue',
          onclick: () => {
            if (saved.lastDesign && saved.lastSeed !== null) store.getState().resume(sanitizeDesign(saved.lastDesign, applyVariant(mission, savedVariant)), saved.lastSeed, savedVariant);
          },
        },
        'Continue your last design',
      )
    : null;

  const el = h(
    'section',
    { class: 'screen screen--title' },
    heading,
    h('p', { class: 'lead' }, 'Every choice leaves a trace.'),
    h(
      'p',
      null,
      "You're Mission Director for a small space agency. Design a spacecraft to orbit the Moon, launch it, then follow any problem back to the choice that caused it. You can rewind and change that one choice to see what happens.",
    ),
    h(
      'ol',
      null,
      h('li', null, 'Read the mission brief.'),
      h('li', null, 'Build your spacecraft in the Design Bay.'),
      h('li', null, 'Launch, and see how it goes.'),
      h('li', null, 'Rewind, change one decision, and compare.'),
    ),
    h(
      'p',
      { class: 'hint' },
      save.persistent
        ? 'About 10 minutes. No account needed. Your last design and best results are saved in this browser.'
        : 'About 10 minutes. No account needed. This browser blocks saving, so nothing is kept after you leave.',
    ),
    h('div', { class: 'btn-row' }, ...compact([start, resume, demo])),
    best ? h('p', { class: 'hint' }, `Your best result on your last seed: ${best}.`) : null,
  );
  return { el, heading };
}
