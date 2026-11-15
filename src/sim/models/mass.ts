// Mass and cost models. Label: GAME MODEL.
import type { Design, Instrument, MissionDef } from '@/data/schemas/types';
import { storageMbOf } from './data';

export function dryMassKg(design: Design, mission: MissionDef, instruments: Instrument[]): number {
  const { bus } = mission;
  const instrumentKg = instruments.reduce((sum, i) => sum + i.massKg, 0);
  return (
    bus.structureKg +
    instrumentKg +
    design.batteryWh * bus.batteryKgPerWh +
    design.arrayW * bus.arrayKgPerW +
    storageMbOf(design, mission) * bus.storageKgPerMb
  );
}

export function totalCostM(
  design: Design,
  mission: MissionDef,
  instruments: Instrument[],
  vehicleCostM: number,
): number {
  const { bus } = mission;
  const instrumentCost = instruments.reduce((sum, i) => sum + i.costM, 0);
  return (
    bus.fixedCostM +
    instrumentCost +
    vehicleCostM +
    design.batteryWh * bus.batteryCostMPerWh +
    design.arrayW * bus.arrayCostMPerW +
    storageMbOf(design, mission) * bus.storageCostMPerMb
  );
}
