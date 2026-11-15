// simulate(design, mission, seed, interventions = []) -> MissionResult
//
// Phase 3: the orbit loop lives in models/ops.ts (shared with previewMission). This file validates,
// rolls the launch, runs the ops, and turns the result into a decision log, scores and a tier.
//
// Rewind fairness: the launch roll, the storm orbit and every radiation roll come from seed-derived streams
// that never look at the design or the response. An intervention therefore changes only what happens
// from the storm orbit on.
//
// Pure TypeScript. No DOM, no Phaser, no Date, no Math.random.
import type {
  Channel, Design, Intervention, MissionDef, MissionMetrics, MissionResult, ResponseId,
} from '@/data/schemas/types';
import { createLog } from './events/log';
import { launchRoll } from './models/launch';
import { storageMbOf } from './models/data';
import { runOps } from './models/ops';
import { RESPONSE_IDS, resolveResponse, stormOrbit } from './models/storm';
import { normalizeSeed } from './rng';
import { responseLabel } from './responses';
import { scoreMissionV2 } from './scoring2';
import { validateDesign } from './validate/validate';

function allFinite(m: MissionMetrics): boolean {
  return Object.values(m).every((v) => (typeof v === 'number' ? Number.isFinite(v) : true));
}

export function simulate(
  design: Design,
  mission: MissionDef,
  seed: number,
  interventions: Intervention[] = [],
): MissionResult {
  const seedN = normalizeSeed(seed);
  const log = createLog();

  // --- Log the player's design decisions (the roots of every causal chain) ------------------
  const designIds = {
    instruments: new Map<string, number>(), vehicle: 0, battery: 0, array: 0, storage: 0,
    powerCauses: [] as number[], costCauses: [] as number[],
  };
  for (const id of design.instruments) {
    const inst = mission.instruments.find((i) => i.id === id);
    const channels: Channel[] = ['mass', 'power', 'cost', 'data'];
    const entryId = log.add({
      t: 0, kind: 'design', key: `design.instrument.${id}`,
      label: `Chose ${inst ? inst.name : id}`, causes: [], channels,
      ...(inst ? { payload: { massKg: inst.massKg, powerW: inst.powerW, costM: inst.costM } } : {}),
    });
    designIds.instruments.set(id, entryId);
    designIds.powerCauses.push(entryId);
    designIds.costCauses.push(entryId);
  }
  const veh = mission.vehicles.find((v) => v.id === design.vehicle);
  designIds.vehicle = log.add({
    t: 0, kind: 'design', key: `design.vehicle.${design.vehicle}`,
    label: `Chose ${veh ? veh.name : design.vehicle}`, causes: [], channels: ['mass', 'cost', 'risk'],
  });
  designIds.battery = log.add({
    t: 0, kind: 'design', key: 'design.battery', label: `Battery ${design.batteryWh} Wh`,
    causes: [], channels: ['mass', 'power', 'cost'],
  });
  designIds.array = log.add({
    t: 0, kind: 'design', key: 'design.array', label: `Solar array ${design.arrayW} W`,
    causes: [], channels: ['mass', 'power', 'cost'],
  });
  designIds.storage = log.add({
    t: 0, kind: 'design', key: 'design.storage', label: `Storage ${storageMbOf(design, mission)} Mb`,
    causes: [], channels: ['mass', 'cost', 'data'],
  });
  designIds.powerCauses.push(designIds.battery, designIds.array);
  designIds.costCauses.push(designIds.vehicle, designIds.battery, designIds.array, designIds.storage);

  // --- Validate (never crash: explain) -------------------------------------------------------
  const check = validateDesign(design, mission);
  if (!check.ok || !check.metrics || !check.vehicle || !allFinite(check.metrics)) {
    const reasons = check.reasons.length > 0 ? check.reasons : ['The design produced an invalid number.'];
    return {
      seed: seedN, valid: false, reasons, tier: null, scores: {}, metrics: check.metrics,
      log: log.entries(), trace: [], stormOrbit: null, interventions: [],
    };
  }
  const { metrics, instruments, vehicle } = check;
  const nameOf = (id: string): string => instruments.find((i) => i.id === id)?.name ?? id;

  // --- Launch roll ----------------------------------------------------------------------------
  const roll = launchRoll(seedN);
  const launchOk = roll < vehicle.reliability;
  if (!launchOk) {
    const launchEventId = log.add({
      t: 0, kind: 'event', key: 'event.launch.failure', label: 'Launch failure',
      causes: [designIds.vehicle], channels: ['risk'],
      payload: { roll, reliability: vehicle.reliability },
    });
    const scored = scoreMissionV2({
      launchOk: false, scienceRealized: 0, sciencePotential: 0, dataReturnedMb: 0, dataPotentialMb: 0,
      brownoutOrbits: [], storagePauseOrbits: [], damagedNames: [], costM: metrics.totalCostM,
      budgetM: mission.rules.budgetM, response: null, responseLabel: null, rideOutScienceFrac: null,
      ids: { launchEvent: launchEventId, safeMode: [], storage: [], damage: [], decision: null, costDesign: designIds.costCauses },
    });
    return {
      seed: seedN, valid: true, reasons: [], tier: scored.tier, scores: scored.scores,
      metrics, log: log.entries(), trace: [], stormOrbit: null, interventions: [],
    };
  }

  // --- Ops: one shared loop ------------------------------------------------------------------
  const sOrbit = stormOrbit(seedN, mission);
  const response: ResponseId = resolveResponse(sOrbit, interventions);
  const opsInput = { design, mission, instruments, base: metrics, seed: seedN };
  const ops = runOps({ ...opsInput, response });
  const rideOut = response === 'ride-out' ? null : runOps({ ...opsInput, response: 'ride-out' });
  const rideOutFrac =
    rideOut && rideOut.sciencePotential > 0 ? rideOut.scienceRealized / rideOut.sciencePotential : null;
  const periodS = metrics.periodMin * 60;
  const shedName = ops.shedId ? nameOf(ops.shedId) : null;
  // Only a KNOWN response made AT the storm orbit counts as a choice (same rule as resolveResponse).
  const explicit =
    sOrbit !== null && interventions.some((iv) => iv && iv.orbit === sOrbit && RESPONSE_IDS.includes(iv.response));

  // --- Turn frames into logged events --------------------------------------------------------
  const safeIds: number[] = [];
  const storageIds: number[] = [];
  const damageIds: number[] = [];
  let stormId: number | null = null;
  let decisionId: number | null = null;
  for (const f of ops.frames) {
    const orbitStart = (f.orbit - 1) * periodS;
    if (sOrbit !== null && f.orbit === sOrbit && mission.storm) {
      stormId = log.add({
        t: orbitStart, kind: 'event', key: 'event.storm', label: `Solar storm on orbit ${f.orbit}`,
        causes: [], channels: ['power', 'risk'],
        payload: { orbit: f.orbit, orbits: Math.floor(mission.storm.durationOrbits), arrayPct: Math.round(mission.storm.arrayFactor * 100) },
      });
      decisionId = log.add({
        t: orbitStart, kind: 'decision', key: `decision.response.${response}`,
        label: explicit ? `You chose: ${responseLabel(response, shedName)}` : 'No response chosen: rode out the storm',
        causes: [stormId], channels: ['risk', 'power'], payload: { auto: !explicit, response },
      });
    }
    const stormCauses = f.stormActive && stormId !== null && decisionId !== null ? [stormId, decisionId] : [];
    if (f.status === 'safe-mode') {
      safeIds.push(
        log.add({
          t: orbitStart + metrics.eclipseMin * 60, kind: 'event', key: 'event.safe.mode',
          label: `Safe mode on orbit ${f.orbit}`, causes: [...designIds.powerCauses, ...stormCauses],
          channels: ['power'], payload: { orbit: f.orbit, loadW: f.loadW },
        }),
      );
    } else if (f.status === 'storage-full') {
      const feeders = f.activeIds.map((id) => designIds.instruments.get(id)).filter((n): n is number => n !== undefined);
      storageIds.push(
        log.add({
          t: orbitStart, kind: 'event', key: 'event.storage.full', label: `Storage full on orbit ${f.orbit}`,
          causes: [...feeders, designIds.storage], channels: ['data'],
          payload: { orbit: f.orbit, storedMb: f.storageStartMb },
        }),
      );
    }
    for (const id of f.damagedIds) {
      damageIds.push(
        log.add({
          t: orbitStart + periodS / 2, kind: 'event', key: 'event.radiation.damage',
          label: `${nameOf(id)} damaged by radiation on orbit ${f.orbit}`,
          causes: [...stormCauses, ...(designIds.instruments.has(id) ? [designIds.instruments.get(id) as number] : [])],
          channels: ['risk'], payload: { orbit: f.orbit, instrument: id },
        }),
      );
    }
  }

  const scored = scoreMissionV2({
    launchOk: true, scienceRealized: ops.scienceRealized, sciencePotential: ops.sciencePotential,
    dataReturnedMb: ops.dataReturnedMb, dataPotentialMb: ops.dataPotentialMb,
    brownoutOrbits: ops.brownoutOrbits, storagePauseOrbits: ops.storagePauseOrbits,
    damagedNames: ops.damaged.map((d) => nameOf(d.id)), costM: metrics.totalCostM,
    budgetM: mission.rules.budgetM, response: sOrbit === null ? null : response,
    responseLabel: sOrbit === null ? null : responseLabel(response, shedName), rideOutScienceFrac: rideOutFrac,
    ids: { launchEvent: null, safeMode: safeIds, storage: storageIds, damage: damageIds, decision: decisionId, costDesign: designIds.costCauses },
  });

  return {
    seed: seedN, valid: true, reasons: [], tier: scored.tier, scores: scored.scores,
    metrics: {
      ...metrics,
      brownoutOrbits: ops.brownoutOrbits,
      storagePauseOrbits: ops.storagePauseOrbits,
      damagedInstruments: ops.damaged.map((d) => d.id),
      dataGeneratedMb: ops.dataGeneratedMb, dataReturnedMb: ops.dataReturnedMb,
      dataPotentialMb: ops.dataPotentialMb, peakStorageMb: ops.peakStorageMb,
      stormOrbit: sOrbit, response: sOrbit === null ? null : response,
      rideOutSciencePct: rideOutFrac === null ? null : Math.round(rideOutFrac * 100),
    },
    log: log.entries(), trace: ops.frames,
    stormOrbit: sOrbit, interventions: sOrbit === null ? [] : [{ orbit: sOrbit, response }],
  };
}
