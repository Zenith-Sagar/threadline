// Mission variants: replayability through CONTENT ONLY.
//
// A variant is a pure function from the base mission to a changed copy of it. Nothing else differs:
// the same simulate(), the same Rewind, cause chains, diff and tiers run on the derived mission.
// Each variant changes exactly one number (shown on the Brief screen). All values are GAME MODEL.
import type { MissionDef } from '@/data/schemas/types';

export type VariantId = 'standard' | 'early-storm' | 'tight-budget' | 'data-rich';

export interface Variant {
  id: VariantId;
  name: string;
  /** One sentence for the Brief screen. */
  description: string;
  /** The ONE number that changes, as a short label ("Budget: $175M to $149M"). */
  change: (base: MissionDef) => string;
  apply: (base: MissionDef) => MissionDef;
}

/** Early storm: the storm can only arrive on orbit 2, 3 or 4. */
export const EARLY_STORM = { earliestOrbit: 2, latestOrbit: 4 } as const;
/** Tight budget: 15% less money. */
export const TIGHT_BUDGET_FACTOR = 0.85;
/** Data-rich target: every instrument produces 30% more data. */
export const DATA_RICH_FACTOR = 1.3;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export const VARIANTS: readonly Variant[] = [
  {
    id: 'standard',
    name: 'Standard mission',
    description: 'The mission as briefed: the storm can arrive between orbit 4 and orbit 9.',
    change: () => 'Nothing changes',
    apply: (m) => m,
  },
  {
    id: 'early-storm',
    name: 'Early storm',
    description: 'The storm comes early, so you must plan for it before you have seen how your spacecraft behaves.',
    change: (m) => (m.storm ? `Storm orbit: ${m.storm.earliestOrbit} to ${m.storm.latestOrbit}, becomes ${EARLY_STORM.earliestOrbit} to ${EARLY_STORM.latestOrbit}` : 'No storm in this mission'),
    apply: (m) => (m.storm ? { ...m, storm: { ...m.storm, ...EARLY_STORM } } : m),
  },
  {
    id: 'tight-budget',
    name: 'Tight budget',
    description: 'Fifteen percent less money, so every instrument and every battery has to earn its place.',
    change: (m) => `Budget: $${m.rules.budgetM}M, becomes $${Math.round(m.rules.budgetM * TIGHT_BUDGET_FACTOR)}M`,
    apply: (m) => ({ ...m, rules: { ...m.rules, budgetM: Math.round(m.rules.budgetM * TIGHT_BUDGET_FACTOR) } }),
  },
  {
    id: 'data-rich',
    name: 'Data-rich target',
    description: 'A fascinating site: every instrument collects thirty percent more data, which fills your storage faster.',
    change: () => 'Data per instrument: +30%',
    apply: (m) => ({ ...m, instruments: m.instruments.map((i) => ({ ...i, dataMbPerOrbit: round1(i.dataMbPerOrbit * DATA_RICH_FACTOR) })) }),
  },
];

export const variantById = (id: string): Variant => VARIANTS.find((v) => v.id === id) ?? (VARIANTS[0] as Variant);
export const isVariantId = (id: unknown): id is VariantId => typeof id === 'string' && VARIANTS.some((v) => v.id === id);
export const applyVariant = (base: MissionDef, id: VariantId): MissionDef => variantById(id).apply(base);
