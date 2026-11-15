// Honest-labelling system. Every number on screen sits under one of these labels.
//   NASA DATA                 a value read from NASA's published fact sheet (snapshot, see Truth Ledger)
//   SIMPLIFIED PHYSICS        a real equation, simplified (the "where we depart" is in the Science Cards)
//   GAME MODEL                a game-scaled number invented for balance, not a real spec
//   UNVERIFIED PLACEHOLDER    a number that depends on placeholders P1-P4 (engine efficiency, burn sizes)
import { h } from './dom';
import { icon } from './icons';

export type LabelKind = 'NASA DATA' | 'SIMPLIFIED PHYSICS' | 'GAME MODEL' | 'UNVERIFIED PLACEHOLDER';

const CLASS: Record<LabelKind, string> = {
  'NASA DATA': 'tag--nasa',
  'SIMPLIFIED PHYSICS': 'tag--physics',
  'GAME MODEL': 'tag--game',
  'UNVERIFIED PLACEHOLDER': 'tag--placeholder',
};

export const LABEL_HELP: Record<LabelKind, string> = {
  'NASA DATA': "A value from NASA's published Moon fact sheet.",
  'SIMPLIFIED PHYSICS': 'Based on a real equation, but simplified so it is easy to play with.',
  'GAME MODEL': 'A number made up for this game. It is not a real spacecraft specification.',
  'UNVERIFIED PLACEHOLDER':
    "Uses a placeholder (engine efficiency or burn size) that hasn't been checked against a source yet.",
};

export function tag(kind: LabelKind): HTMLElement {
  return h(
    'span',
    { class: `tag ${CLASS[kind]}`, 'data-label': kind },
    kind === 'UNVERIFIED PLACEHOLDER' ? icon('tight', 12) : null,
    kind === 'UNVERIFIED PLACEHOLDER' ? 'Unverified placeholder' : kind,
  );
}

/** Collapsible explanation of the four labels. */
export function labelLegend(): HTMLElement {
  const kinds = Object.keys(LABEL_HELP) as LabelKind[];
  return h(
    'details',
    { class: 'legend' },
    h('summary', null, 'What do the labels mean?'),
    h('dl', null, ...kinds.flatMap((k) => [h('dt', null, tag(k)), h('dd', null, LABEL_HELP[k])])),
  );
}
