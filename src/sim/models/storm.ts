// The seeded solar storm and the player's response to it. Label: GAME MODEL.
//
// Fairness rule (Rewind): the storm's start orbit and every radiation "dice roll" depend ONLY on the seed
// (plus the orbit number and instrument id), never on the design. Changing the design or the response
// therefore never changes the luck, only what the luck does.
import type { Instrument, Intervention, MissionDef, ResponseId } from '@/data/schemas/types';
import { MAX_OPS_ORBITS } from '../constants';
import { createRng, deriveSeed } from '../rng';

export const RESPONSE_IDS: ResponseId[] = ['ride-out', 'shed-heaviest', 'safe-mode'];

export function opsOrbits(mission: MissionDef): number {
  return Math.max(1, Math.min(MAX_OPS_ORBITS, Math.floor(mission.rules.opsOrbits)));
}

/** Orbit the storm starts on, or null when the mission has no storm. Depends only on the seed. */
export function stormOrbit(seed: number, mission: MissionDef): number | null {
  const storm = mission.storm;
  if (!storm) return null;
  const orbits = opsOrbits(mission);
  const lo = Math.max(1, Math.floor(storm.earliestOrbit));
  const hi = Math.max(lo, Math.min(Math.floor(storm.latestOrbit), orbits - Math.floor(storm.durationOrbits) + 1));
  const r = createRng(deriveSeed(seed, 'storm'))();
  return lo + Math.floor(r * (hi - lo + 1));
}

/** The dice roll that decides whether `instrumentId` is damaged on `orbit`. Seed-only, so design-independent. */
export function hitRoll(seed: number, orbit: number, instrumentId: string): number {
  return createRng(deriveSeed(seed, `storm.hit.${orbit}.${instrumentId}`))();
}

/** The instrument that "Switch off the biggest power user" targets: highest power draw, ties by id. */
export function shedTarget(instruments: Instrument[]): Instrument | null {
  if (instruments.length === 0) return null;
  return instruments.slice().sort((a, b) => b.powerW - a.powerW || a.id.localeCompare(b.id))[0] ?? null;
}

/** The response in force: the last intervention made at the storm's orbit, else ride it out. */
export function resolveResponse(storm: number | null, interventions: Intervention[]): ResponseId {
  if (storm === null) return 'ride-out';
  let chosen: ResponseId = 'ride-out';
  for (const iv of interventions) {
    // Only a known response, made at the storm's orbit, counts. Anything else is ignored (never throws).
    if (iv && iv.orbit === storm && RESPONSE_IDS.includes(iv.response)) chosen = iv.response;
  }
  return chosen;
}
