import { LUNAR_RECON } from '@/content';
import type { Design } from '@/data/schemas/types';
import { sizePropellantKg } from '@/sim';
import { dryMassKg } from '@/sim/models/mass';

/** Build a design whose propellant covers the mission delta-v plus a 15% margin. */
export function buildDesign(
  instrumentIds: string[],
  vehicle: string,
  batteryWh = 150,
  arrayW = 200,
): Design {
  const instruments = LUNAR_RECON.instruments.filter((i) => instrumentIds.includes(i.id));
  const base: Design = { instruments: instrumentIds, vehicle, batteryWh, arrayW, propellantKg: 0 };
  const dry = dryMassKg(base, LUNAR_RECON, instruments);
  const d = LUNAR_RECON.dv;
  const dv = d.transitMps + d.insertionMps + d.stationKeepingMps;
  return { ...base, propellantKg: sizePropellantKg(dry, dv, d.ispS, 0.15) };
}

/**
 * A design exactly as the player would build it in the UI: slider values in steps of 10 and fuel from the
 * "Auto-size fuel" button (15% margin, rounded UP to a whole kilogram). Used by the tier recipes.
 */
export function buildUiDesign(
  instrumentIds: string[],
  vehicle: string,
  batteryWh: number,
  arrayW: number,
  storageMb = 120,
): Design {
  const instruments = LUNAR_RECON.instruments.filter((i) => instrumentIds.includes(i.id));
  const base: Design = { instruments: instrumentIds, vehicle, batteryWh, arrayW, propellantKg: 0, storageMb };
  const dry = dryMassKg(base, LUNAR_RECON, instruments);
  const d = LUNAR_RECON.dv;
  const dv = d.transitMps + d.insertionMps + d.stationKeepingMps;
  return { ...base, propellantKg: Math.ceil(sizePropellantKg(dry, dv, d.ispS, 0.15)) };
}
