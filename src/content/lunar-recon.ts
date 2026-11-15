import type { MissionDef } from '@/data/schemas/types';
import moon from '@/data/snapshots/moon-facts.json';
import { INSTRUMENTS } from './instruments';
import { VEHICLES } from './vehicles';

// Lunar reconnaissance orbiter: the MVP mission.
//
// Provenance:
//   NASA DATA (snapshot, VERIFIED 2026-10-10): body radius, GM.
//   GAME MODEL: bus, budget, rules, eclipseSeverity.
//   UNVERIFIED placeholders (must be checked by a human before they appear in the UI as facts):
//     dv.transitMps, dv.insertionMps, dv.stationKeepingMps, dv.ispS
export const LUNAR_RECON: MissionDef = {
  id: 'lunar-recon',
  name: 'Lunar reconnaissance orbiter',
  rules: { instrumentCount: 3, opsOrbits: 14, budgetM: 175 },
  bus: {
    // Phase 3: storage (120 Mb x 0.02 kg = 2.4 kg, 120 Mb x $0.03M = $3.6M) is carved out of the old
    // structure mass and fixed cost, so a default-storage design keeps its Phase 2 mass and cost.
    structureKg: 117.6,
    batteryKgPerWh: 0.04,
    arrayKgPerW: 0.07,
    baseLoadW: 70,
    usableBatteryFrac: 0.8,
    fixedCostM: 16.4,
    batteryCostMPerWh: 0.02,
    arrayCostMPerW: 0.05,
    storageKgPerMb: 0.02,
    storageCostMPerMb: 0.03,
    defaultStorageMb: 120,
    downlinkMbPerOrbit: 14,
  },
  orbit: {
    bodyRadiusKm: moon.values.volumetricMeanRadiusKm,
    // The sheet reports GM in units of 10^6 km^3/s^2 (3 significant figures).
    bodyGmKm3S2: moon.values.gmE6Km3S2 * 1e6,
    // Mean Earth-Moon distance (NASA DATA via the snapshot). Used for the light-delay display only.
    earthDistanceKm: moon.values.semimajorAxisE6Km * 1e6,
    altitudeKm: 100,
    eclipseSeverity: 1,
  },
  dv: {
    transitMps: 80, // UNVERIFIED placeholder
    insertionMps: 900, // UNVERIFIED placeholder
    stationKeepingMps: 100, // UNVERIFIED placeholder
    ispS: 300, // UNVERIFIED placeholder
  },
  instruments: INSTRUMENTS,
  vehicles: VEHICLES,
  // GAME MODEL. Not a forecast of real space weather.
  storm: { earliestOrbit: 4, latestOrbit: 9, durationOrbits: 3, arrayFactor: 0.5, damageChance: 0.15 },
};

/** The same mission without the storm: lets Phase 1 and 2 regression tests keep their pinned numbers. */
export const LUNAR_RECON_CALM: MissionDef = { ...LUNAR_RECON, storm: undefined };
