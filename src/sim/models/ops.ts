// THE orbit loop. simulate() and previewMission() both call runOps(), so there is exactly one
// implementation of power, data, storm and damage. No other file may re-implement these formulas.
//
// Per orbit:
//   1. Which instruments are on? (not damaged, not switched off by the storm response)
//   2. Power: eclipse drain, then sunlight recharge (the array is weaker during the storm).
//   3. Data: instruments add data to onboard storage; if it would overflow they pause this orbit.
//   4. Downlink: the link sends up to `downlinkMbPerOrbit` home.
//   5. Storm radiation: each powered instrument may be permanently damaged (seed-only dice).
// Label: GAME MODEL on SIMPLIFIED PHYSICS. Pure: no DOM, no Date, no Math.random.
import type {
  Design, FrameStatus, Instrument, MissionDef, MissionMetrics, ResponseId, SimFrame,
} from '@/data/schemas/types';
import { storageMbOf } from './data';
import { stepOrbit } from './power';
import { hitRoll, opsOrbits, shedTarget, stormOrbit } from './storm';

export interface OpsInput {
  design: Design;
  mission: MissionDef;
  /** Instruments that were recognised in the design. */
  instruments: Instrument[];
  /** Metrics from computeMetrics (for the orbit timing). */
  base: MissionMetrics;
  /** null = no storm (the "calm" preview). */
  seed: number | null;
  response: ResponseId;
  /** false = project the storm without any radiation dice (used to show options without revealing the luck). Default true. */
  rollDamage?: boolean;
}

export interface OpsOutput {
  frames: SimFrame[];
  orbits: number;
  stormOrbit: number | null;
  /** Last orbit of the storm (stormOrbit + duration - 1), or -1. */
  stormLastOrbit: number;
  brownoutOrbits: number[];
  storagePauseOrbits: number[];
  damaged: { id: string; orbit: number }[];
  /** Instrument switched off by "Switch off the biggest power user", if that response is in force. */
  shedId: string | null;
  sciencePerOrbit: number;
  sciencePotential: number;
  scienceRealized: number;
  dataPotentialMb: number;
  dataGeneratedMb: number;
  dataReturnedMb: number;
  peakStorageMb: number;
  /** Lowest battery level after an eclipse, as a fraction of usable capacity. */
  minReserveFrac: number;
}

export function runOps(input: OpsInput): OpsOutput {
  const { design, mission, instruments, base, response } = input;
  const orbits = opsOrbits(mission);
  const storm = mission.storm;
  const sOrbit = input.seed === null ? null : stormOrbit(input.seed, mission);
  const stormLast = sOrbit === null || !storm ? -1 : sOrbit + Math.floor(storm.durationOrbits) - 1;
  const usableWh = design.batteryWh * mission.bus.usableBatteryFrac;
  const capacityMb = storageMbOf(design, mission);
  const downlinkMb = mission.bus.downlinkMbPerOrbit;
  const eclipseH = base.eclipseMin / 60;
  const sunlitH = base.sunlitMin / 60;
  const shed = response === 'shed-heaviest' ? shedTarget(instruments) : null;

  const sciencePerOrbit = instruments.reduce((s, i) => s + i.science, 0);
  const dataPerOrbit = instruments.reduce((s, i) => s + i.dataMbPerOrbit, 0);

  const frames: SimFrame[] = [];
  const brownoutOrbits: number[] = [];
  const storagePauseOrbits: number[] = [];
  const damaged: { id: string; orbit: number }[] = [];
  const damagedSet = new Set<string>();
  let energyWh = usableWh;
  let storedMb = 0;
  let scienceRealized = 0;
  let dataGeneratedMb = 0;
  let dataReturnedMb = 0;
  let peakStorageMb = 0;
  let minAfterEclipse = Number.POSITIVE_INFINITY;

  for (let orbit = 1; orbit <= orbits; orbit++) {
    const stormActive = sOrbit !== null && orbit >= sOrbit && orbit <= stormLast;
    const arrayW = design.arrayW * (stormActive && storm ? storm.arrayFactor : 1);
    const active = instruments.filter(
      (i) => !damagedSet.has(i.id) && !(stormActive && (response === 'safe-mode' || (shed !== null && i.id === shed.id))),
    );
    const loadW = mission.bus.baseLoadW + active.reduce((s, i) => s + i.powerW, 0);

    const power = stepOrbit(energyWh, {
      loadW, baseLoadW: mission.bus.baseLoadW, arrayW, usableWh, eclipseH, sunlitH,
    });
    minAfterEclipse = Math.min(minAfterEclipse, power.afterEclipseWh);

    const storageStartMb = storedMb;
    let status: FrameStatus = 'ok';
    let generatedMb = 0;
    if (power.brownout) {
      status = 'safe-mode';
      brownoutOrbits.push(orbit);
    } else if (active.length > 0) {
      const wanted = active.reduce((s, i) => s + i.dataMbPerOrbit, 0);
      if (storedMb + wanted > capacityMb) {
        status = 'storage-full';
        storagePauseOrbits.push(orbit);
      } else {
        generatedMb = wanted;
        storedMb += wanted;
        scienceRealized += active.reduce((s, i) => s + i.science, 0);
      }
    }
    dataGeneratedMb += generatedMb;
    peakStorageMb = Math.max(peakStorageMb, storedMb);

    const sent = Math.min(storedMb, downlinkMb);
    storedMb -= sent;
    dataReturnedMb += sent;

    const damagedIds: string[] = [];
    if (stormActive && storm && input.seed !== null && input.rollDamage !== false && !power.brownout) {
      for (const i of active) {
        if (hitRoll(input.seed, orbit, i.id) < storm.damageChance) {
          damagedSet.add(i.id);
          damaged.push({ id: i.id, orbit });
          damagedIds.push(i.id);
        }
      }
    }

    frames.push({
      orbit, loadW, batteryStartWh: energyWh, batteryAfterEclipseWh: power.afterEclipseWh,
      brownout: power.brownout, status, stormActive, arrayW, storageStartMb,
      storageEndMb: storedMb, generatedMb, downlinkedMb: sent,
      activeIds: active.map((i) => i.id), damagedIds,
    });
    energyWh = power.endWh;
  }

  return {
    frames, orbits, stormOrbit: sOrbit, stormLastOrbit: stormLast, brownoutOrbits, storagePauseOrbits,
    damaged, shedId: shed ? shed.id : null, sciencePerOrbit,
    sciencePotential: sciencePerOrbit * orbits, scienceRealized,
    dataPotentialMb: dataPerOrbit * orbits, dataGeneratedMb, dataReturnedMb, peakStorageMb,
    minReserveFrac:
      usableWh > 0 && Number.isFinite(minAfterEclipse) ? Math.max(0, minAfterEclipse / usableWh) : 0,
  };
}
