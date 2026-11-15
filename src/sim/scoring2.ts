// Scoring v2 (Phase 3). Four scores, each with a plain-language `why` and the log entries it `causes`.
// The Phase 1 scoring.ts is left in place; simulate() now calls this file.
import type { ResponseId, ScoreEntry, Tier } from '@/data/schemas/types';

/** One sentence per tier. Mirrored in docs/tiers.md. */
export const TIER_DEFINITIONS: Record<Tier, string> = {
  Landmark:
    'Every instrument ran on every orbit, the spacecraft stayed healthy, and at least 80% of the data came home.',
  Success: 'Every instrument ran on every orbit, so all of the science was collected.',
  Recovered:
    'A crisis hit and your response saved the mission: at least 75% of the science, and 15 or more points better than riding it out.',
  Partial: '40% to 99% of the science was collected, with no rescue from your response.',
  'Lost with Lessons': 'The launch failed, or less than 40% of the science was collected.',
};

export const SCORE_KEYS = ['scienceYield', 'dataReturn', 'spacecraftHealth', 'budgetMargin'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

/** Weights for the single comparison number used by the balance sweep (not shown to players). */
export const COMPOSITE_WEIGHTS: Record<ScoreKey, number> = {
  scienceYield: 0.45, dataReturn: 0.15, spacecraftHealth: 0.25, budgetMargin: 0.15,
};

export function compositeScore(scores: Record<string, ScoreEntry>): number {
  let sum = 0;
  for (const k of SCORE_KEYS) sum += (scores[k]?.value ?? 0) * COMPOSITE_WEIGHTS[k];
  return sum;
}

export interface ScoreInputV2 {
  launchOk: boolean;
  scienceRealized: number;
  sciencePotential: number;
  dataReturnedMb: number;
  dataPotentialMb: number;
  brownoutOrbits: number[];
  storagePauseOrbits: number[];
  /** Names of instruments lost to radiation. */
  damagedNames: string[];
  costM: number;
  budgetM: number;
  response: ResponseId | null;
  responseLabel: string | null;
  /** Science fraction (0..1) the mission would have had by riding the storm out; null if that is what happened. */
  rideOutScienceFrac: number | null;
  ids: {
    launchEvent: number | null;
    safeMode: number[];
    storage: number[];
    damage: number[];
    decision: number | null;
    costDesign: number[];
  };
}

const pct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));
const list = (xs: number[]): string => (xs.length <= 3 ? xs.join(', ') : `${xs.slice(0, 3).join(', ')} and ${xs.length - 3} more`);

export function scoreMissionV2(i: ScoreInputV2): { tier: Tier; scores: Record<string, ScoreEntry> } {
  const scienceFrac = i.sciencePotential > 0 ? i.scienceRealized / i.sciencePotential : 0;
  const dataFrac = i.dataPotentialMb > 0 ? i.dataReturnedMb / i.dataPotentialMb : 0;
  const budgetFrac = i.budgetM > 0 ? (i.budgetM - i.costM) / i.budgetM : 0;
  const health = i.launchOk ? pct(100 - 6 * i.brownoutOrbits.length - 12 * i.damagedNames.length) : 0;
  const sciV = i.launchOk ? pct(scienceFrac * 100) : 0;
  const dataV = i.launchOk ? pct(dataFrac * 100) : 0;
  const budgetV = pct((budgetFrac / 0.2) * 100);

  const crisis = [...i.ids.safeMode, ...i.ids.storage, ...i.ids.damage];
  const scores: Record<string, ScoreEntry> = {};

  if (!i.launchOk) {
    scores['scienceYield'] = {
      value: 0,
      why: 'The launch failed, so no science was collected. A more reliable launcher lowers this risk.',
      causes: i.ids.launchEvent === null ? [] : [i.ids.launchEvent],
    };
    scores['dataReturn'] = { value: 0, why: 'No data came home because the launch failed.', causes: scores['scienceYield'].causes };
    scores['spacecraftHealth'] = { value: 0, why: 'The spacecraft was lost at launch.', causes: scores['scienceYield'].causes };
  } else {
    // Science
    const parts: string[] = [];
    if (i.brownoutOrbits.length > 0) parts.push(`safe mode on orbit${i.brownoutOrbits.length > 1 ? 's' : ''} ${list(i.brownoutOrbits)}`);
    if (i.storagePauseOrbits.length > 0) parts.push(`storage full on orbit${i.storagePauseOrbits.length > 1 ? 's' : ''} ${list(i.storagePauseOrbits)}`);
    if (i.damagedNames.length > 0) parts.push(`${i.damagedNames.join(' and ')} damaged by radiation`);
    if (i.response && i.response !== 'ride-out' && i.responseLabel) parts.push(`you chose "${i.responseLabel}" during the storm`);
    let why: string;
    if (scienceFrac >= 1 - 1e-12) why = 'All instruments ran on every orbit.';
    else if (i.brownoutOrbits.length > 0 && parts.length === 1) {
      why = `Safe mode on orbit${i.brownoutOrbits.length > 1 ? 's' : ''} ${i.brownoutOrbits.join(', ')} switched the instruments off, so only ${sciV}% of the science potential was collected.`;
    } else why = `Only ${sciV}% of the science potential was collected: ${parts.join('; ')}.`;
    const responseCause = i.response && i.response !== 'ride-out' && i.ids.decision !== null ? [i.ids.decision] : [];
    scores['scienceYield'] = { value: sciV, why, causes: [...crisis, ...responseCause] };
    scores['dataReturn'] = {
      value: dataV,
      why: `${Math.round(i.dataReturnedMb)} of ${Math.round(i.dataPotentialMb)} Mb that the instruments could have produced came home.${i.storagePauseOrbits.length > 0 ? ' Storage filled up, so instruments paused.' : ''}`,
      causes: i.ids.storage,
    };
    const hp: string[] = [];
    if (i.brownoutOrbits.length > 0) hp.push(`${i.brownoutOrbits.length} orbit${i.brownoutOrbits.length > 1 ? 's' : ''} in safe mode`);
    if (i.damagedNames.length > 0) hp.push(`${i.damagedNames.length} instrument${i.damagedNames.length > 1 ? 's' : ''} lost to radiation`);
    scores['spacecraftHealth'] = {
      value: health,
      why: hp.length === 0 ? 'No safe mode and no radiation damage.' : `Health ${health}: ${hp.join(', ')}.`,
      causes: [...i.ids.safeMode, ...i.ids.damage],
    };
  }
  scores['budgetMargin'] = {
    value: budgetV,
    why: `$${Math.round(i.costM)}M spent of a $${Math.round(i.budgetM)}M budget.`,
    causes: i.ids.costDesign,
  };

  // Tier
  let tier: Tier;
  const lost = !i.launchOk || scienceFrac < 0.4;
  const clean = scienceFrac >= 1 - 1e-12;
  const recovered =
    i.response !== null && i.response !== 'ride-out' && i.rideOutScienceFrac !== null &&
    scienceFrac >= 0.75 && scienceFrac - i.rideOutScienceFrac >= 0.15;
  if (lost) tier = 'Lost with Lessons';
  else if (clean && health >= 95 && dataV >= 80) tier = 'Landmark';
  else if (clean) tier = 'Success';
  else if (recovered) tier = 'Recovered';
  else tier = 'Partial';
  return { tier, scores };
}
