// Live preview for the Design Bay: real numbers while the design is still being chosen.
//
// Phase 3 (Step 0): this file no longer has its own copy of the power loop. It validates, builds metrics
// and calls runOps(), the same function simulate() uses, so the two cannot drift apart.
// Contract (pinned by tests/sim/preview.test.ts):
//   - works for incomplete or invalid designs and never throws;
//   - `metrics` is null only when a numeric input is not a finite, non-negative number or the launcher is unknown;
//   - with a seed it includes the storm (same as simulate); without one it shows the calm, nominal mission.
import type {
  Design, Instrument, Intervention, LaunchVehicle, MissionDef, MissionMetrics,
} from '@/data/schemas/types';
import { storageMbOf } from './models/data';
import { computeMetrics } from './models/metrics';
import { runOps } from './models/ops';
import { opsOrbits, resolveResponse, stormOrbit } from './models/storm';
import { validateDesign, type ValidationResult } from './validate/validate';

export interface Preview {
  /** Instruments that were recognised (unknown ids are ignored here and reported by validity). */
  instruments: Instrument[];
  vehicle: LaunchVehicle | null;
  /** Null when a number is not usable, so the bars show "Waiting for a valid design". */
  metrics: MissionMetrics | null;
  orbits: number;
  /** Orbits where the power model predicts safe mode (computed even if the design cannot launch). */
  brownoutOrbits: number[];
  /** Lowest battery level after an eclipse, as a fraction of usable capacity (0..1). */
  minReserveFrac: number;
  sciencePerOrbit: number;
  /** Science points collected if the launch succeeds. */
  realizedScience: number;
  /** realizedScience / (sciencePerOrbit * orbits); 0 when no instrument is chosen. */
  scienceFrac: number;
  // Phase 3
  storageMb: number;
  storagePauseOrbits: number[];
  /** Highest amount of data held in storage at any time (Mb). */
  peakStorageMb: number;
  /** Data returned / data the instruments could produce, 0..1. */
  dataFrac: number;
  stormOrbit: number | null;
  validity: ValidationResult;
}

/** Best possible science per orbit: the strongest `instrumentCount` instruments together. */
export function maxSciencePerOrbit(mission: MissionDef): number {
  return mission.instruments
    .map((i) => i.science)
    .sort((a, b) => b - a)
    .slice(0, mission.rules.instrumentCount)
    .reduce((sum, n) => sum + n, 0);
}

const usable = (n: number): boolean => Number.isFinite(n) && n >= 0;

export function previewMission(
  design: Design,
  mission: MissionDef,
  seed: number | null = null,
  interventions: Intervention[] = [],
): Preview {
  const instruments = design.instruments
    .map((id) => mission.instruments.find((i) => i.id === id))
    .filter((i): i is Instrument => i !== undefined);
  const vehicle = mission.vehicles.find((v) => v.id === design.vehicle) ?? null;
  const orbits = opsOrbits(mission);
  const validity = validateDesign(design, mission);
  const sciencePerOrbit = instruments.reduce((sum, i) => sum + i.science, 0);
  const storageMb = storageMbOf(design, mission);

  const numbersOk =
    usable(design.batteryWh) && usable(design.arrayW) && usable(design.propellantKg) && usable(storageMb);
  if (!numbersOk || !vehicle) {
    return {
      instruments, vehicle, metrics: null, orbits, brownoutOrbits: [], minReserveFrac: 0, sciencePerOrbit,
      realizedScience: 0, scienceFrac: 0, storageMb, storagePauseOrbits: [], peakStorageMb: 0, dataFrac: 0,
      stormOrbit: null, validity,
    };
  }

  const base = computeMetrics(design, mission, instruments, vehicle);
  const sOrbit = seed === null ? null : stormOrbit(seed, mission);
  const ops = runOps({
    design, mission, instruments, base, seed, response: resolveResponse(sOrbit, interventions),
  });
  return {
    instruments, vehicle,
    metrics: {
      ...base, brownoutOrbits: ops.brownoutOrbits, storagePauseOrbits: ops.storagePauseOrbits,
      damagedInstruments: ops.damaged.map((d) => d.id), dataGeneratedMb: ops.dataGeneratedMb,
      dataReturnedMb: ops.dataReturnedMb, dataPotentialMb: ops.dataPotentialMb,
      peakStorageMb: ops.peakStorageMb, stormOrbit: ops.stormOrbit,
    },
    orbits, brownoutOrbits: ops.brownoutOrbits, minReserveFrac: ops.minReserveFrac, sciencePerOrbit,
    realizedScience: ops.scienceRealized,
    scienceFrac: ops.sciencePotential > 0 ? ops.scienceRealized / ops.sciencePotential : 0,
    storageMb, storagePauseOrbits: ops.storagePauseOrbits, peakStorageMb: ops.peakStorageMb,
    dataFrac: ops.dataPotentialMb > 0 ? ops.dataReturnedMb / ops.dataPotentialMb : 0,
    stormOrbit: ops.stormOrbit, validity,
  };
}
