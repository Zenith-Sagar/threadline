import { VARIANTS } from '@/content/variants';
import type { MissionDef } from '@/data/schemas/types';
import { eclipseFraction, orbitPeriodMin } from '@/sim';
import { h } from '../dom';
import { tag } from '../labels';
import { term } from '../tooltip';
import type { Ctx, Screen } from './types';

/** The two content panels, built from the ACTIVE mission (the base mission plus the chosen variant). */
function missionPanels(mission: MissionDef): HTMLElement[] {
  const period = orbitPeriodMin(mission.orbit);
  const eclipse = period * eclipseFraction(mission.orbit);
  return [
    h(
    'div',
    { class: 'panel' },
    h('h2', null, 'Your constraints'),
    h(
      'ul',
      null,
      h('li', null, `Budget: $${mission.rules.budgetM}M `, tag('GAME MODEL')),
      h('li', null, `Exactly ${mission.rules.instrumentCount} instruments, chosen from ${mission.instruments.length}.`),
      h('li', null, 'One launcher. Bigger ones lift more and fail less, but cost more.'),
      h('li', null, 'Enough fuel to reach the Moon and settle into orbit.'),
    ),
  ),
  h(
    'div',
    { class: 'panel' },
    h('h2', null, 'What makes this hard'),
    h(
      'p',
      null,
      `The Moon is about ${Math.round(mission.orbit.bodyRadiusKm).toLocaleString('en-US')} km in radius `,
      tag('NASA DATA'),
      `. At ${mission.orbit.altitudeKm} km up, one orbit takes about ${Math.round(period)} minutes `,
      tag('SIMPLIFIED PHYSICS'),
      '.',
    ),
    h(
      'p',
      null,
      `Each orbit, about ${Math.round(eclipse)} minutes are spent in the Moon's shadow, called an `,
      term('eclipse', 'eclipse'),
      '. The solar array makes no power then, so everything runs on the battery.',
    ),
    h(
      'p',
      null,
      `Instruments keep their data on board, and the link to Earth sends only ${Math.round(mission.bus.downlinkMbPerOrbit)} megabits (Mb) per orbit. If storage fills, the instruments pause. `,
      tag('GAME MODEL'),
    ),
    mission.storm
      ? h(
          'p',
          null,
          `Space weather: on some orbit between ${mission.storm.earliestOrbit} and ${mission.storm.latestOrbit}, a solar storm will cut your solar array to about ${Math.round(mission.storm.arrayFactor * 100)}% for ${Math.floor(mission.storm.durationOrbits)} orbits. You will not know which orbit until it happens, and you will choose how to respond. `,
          tag('GAME MODEL'),
        )
      : null,
  )
  ];
}

export function createBriefScreen(ctx: Ctx): Screen {
  const { store } = ctx;
  const first = store.getState().mission;
  const hours = Math.round((first.rules.opsOrbits * orbitPeriodMin(first.orbit)) / 60);

  const heading = h('h1', { tabindex: -1 }, 'Mission brief: map the Moon from orbit');

  // Mission variants (content only): one radio group, one sentence each, and the ONE number that changes.
  const base = store.getState().baseMission;
  const group = h(
    'fieldset',
    { class: 'variants', 'data-coach': 'variants' },
    h('legend', null, 'Choose your mission'),
    ...VARIANTS.map((v) => {
      const radio = h('input', { type: 'radio', name: 'variant', value: v.id, id: `variant-${v.id}` });
      radio.checked = store.getState().variant === v.id;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        store.getState().setVariant(v.id);
        ctx.announce(`${v.name} selected. ${v.change(base)}.`);
      });
      return h(
        'label',
        { class: 'variant', for: `variant-${v.id}` },
        radio,
        h('span', { class: 'variant-text' }, h('strong', null, v.name), h('span', null, v.description), h('span', { class: 'variant-change' }, 'Changes: ', v.change(base), ' ', tag('GAME MODEL'))),
      );
    }),
  );

  const details = h('div', { class: 'brief-details' }, ...missionPanels(first));
  const refresh = (): void => {
    details.replaceChildren(...missionPanels(store.getState().mission));
  };
  let shown = store.getState().variant;
  const unsubscribe = store.subscribe((s) => {
    if (s.variant !== shown) {
      shown = s.variant;
      refresh();
    }
  });

  const el = h(
    'section',
    { class: 'screen screen--brief' },
    heading,
    h(
      'p',
      null,
      `Flight Director Imani Reyes: "Your spacecraft must circle the Moon for ${first.rules.opsOrbits} orbits (about ${hours} hours) and collect as much science as it can. Pick the instruments, the rocket, and the power system. Then we fly it."`,
    ),
    group,
    details,
    h(
      'div',
      { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => ctx.store.getState().go('design') }, 'Open the Design Bay'),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.store.getState().go('title') }, 'Back'),
    ),
  );
  return { el, heading, destroy: unsubscribe };
}
