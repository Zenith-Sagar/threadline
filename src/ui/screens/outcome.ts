// Outcome card: tier first, then the top 3 causes as chains built from the decision log.
import { bestKey } from '@/save/storage';
import type { MissionResult, Tier } from '@/data/schemas/types';
import { betterTier } from '@/save/storage';
import { TIER_DEFINITIONS, SCORE_KEYS, buildCauseChains, previewMission, type CauseChain } from '@/sim';
import { compact, h } from '../dom';
import { icon, type IconName } from '../icons';
import { money, r0 } from '../format';
import { tag } from '../labels';
import { detailRows } from '../meter-model';
import { cardForChain } from '../science-cards';
import { createSharePanel } from '../share-panel';
import { term } from '../tooltip';
import type { Ctx, Screen } from './types';

interface TierView { title: string; cls: 'good' | 'mid' | 'bad'; icon: IconName }

export function tierView(result: MissionResult): TierView {
  const failed = result.log.some((e) => e.key === 'event.launch.failure');
  const t: Tier | null = result.tier;
  switch (t) {
    case 'Landmark': return { title: 'Landmark mission', cls: 'good', icon: 'ok' };
    case 'Success': return { title: 'Success: every instrument ran on every orbit', cls: 'good', icon: 'ok' };
    case 'Recovered': return { title: 'Recovered: the mission got through a crisis', cls: 'mid', icon: 'partial' };
    case 'Partial': return { title: 'Partial success: the instruments were off for some orbits', cls: 'mid', icon: 'partial' };
    default:
      return failed
        ? { title: 'Launch failure: the spacecraft was lost', cls: 'bad', icon: 'bad' }
        : { title: 'Mission lost: too little science was collected', cls: 'bad', icon: 'bad' };
  }
}

const SCORE_NAMES: Record<(typeof SCORE_KEYS)[number], string> = {
  scienceYield: 'Science collected',
  dataReturn: 'Data returned',
  spacecraftHealth: 'Spacecraft health',
  budgetMargin: 'Budget margin',
};

const LINK_PREFIX = { decision: 'Your choice: ', effect: 'Effect: ', outcome: 'Result: ' } as const;

export function chainElement(chain: CauseChain, good: boolean): HTMLElement {
  const items: HTMLElement[] = [];
  chain.links.forEach((l, i) => {
    if (i > 0) items.push(h('li', { class: 'arrow', 'aria-hidden': 'true' }, icon('arrow', 18)));
    items.push(
      h(
        'li',
        null,
        h(
          'span',
          { class: `link link--${l.kind}${l.kind === 'outcome' && good ? ' is-good' : ''}` },
          icon(l.kind, 16),
          h('span', { class: 'sr-only' }, LINK_PREFIX[l.kind]),
          l.text,
        ),
      ),
    );
  });
  return h('ul', { class: 'chain-links', 'aria-label': 'Cause chain' }, ...items);
}

/**
 * Outcome reveal timing (game feel):
 *   t = 0 ms       the tier heading is already on screen (the answer comes first)
 *   t = 150 ms     tier definition, then each score, then each cause chain, 150 ms apart
 *   each item      fades in over 250 ms, ease-out (CSS .reveal in styles.css)
 *   reduced motion everything is shown at once, no animation
 */
export const REVEAL_STEP_MS = 150;

export function createOutcomeScreen(ctx: Ctx): Screen {
  const s = ctx.store.getState();
  const result = s.result;
  const heading = h('h1', { tabindex: -1 });
  const el = h('section', { class: 'screen screen--outcome' }, heading);
  if (!result || !result.metrics) {
    heading.textContent = 'No result yet';
    el.append(
      h('p', null, 'Run a mission first.'),
      h('button', { type: 'button', class: 'btn', onclick: () => s.go('design') }, 'Back to the Design Bay'),
    );
    return { el, heading };
  }

  const tv = tierView(result);
  const failed = result.log.some((e) => e.key === 'event.launch.failure');
  heading.className = `tier tier--${tv.cls}`;
  heading.append(icon(tv.icon, 28), tv.title);

  const m = result.metrics;
  const stormLine = result.log.find((e) => e.key === 'event.storm');
  const responseLine = result.log.find((e) => e.kind === 'decision');
  const chains = buildCauseChains(result, s.design, s.mission, 3);
  const good = tv.cls === 'good';
  const preview = previewMission(s.design, s.mission);
  let n = 0;
  const reveal = <T extends HTMLElement>(node: T): T => {
    node.classList.add('reveal');
    node.style.setProperty('--i', String(n++));
    return node;
  };
  const savedBest = ctx.save.read().bestTierBySeed[bestKey(s.seed, s.variant)];
  const bestHere = result.tier && !s.demo ? betterTier(savedBest, result.tier) : null;

  el.append(
    ...compact([
    result.tier ? reveal(h('p', { class: 'tier-def' }, h('strong', null, 'What this outcome means: '), TIER_DEFINITIONS[result.tier])) : null,
    bestHere ? reveal(h('p', { class: 'hint', 'data-best': bestHere }, `Best result on this seed: ${bestHere}.`)) : null,
    stormLine && !failed
      ? h('p', null, icon('storm', 16), ` ${stormLine.label}. ${responseLine ? responseLine.label : 'No response was chosen.'}.`)
      : null,
    h(
      'ul',
      { class: 'scores', 'aria-label': 'Scores' },
      ...SCORE_KEYS.map((k) => {
        const sc = result.scores[k];
        if (!sc) return null;
        return reveal(h(
          'li',
          { class: 'score', 'data-score': k },
          h('span', { class: 'big' }, `${sc.value}%`),
          ' ',
          h('span', { class: 'score-name' }, SCORE_NAMES[k]),
          ' ',
          tag('GAME MODEL'),
          h('p', { class: 'score-why' }, sc.why),
        ));
      }),
    ),
    h('p', { class: 'hint' }, term('safe mode', 'safe mode'), ` orbits: ${m.brownoutOrbits.length}. Cost ${money(m.totalCostM)} of ${money(s.mission.rules.budgetM)} budget. `, tag('SIMPLIFIED PHYSICS')),
    h('h2', null, failed ? 'What happened' : good ? 'Why it worked' : 'Why it happened'),
    chains.length === 0
      ? h('p', null, 'There is nothing to trace for this run.')
      : h(
          'ol',
          { class: 'chains' },
          ...chains.map((c, ci) =>
            reveal(h(
              'li',
              { class: 'chain', 'data-chain': c.id, ...(ci === 0 ? { 'data-coach': 'chain' } : {}) },
              chainElement(c, good),
              h('p', null, c.detail),
              h(
                'button',
                { type: 'button', class: 'btn', onclick: () => ctx.store.getState().beginRewind(c.decisionKey) },
                icon('rewind', 16),
                'Change this decision',
              ),
              h(
                'button',
                { type: 'button', class: 'btn btn--link', 'data-card': cardForChain(c.id), onclick: (e: Event) => ctx.openCard(cardForChain(c.id), e.currentTarget as HTMLElement) },
                'Why did this happen?',
              ),
            )),
          ),
        ),
    failed
      ? h(
          'div',
          { class: 'panel' },
          h('h2', null, 'What a real team does next'),
          h('p', null, 'NASA keeps a Lessons Learned Information System so that past failures are not relearned. Here, you can rewind with the same seed and try a more reliable launcher to see how the odds change.'),
        )
      : null,
    h(
      'div',
      { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => ctx.store.getState().beginRewind() }, icon('rewind', 18), 'Change one decision'),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.store.getState().newMission() }, 'Start over'),
    ),
    result.valid ? createSharePanel(ctx) : null,
    h('p', { class: 'hint' }, term('Seed', 'seed'), ` ${s.seed}: the luck is fixed, so rewinding changes only your choices.`),
    h(
      'details',
      { class: 'panel' },
      h('summary', null, 'Engineering detail'),
      h(
        'dl',
        null,
        ...detailRows(preview, s.design, s.mission).flatMap((row) => [
          h('dt', null, row.term ? term(row.label, row.term) : row.label, ...row.labels.map(tag)),
          h('dd', null, row.value),
        ]),
      ),
    ),
    ]),
  );
  void r0;
  return { el, heading };
}
