// Cause-chain builder: turns a MissionResult's decision log into plain-language chains such as
//   Radar sounder -> 38 W of power -> battery empties during the eclipse -> Safe mode on orbit 8
// Pure function. Heuristic ranking is documented below and pinned by tests/sim/causes.test.ts.
import type { Design, Instrument, MissionDef, MissionResult } from '@/data/schemas/types';
import { storageMbOf } from './models/data';
import { shedTarget } from './models/storm';
import { responseLabel } from './responses';

export type DecisionKey = string; // 'instrument:<id>' | 'battery' | 'array' | 'vehicle' | 'fuel' | 'storage' | 'response'

export interface CauseLink {
  kind: 'decision' | 'effect' | 'outcome';
  text: string;
}

export interface CauseChain {
  /** Stable id, e.g. "safe-mode:instrument:radar". */
  id: string;
  links: CauseLink[];
  /** The player decision this chain starts from (used by "Change this decision"). */
  decisionKey: DecisionKey;
  /** One full sentence with the numbers; used for screen readers and the Engineering Detail view. */
  detail: string;
}

const r = (n: number): number => Math.round(n);

function outcomeText(orbits: number[]): string {
  const first = orbits[0] ?? 0;
  return orbits.length <= 1
    ? `Safe mode on orbit ${first}`
    : `Safe mode on orbit ${first} and ${orbits.length - 1} more`;
}

function chain(id: string, decisionKey: DecisionKey, links: CauseLink[], detail: string): CauseChain {
  return { id, links, decisionKey, detail };
}

/**
 * Ranking heuristic for safe-mode chains (brownouts):
 *   1. the heaviest power consumer,
 *   2. the binding power system: the battery if one eclipse needs more than it can give,
 *      otherwise the solar array if sunlight cannot refill what the eclipse used,
 *   3. the second-heaviest consumer.
 * Returns at most `max` chains. Invalid or empty results give [].
 */
export function buildCauseChains(
  result: MissionResult,
  design: Design,
  mission: MissionDef,
  max = 3,
): CauseChain[] {
  const m = result.metrics;
  if (!result.valid || !m) return [];

  // --- Launch failure ----------------------------------------------------------------------
  const failure = result.log.find((e) => e.key === 'event.launch.failure');
  if (failure) {
    const veh = mission.vehicles.find((v) => v.id === design.vehicle);
    const rel = veh ? r(veh.reliability * 100) : 0;
    return [
      chain(
        'launch-failure:vehicle', 'vehicle',
        [
          { kind: 'decision', text: veh ? veh.name : 'Launcher' },
          { kind: 'effect', text: `about ${rel} in 100 launches succeed` },
          { kind: 'effect', text: 'this launch was one of the others' },
          { kind: 'outcome', text: 'Launch failure' },
        ],
        `${veh ? veh.name : 'The launcher'} succeeds about ${rel}% of the time. This launch drew a failure. A more reliable launcher lowers the odds, but costs more.`,
      ),
    ].slice(0, max);
  }

  const eclipseH = m.eclipseMin / 60;
  const sunH = m.sunlitMin / 60;
  const drainWh = m.loadW * eclipseH;
  const usableWh = design.batteryWh * mission.bus.usableBatteryFrac;
  const refillWh = Math.max(0, design.arrayW - m.loadW) * sunH;
  const byPower = design.instruments
    .map((id) => mission.instruments.find((i) => i.id === id))
    .filter((i) => i !== undefined)
    .sort((a, b) => b.powerW - a.powerW);

  // --- Collect chains per crisis category -------------------------------------------------------
  const storm = mission.storm;
  const power: CauseChain[] = [];
  const storage: CauseChain[] = [];
  const response: CauseChain[] = [];

  // Power (safe mode)
  const safeEvents = result.log.filter((e) => e.key === 'event.safe.mode');
  if (safeEvents.length > 0) {
    const orbits = safeEvents.map((e) => Number(e.payload?.['orbit'] ?? 0));
    const outcome = outcomeText(orbits);
    const firstSafe = result.trace.find((f) => f.status === 'safe-mode');
    // A brownout during the storm, or in the two orbits after it while the battery is still recovering.
    const stormStart = m.stormOrbit;
    const stormEnd = storm && stormStart !== null ? stormStart + Math.floor(storm.durationOrbits) - 1 : -1;
    const stormBound =
      storm !== undefined && stormStart !== null && firstSafe !== undefined &&
      firstSafe.orbit >= stormStart && firstSafe.orbit <= stormEnd + 2;
    const duringStorm = firstSafe?.stormActive === true;
    const batteryBound = !stormBound && drainWh > usableWh;
    const stormPct = storm ? r(storm.arrayFactor * 100) : 100;
    const mech = stormBound
      ? duringStorm
        ? `the storm cuts the solar array to ${stormPct}%`
        : 'the storm drained the battery and sunlight has not refilled it yet'
      : batteryBound
        ? 'battery empties during the eclipse'
        : 'sunlight cannot refill what each eclipse uses';
    const mechDetail = stormBound
      ? duringStorm
        ? `During the storm the array made only ${r(firstSafe?.arrayW ?? 0)} W while the spacecraft drew ${r(firstSafe?.loadW ?? 0)} W, so the battery ran down.`
        : `The storm cut the array to ${stormPct}% for ${Math.floor(storm?.durationOrbits ?? 0)} orbits and the battery started orbit ${firstSafe?.orbit ?? 0} with only ${r(firstSafe?.batteryStartWh ?? 0)} Wh, not enough for the eclipse.`
      : batteryBound
        ? `One ${r(m.eclipseMin)}-minute eclipse needs ${r(drainWh)} Wh but only ${r(usableWh)} Wh of the battery is usable.`
        : `Each eclipse uses ${r(drainWh)} Wh but sunlight only refills ${r(refillWh)} Wh per orbit, so the battery runs down.`;

    const consumer = (idx: number): CauseChain | null => {
      const inst = byPower[idx];
      if (!inst) return null;
      return chain(
        `safe-mode:instrument:${inst.id}`, `instrument:${inst.id}`,
        [
          { kind: 'decision', text: inst.name },
          { kind: 'effect', text: `${r(inst.powerW)} W of power` },
          { kind: 'effect', text: mech },
          { kind: 'outcome', text: outcome },
        ],
        `${inst.name} draws ${r(inst.powerW)} W. The spacecraft draws ${r(m.loadW)} W in total. ${mechDetail}`,
      );
    };

    const binding = batteryBound
      ? chain(
          'safe-mode:battery', 'battery',
          [
            { kind: 'decision', text: `Battery ${r(design.batteryWh)} Wh` },
            { kind: 'effect', text: `${r(usableWh)} Wh usable` },
            { kind: 'effect', text: mech },
            { kind: 'outcome', text: outcome },
          ],
          `${mechDetail} A bigger battery, or fewer power-hungry instruments, would help.`,
        )
      : chain(
          'safe-mode:array', 'array',
          [
            { kind: 'decision', text: `Solar array ${r(design.arrayW)} W` },
            { kind: 'effect', text: stormBound ? `makes only ${stormPct}% during the storm` : `refills ${r(refillWh)} Wh per orbit` },
            { kind: 'effect', text: mech },
            { kind: 'outcome', text: outcome },
          ],
          `${mechDetail} A bigger solar array, or a lighter load, would help.`,
        );
    for (const c of [consumer(0), binding, consumer(1)]) if (c) power.push(c);
  }

  // Data (storage full)
  const fullEvents = result.log.filter((e) => e.key === 'event.storage.full');
  if (fullEvents.length > 0) {
    const orbits = fullEvents.map((e) => Number(e.payload?.['orbit'] ?? 0));
    const first = orbits[0] ?? 0;
    const outcome =
      orbits.length <= 1 ? `Instruments paused on orbit ${first}` : `Instruments paused on orbit ${first} and ${orbits.length - 1} more`;
    const storageMb = storageMbOf(design, mission);
    const perOrbit = design.instruments
      .map((id) => mission.instruments.find((i) => i.id === id))
      .reduce((sum, i) => sum + (i ? i.dataMbPerOrbit : 0), 0);
    const link = mission.bus.downlinkMbPerOrbit;
    const byData: Instrument[] = byPower.slice().sort((a, b) => b.dataMbPerOrbit - a.dataMbPerOrbit);
    const top = byData[0];
    const mechDetail = `The instruments make ${r(perOrbit)} Mb per orbit but the link only sends ${r(link)} Mb home, so ${r(storageMb)} Mb of storage fills up.`;
    if (top) {
      storage.push(
        chain(
          `storage:instrument:${top.id}`, `instrument:${top.id}`,
          [
            { kind: 'decision', text: top.name },
            { kind: 'effect', text: `${r(top.dataMbPerOrbit)} Mb of data per orbit` },
            { kind: 'effect', text: 'storage fills faster than the link empties it' },
            { kind: 'outcome', text: outcome },
          ],
          `${top.name} makes ${r(top.dataMbPerOrbit)} Mb each orbit. ${mechDetail}`,
        ),
      );
    }
    storage.push(
      chain(
        'storage:size', 'storage',
        [
          { kind: 'decision', text: `Storage ${r(storageMb)} Mb` },
          { kind: 'effect', text: `holds about ${perOrbit > link ? r(storageMb / (perOrbit - link)) : '99'} orbits of extra data` },
          { kind: 'effect', text: 'storage fills faster than the link empties it' },
          { kind: 'outcome', text: outcome },
        ],
        `${mechDetail} More storage, or fewer data-hungry instruments, would help.`,
      ),
    );
  }

  // The storm and the player's response
  if (storm && m.stormOrbit !== null && m.response !== null) {
    const instruments = design.instruments
      .map((id) => mission.instruments.find((i) => i.id === id))
      .filter((i): i is Instrument => i !== undefined);
    const target = shedTarget(instruments);
    const label = responseLabel(m.response, target ? target.name : null);
    const chance = r(storm.damageChance * 100);
    const duration = Math.floor(storm.durationOrbits);
    const damageEvents = result.log.filter((e) => e.key === 'event.radiation.damage');
    if (damageEvents.length > 0) {
      const names = damageEvents.map((e) => e.label.replace(/ damaged by radiation on orbit \d+$/, ''));
      const firstOrbit = Number(damageEvents[0]?.payload?.['orbit'] ?? 0);
      response.push(
        chain(
          'storm:damage', 'response',
          [
            { kind: 'decision', text: label },
            { kind: 'effect', text: `${chance}% risk per instrument on each storm orbit` },
            { kind: 'effect', text: `${names.join(' and ')} damaged on orbit ${firstOrbit}` },
            { kind: 'outcome', text: 'lost for the rest of the mission' },
          ],
          `You chose "${label}". Instruments that stayed on had a ${chance}% chance each storm orbit of lasting radiation damage, and ${names.join(' and ')} did not make it. The dice come from the seed, so rewinding gives the same luck.`,
        ),
      );
    } else if (m.response !== 'ride-out') {
      const given = m.response === 'safe-mode' ? instruments.reduce((s2, i) => s2 + i.science, 0) : target ? target.science : 0;
      const sci = result.scores['scienceYield']?.value ?? 0;
      response.push(
        chain(
          'storm:response', 'response',
          [
            { kind: 'decision', text: label },
            { kind: 'effect', text: `${r(given)} science per orbit given up for ${duration} orbits` },
            { kind: 'effect', text: m.response === 'safe-mode' ? 'no instrument exposed to the storm' : 'less power drawn during the storm' },
            { kind: 'outcome', text: m.rideOutSciencePct !== null ? `${sci}% science (riding it out: ${m.rideOutSciencePct}%)` : `${sci}% science` },
          ],
          `You chose "${label}". It gave up ${r(given)} science per orbit for ${duration} orbits. Riding the storm out would have ended with ${m.rideOutSciencePct ?? sci}% of the science.`,
        ),
      );
    }
    if (response.length === 0 && power.length === 0 && storage.length === 0) {
      response.push(
        chain(
          'storm:lucky', 'response',
          [
            { kind: 'decision', text: label },
            { kind: 'effect', text: `${chance}% risk per instrument on each storm orbit` },
            { kind: 'effect', text: 'no instrument was damaged this time' },
            { kind: 'outcome', text: 'storm survived' },
          ],
          `You chose "${label}". Each instrument that stayed on had a ${chance}% chance per storm orbit of lasting damage, and none was hit this time.`,
        ),
      );
    }
  }

  if (power.length + storage.length + response.length > 0) {
    // One chain from each category first, then fill with the next-best from the same categories.
    const lists = [power, storage, response];
    const picked: CauseChain[] = [];
    for (let round = 0; picked.length < max && round < 3; round++) {
      for (const list of lists) {
        const c = list[round];
        if (c && picked.length < max) picked.push(c);
      }
    }
    return picked;
  }

  // --- Nothing went wrong: explain what went right ----------------------------------------------
  const chains: CauseChain[] = [];
  chains.push(
    chain(
      'ok:battery', 'battery',
      [
        { kind: 'decision', text: `Battery ${r(design.batteryWh)} Wh` },
        { kind: 'effect', text: `${r(usableWh)} Wh usable covers the ${r(drainWh)} Wh an eclipse uses` },
        { kind: 'effect', text: `sunlight refills ${r(refillWh)} Wh per orbit` },
        { kind: 'outcome', text: `Powered on all ${m.brownoutOrbits.length === 0 ? result.trace.length : 0} orbits` },
      ],
      `One eclipse uses ${r(drainWh)} Wh and the battery gives ${r(usableWh)} Wh. Sunlight refills ${r(refillWh)} Wh each orbit, so the instruments never switched off.`,
    ),
  );
  const top = byPower
    .slice()
    .sort((a, b) => b.science - a.science)[0];
  if (top) {
    const pct = result.scores['scienceYield']?.value ?? 0;
    chains.push(
      chain(
        `ok:instrument:${top.id}`, `instrument:${top.id}`,
        [
          { kind: 'decision', text: top.name },
          { kind: 'effect', text: `+${r(top.science)} science per orbit` },
          { kind: 'effect', text: `across ${result.trace.length} orbits` },
          { kind: 'outcome', text: `${pct}% of the science collected` },
        ],
        `${top.name} is your biggest science source. It ran on every orbit.`,
      ),
    );
  }
  const veh = mission.vehicles.find((v) => v.id === design.vehicle);
  if (veh) {
    chains.push(
      chain(
        'ok:vehicle', 'vehicle',
        [
          { kind: 'decision', text: veh.name },
          { kind: 'effect', text: `about ${r(veh.reliability * 100)} in 100 launches succeed` },
          { kind: 'effect', text: 'this launch succeeded' },
          { kind: 'outcome', text: 'Reached lunar orbit' },
        ],
        `${veh.name} succeeds about ${r(veh.reliability * 100)}% of the time, and this launch went well.`,
      ),
    );
  }
  return chains.slice(0, max);
}
