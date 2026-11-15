// Delta-v via the Tsiolkovsky rocket equation. Label: SIMPLIFIED PHYSICS.
//   dv = Isp * g0 * ln(m0 / mf)
// Departures from reality: one lumped burn budget, no gravity/steering losses, single Isp.
import { G0_MS2 } from '../constants';
import type { DeltaVBudget } from '@/data/schemas/types';

export function deltaVMps(ispS: number, wetKg: number, dryKg: number): number {
  if (!(wetKg > 0) || !(dryKg > 0) || wetKg < dryKg) return 0;
  return ispS * G0_MS2 * Math.log(wetKg / dryKg);
}

export function requiredDvMps(dv: DeltaVBudget): number {
  return dv.transitMps + dv.insertionMps + dv.stationKeepingMps;
}

/** Propellant (kg) that yields `dvMps * (1 + marginFrac)` for a given dry mass. */
export function sizePropellantKg(
  dryKg: number,
  dvMps: number,
  ispS: number,
  marginFrac = 0,
): number {
  const ratio = Math.exp((dvMps * (1 + marginFrac)) / (ispS * G0_MS2));
  return dryKg * (ratio - 1);
}
