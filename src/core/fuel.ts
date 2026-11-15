// One place for the "Auto-size fuel" math, shared by the button and by Demo Mode so they cannot drift apart.
import type { Design, MissionDef } from '@/data/schemas/types';
import { sizePropellantKg } from '@/sim';
import { dryMassKg } from '@/sim/models/mass';

/** Fuel margin used by the "Auto-size fuel" button. */
export const AUTO_FUEL_MARGIN = 0.15;

/** Propellant (kg, rounded up) that gives the mission its delta-v plus the margin. Uses UNVERIFIED placeholders P1-P4. */
export function autoFuelKg(design: Design, mission: MissionDef): number {
  const instruments = mission.instruments.filter((i) => design.instruments.includes(i.id));
  const dry = dryMassKg(design, mission, instruments);
  const dv = mission.dv.transitMps + mission.dv.insertionMps + mission.dv.stationKeepingMps;
  return Math.ceil(sizePropellantKg(dry, dv, mission.dv.ispS, AUTO_FUEL_MARGIN));
}
