// Derived numbers for a design: mass, delta-v, cost, power load, orbit timing.
import type { Design, Instrument, LaunchVehicle, MissionDef, MissionMetrics } from '@/data/schemas/types';
import { dryMassKg, totalCostM } from './mass';
import { deltaVMps, requiredDvMps } from './propulsion';
import { eclipseFraction, orbitPeriodMin } from './orbit';
import { storageMbOf } from './data';

export function computeMetrics(
  design: Design,
  mission: MissionDef,
  instruments: Instrument[],
  vehicle: LaunchVehicle,
): MissionMetrics {
  const dryKg = dryMassKg(design, mission, instruments);
  const wetKg = dryKg + design.propellantKg;
  const dvAvailableMps = deltaVMps(mission.dv.ispS, wetKg, dryKg);
  const dvRequiredMps = requiredDvMps(mission.dv);
  const periodMin = orbitPeriodMin(mission.orbit);
  const eclipseMin = periodMin * eclipseFraction(mission.orbit);
  return {
    dryKg,
    wetKg,
    dvAvailableMps,
    dvRequiredMps,
    dvMarginFrac: dvRequiredMps > 0 ? dvAvailableMps / dvRequiredMps - 1 : 0,
    totalCostM: totalCostM(design, mission, instruments, vehicle.costM),
    loadW: mission.bus.baseLoadW + instruments.reduce((sum, i) => sum + i.powerW, 0),
    periodMin,
    eclipseMin,
    sunlitMin: periodMin - eclipseMin,
    brownoutOrbits: [],
    storageMb: storageMbOf(design, mission),
    downlinkMbPerOrbit: mission.bus.downlinkMbPerOrbit,
    dataGeneratedMb: 0,
    dataReturnedMb: 0,
    dataPotentialMb: 0,
    peakStorageMb: 0,
    storagePauseOrbits: [],
    damagedInstruments: [],
    stormOrbit: null,
    response: null,
    rideOutSciencePct: null,
  };
}
