// Phase 1 scoring skeleton. Real multi-dimension scoring arrives in Phase 4.
// Tiers 'Landmark' and 'Recovered' are reserved for Phase 4.
import type { ScoreEntry, Tier } from '@/data/schemas/types';

export interface ScoreInput {
  launchOk: boolean;
  potentialScience: number;
  realizedScience: number;
  brownoutOrbits: number[];
  brownoutEventIds: number[];
  launchEventId: number | null;
}

export function scoreMission(input: ScoreInput): { tier: Tier; scores: Record<string, ScoreEntry> } {
  if (!input.launchOk) {
    return {
      tier: 'Lost with Lessons',
      scores: {
        scienceYield: {
          value: 0,
          why: 'The launch failed, so no science was collected. A more reliable launcher lowers this risk.',
          causes: input.launchEventId === null ? [] : [input.launchEventId],
        },
      },
    };
  }
  const yieldFrac = input.potentialScience > 0 ? input.realizedScience / input.potentialScience : 0;
  const value = Math.round(yieldFrac * 100);
  const tier: Tier =
    input.brownoutOrbits.length === 0 ? 'Success' : yieldFrac >= 0.4 ? 'Partial' : 'Lost with Lessons';
  const why =
    input.brownoutOrbits.length === 0
      ? 'All instruments ran on every orbit.'
      : `Safe mode on orbit${input.brownoutOrbits.length > 1 ? 's' : ''} ${input.brownoutOrbits.join(', ')} switched the instruments off, so only ${value}% of the science potential was collected.`;
  return { tier, scores: { scienceYield: { value, why, causes: input.brownoutEventIds } } };
}
