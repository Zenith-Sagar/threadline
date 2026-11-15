// "Copy summary": plain text a player can paste anywhere. Pure.
import type { Design, MissionDef, MissionResult } from '@/data/schemas/types';
import { SCORE_KEYS, buildCauseChains } from '@/sim';

const LABELS: Record<(typeof SCORE_KEYS)[number], string> = {
  scienceYield: 'Science yield',
  dataReturn: 'Data return',
  spacecraftHealth: 'Spacecraft health',
  budgetMargin: 'Budget margin',
};

export interface SummaryInput {
  result: MissionResult;
  design: Design;
  mission: MissionDef;
  variantName: string;
  seed: number;
  link: string;
}

export function buildSummary(i: SummaryInput): string {
  const { result } = i;
  if (!result.valid || result.tier === null) return `Threadline: no finished mission yet.\n${i.link}`;
  const scores = SCORE_KEYS.map((k) => `${LABELS[k]} ${result.scores[k]?.value ?? 0}/100`).join(', ');
  const chain = buildCauseChains(result, i.design, i.mission, 1)[0];
  return [
    `Threadline: ${result.tier} (${i.variantName}, seed ${i.seed})`,
    scores,
    `Why: ${chain ? chain.detail : 'nothing went wrong.'}`,
    `Try to beat it: ${i.link}`,
  ].join('\n');
}
