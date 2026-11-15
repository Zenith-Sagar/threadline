// The in-flight decision: when to pause, and what each response costs. Pure.
import type { Design, Instrument, MissionDef, ResponseId } from '@/data/schemas/types';
import { computeMetrics } from './models/metrics';
import { launchRoll } from './models/launch';
import { runOps } from './models/ops';
import { RESPONSE_IDS, opsOrbits, shedTarget, stormOrbit } from './models/storm';
import { validateDesign } from './validate/validate';

export function responseLabel(id: ResponseId, shedName?: string | null): string {
  if (id === 'ride-out') return 'Ride it out';
  if (id === 'safe-mode') return 'Enter safe mode early';
  return shedName ? `Switch off the ${shedName}` : 'Switch off the biggest power user';
}

/**
 * The orbit where the mission pauses for the storm decision, or null when there is nothing to decide
 * (no storm, a design that cannot launch, or a failed launch). Depends on the seed and the launch only.
 */
export function findPauseOrbit(design: Design, mission: MissionDef, seed: number): number | null {
  if (!mission.storm) return null;
  const check = validateDesign(design, mission);
  if (!check.ok || !check.vehicle) return null;
  if (launchRoll(seed) >= check.vehicle.reliability) return null;
  return stormOrbit(seed, mission);
}

export interface ResponseOption {
  id: ResponseId;
  label: string;
  /** Instrument this response switches off, if any. */
  shedName: string | null;
  stormOrbits: number;
  orbitsAfterStorm: number;
  /** Science points given up on each storm orbit. */
  scienceGivenUpPerOrbit: number;
  /** Chance each still-running instrument is permanently damaged on each storm orbit. 0 when none are exposed. */
  damageChancePerInstrument: number;
  exposedNames: string[];
  loadW: number;
  /** Solar array output during the storm. */
  stormArrayW: number;
  /** Orbits (from the storm start on) where safe mode is projected, assuming no radiation damage occurs. */
  projectedSafeModeOrbits: number[];
}

/** Costs and risks of each response, computed from the model. No recommendation, no hidden best answer. */
export function listResponses(design: Design, mission: MissionDef, seed: number): ResponseOption[] {
  const storm = mission.storm;
  const check = validateDesign(design, mission);
  const sOrbit = stormOrbit(seed, mission);
  if (!storm || !check.ok || !check.vehicle || sOrbit === null) return [];
  const instruments: Instrument[] = check.instruments;
  const base = computeMetrics(design, mission, instruments, check.vehicle);
  const orbits = opsOrbits(mission);
  const duration = Math.floor(storm.durationOrbits);
  const target = shedTarget(instruments);

  return RESPONSE_IDS.map((id): ResponseOption => {
    const off = id === 'safe-mode' ? instruments : id === 'shed-heaviest' && target ? [target] : [];
    const on = instruments.filter((i) => !off.includes(i));
    const ops = runOps({ design, mission, instruments, base, seed, response: id, rollDamage: false });
    return {
      id,
      label: responseLabel(id, target ? target.name : null),
      shedName: id === 'shed-heaviest' && target ? target.name : null,
      stormOrbits: duration,
      orbitsAfterStorm: Math.max(0, orbits - (sOrbit + duration - 1)),
      scienceGivenUpPerOrbit: off.reduce((s, i) => s + i.science, 0),
      damageChancePerInstrument: on.length > 0 ? storm.damageChance : 0,
      exposedNames: on.map((i) => i.name),
      loadW: mission.bus.baseLoadW + on.reduce((s, i) => s + i.powerW, 0),
      stormArrayW: design.arrayW * storm.arrayFactor,
      projectedSafeModeOrbits: ops.brownoutOrbits.filter((o) => o >= sOrbit),
    };
  });
}
