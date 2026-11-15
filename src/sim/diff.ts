// Outcome diff for Rewind: compares two runs of the same mission (same seed) after the
// player changes decisions. Pure functions.
import type { Design, Intervention, MissionDef, MissionResult, Tier } from '@/data/schemas/types';
import { responseLabel } from './responses';
import { shedTarget } from './models/storm';
import { SCORE_KEYS } from './scoring2';
import type { DecisionKey } from './causes';

// Phase 3: Recovered now means "a crisis was beaten", so it ranks between Partial and Success.
const TIER_RANK: Record<Tier, number> = {
  'Lost with Lessons': 0, Partial: 1, Recovered: 2, Success: 3, Landmark: 4,
};
const rank = (t: Tier | null): number => (t === null ? -1 : TIER_RANK[t]);

/** Phase 4: public tier order for "best tier per seed" (Lost < Partial < Recovered < Success < Landmark). */
export function tierRank(t: Tier | null): number {
  return rank(t);
}

export interface DecisionChange {
  key: DecisionKey;
  label: string;
  from: string;
  to: string;
}

export interface NumberDelta {
  before: number;
  after: number;
}

export interface ResultDiff {
  tier: { before: Tier | null; after: Tier | null; direction: 'better' | 'worse' | 'same' };
  sciencePct: NumberDelta & { delta: number };
  events: { appeared: string[]; vanished: string[]; unchanged: string[] };
  numbers: Record<'costM' | 'dryKg' | 'wetKg' | 'loadW' | 'dvMarginFrac', NumberDelta>;
  /** Phase 3: every v2 score, before and after. */
  scores: Record<string, NumberDelta>;
}

const eventLabels = (r: MissionResult): string[] =>
  r.log.filter((e) => e.kind === 'event').map((e) => e.label);

export function diffResults(before: MissionResult, after: MissionResult): ResultDiff {
  const bEvents = eventLabels(before);
  const aEvents = eventLabels(after);
  const bSet = new Set(bEvents);
  const aSet = new Set(aEvents);
  const direction =
    rank(after.tier) > rank(before.tier) ? 'better' : rank(after.tier) < rank(before.tier) ? 'worse' : 'same';
  const sb = before.scores['scienceYield']?.value ?? 0;
  const sa = after.scores['scienceYield']?.value ?? 0;
  const pick = (key: 'totalCostM' | 'dryKg' | 'wetKg' | 'loadW' | 'dvMarginFrac'): NumberDelta => ({
    before: before.metrics?.[key] ?? 0,
    after: after.metrics?.[key] ?? 0,
  });
  return {
    tier: { before: before.tier, after: after.tier, direction },
    sciencePct: { before: sb, after: sa, delta: sa - sb },
    events: {
      appeared: aEvents.filter((l) => !bSet.has(l)),
      vanished: bEvents.filter((l) => !aSet.has(l)),
      unchanged: aEvents.filter((l) => bSet.has(l)),
    },
    numbers: {
      costM: pick('totalCostM'), dryKg: pick('dryKg'), wetKg: pick('wetKg'),
      loadW: pick('loadW'), dvMarginFrac: pick('dvMarginFrac'),
    },
    scores: Object.fromEntries(
      SCORE_KEYS.map((k) => [k, { before: before.scores[k]?.value ?? 0, after: after.scores[k]?.value ?? 0 }]),
    ),
  };
}

/** Human-readable list of what the player changed between two designs. */
export function diffDesigns(a: Design, b: Design, mission: MissionDef): DecisionChange[] {
  const name = (id: string): string => mission.instruments.find((i) => i.id === id)?.name ?? id;
  const out: DecisionChange[] = [];
  for (const id of a.instruments) {
    if (!b.instruments.includes(id)) {
      out.push({ key: `instrument:${id}`, label: 'Instrument removed', from: name(id), to: 'none' });
    }
  }
  for (const id of b.instruments) {
    if (!a.instruments.includes(id)) {
      out.push({ key: `instrument:${id}`, label: 'Instrument added', from: 'none', to: name(id) });
    }
  }
  if (a.vehicle !== b.vehicle) {
    const vn = (id: string): string => mission.vehicles.find((v) => v.id === id)?.name ?? id;
    out.push({ key: 'vehicle', label: 'Launcher', from: vn(a.vehicle), to: vn(b.vehicle) });
  }
  const num = (key: DecisionKey, label: string, x: number, y: number, unit: string): void => {
    if (Math.abs(x - y) > 1e-9) out.push({ key, label, from: `${Math.round(x)} ${unit}`, to: `${Math.round(y)} ${unit}` });
  };
  num('battery', 'Battery', a.batteryWh, b.batteryWh, 'Wh');
  num('array', 'Solar array', a.arrayW, b.arrayW, 'W');
  num('fuel', 'Fuel', a.propellantKg, b.propellantKg, 'kg');
  const sa = a.storageMb ?? mission.bus.defaultStorageMb;
  const sb = b.storageMb ?? mission.bus.defaultStorageMb;
  num('storage', 'Storage', sa, sb, 'Mb');
  return out;
}

/** What the player changed about the in-flight decision between two runs. */
export function diffInterventions(
  a: Intervention[], b: Intervention[], design: Design, mission: MissionDef,
): DecisionChange[] {
  const target = shedTarget(
    design.instruments.map((id) => mission.instruments.find((i) => i.id === id)).filter((i) => i !== undefined),
  );
  const name = (list: Intervention[]): string =>
    list[0] ? responseLabel(list[0].response, target ? target.name : null) : 'Ride it out';
  const from = name(a);
  const to = name(b);
  return from === to ? [] : [{ key: 'response', label: 'Storm response', from, to }];
}
