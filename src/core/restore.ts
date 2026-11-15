// Turn a saved (untrusted) design into one the Design Bay can safely show: known instruments only,
// at most the allowed count, every number clamped to the slider ranges.
import type { Design, MissionDef } from '@/data/schemas/types';
import { RANGES } from './store';

const clamp = (n: number, min: number, max: number): number => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

export function sanitizeDesign(d: Design, mission: MissionDef): Design {
  const known = d.instruments.filter((id, i) => mission.instruments.some((x) => x.id === id) && d.instruments.indexOf(id) === i);
  return {
    instruments: known.slice(0, mission.rules.instrumentCount),
    vehicle: mission.vehicles.some((v) => v.id === d.vehicle) ? d.vehicle : (mission.vehicles[0]?.id ?? 'light'),
    batteryWh: clamp(Math.round(d.batteryWh), RANGES.batteryWh.min, RANGES.batteryWh.max),
    arrayW: clamp(Math.round(d.arrayW), RANGES.arrayW.min, RANGES.arrayW.max),
    propellantKg: clamp(Math.round(d.propellantKg), RANGES.propellantKg.min, RANGES.propellantKg.max),
    storageMb: clamp(Math.round(d.storageMb ?? mission.bus.defaultStorageMb), RANGES.storageMb.min, RANGES.storageMb.max),
  };
}
