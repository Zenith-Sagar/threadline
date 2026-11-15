// Headless balance sweep (Phase 3). Runs the real simulate() over a grid of designs, several storm seeds,
// and all three storm responses. Used by tests/sim/balance.test.ts (permanent) and `npm run sweep`.
//
// Vocabulary
//   design      one point of the grid (instruments, launcher, battery, array, fuel margin, storage)
//   situation   a design plus a seed (the seed fixes the storm orbit and the radiation dice)
//   composite   the single comparison number from scoring2.compositeScore (not shown to players)
//   best-response   for each situation, the response with the highest composite (hindsight: an upper bound
//                   on what a skilled player could do)
import { LUNAR_RECON } from '@/content';
import type { Design, MissionDef, ResponseId } from '@/data/schemas/types';
import { compositeScore, simulate, sizePropellantKg, RESPONSE_IDS, stormOrbit } from '@/sim';
import { launchRoll } from '@/sim/models/launch';
import { dryMassKg } from '@/sim/models/mass';

export const BATTERY_STEPS = [100, 150, 225, 300];
export const ARRAY_STEPS = [150, 200, 260, 320];
export const FUEL_MARGINS = [0.02, 0.15, 0.4];
export const STORAGE_STEPS = [60, 120, 240];

/**
 * Sweep seeds: launch succeeds for every launcher (roll < 0.9) and the storm orbits cover 4..9 evenly.
 * Chosen deterministically, so the sweep is reproducible.
 */
export function pickSeeds(mission: MissionDef, perStormOrbit = 2): number[] {
  const need = new Map<number, number>();
  const seeds: number[] = [];
  for (let s = 1; s < 5000 && seeds.length < 6 * perStormOrbit; s++) {
    if (launchRoll(s) >= 0.9) continue;
    const o = stormOrbit(s, mission);
    if (o === null) continue;
    if ((need.get(o) ?? 0) >= perStormOrbit) continue;
    need.set(o, (need.get(o) ?? 0) + 1);
    seeds.push(s);
  }
  return seeds;
}

export function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...rest] = items as [T, ...T[]];
  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)];
}

export function buildDesign(
  mission: MissionDef,
  ids: string[],
  vehicle: string,
  batteryWh: number,
  arrayW: number,
  marginFrac: number,
  storageMb?: number,
): Design {
  const instruments = mission.instruments.filter((i) => ids.includes(i.id));
  const base: Design = {
    instruments: ids, vehicle, batteryWh, arrayW, propellantKg: 0,
    ...(storageMb === undefined ? {} : { storageMb }),
  };
  const dry = dryMassKg(base, mission, instruments);
  const dv = mission.dv.transitMps + mission.dv.insertionMps + mission.dv.stationKeepingMps;
  return { ...base, propellantKg: sizePropellantKg(dry, dv, mission.dv.ispS, marginFrac) };
}

export interface SweepRow {
  design: Design;
  label: string;
  marginFrac: number;
  valid: boolean;
  costM: number;
  reliability: number;
  /** Mean science points over the seeds, using the best response each time, times launch reliability. */
  expectedScience: number;
  efficiency: number;
  /** Mean of the best-response composites over the seeds (0..100). */
  meanComposite: number;
  /** Launch reliability x worst best-response composite x fuel headroom x mass headroom (0..1). */
  robustness: number;
  /** Per response: composite summed over seeds (to see which policy suits the design). */
  byResponse: Record<ResponseId, number>;
}

export interface Situation {
  label: string;
  seed: number;
  composite: Record<ResponseId, number>;
  best: ResponseId | null;
}

export interface SweepData {
  mission: MissionDef;
  seeds: number[];
  rows: SweepRow[];
  situations: Situation[];
}

const labelOf = (ids: string[], v: string, b: number, a: number, m: number, st: number): string =>
  `${ids.join('+')} / ${v} / ${b} Wh / ${a} W / fuel +${Math.round(m * 100)}% / ${st} Mb`;

export function runSweep(mission: MissionDef = LUNAR_RECON): SweepData {
  const seeds = pickSeeds(mission);
  const triples = combinations(mission.instruments.map((i) => i.id), mission.rules.instrumentCount);
  const orbits = mission.rules.opsOrbits;
  const rows: SweepRow[] = [];
  const situations: Situation[] = [];
  for (const ids of triples) {
    const perOrbit = mission.instruments.filter((i) => ids.includes(i.id)).reduce((s, i) => s + i.science, 0);
    for (const v of mission.vehicles) {
      for (const battery of BATTERY_STEPS) for (const array of ARRAY_STEPS) for (const margin of FUEL_MARGINS) {
        for (const storage of STORAGE_STEPS) {
          const design = buildDesign(mission, ids, v.id, battery, array, margin, storage);
          const label = labelOf(ids, v.id, battery, array, margin, storage);
          const first = simulate(design, mission, seeds[0] ?? 1);
          if (!first.valid || !first.metrics) {
            rows.push({
              design, label, marginFrac: margin, valid: false, costM: first.metrics?.totalCostM ?? 0,
              reliability: v.reliability, expectedScience: 0, efficiency: 0, meanComposite: 0, robustness: 0,
              byResponse: { 'ride-out': 0, 'shed-heaviest': 0, 'safe-mode': 0 },
            });
            continue;
          }
          const byResponse: Record<ResponseId, number> = { 'ride-out': 0, 'shed-heaviest': 0, 'safe-mode': 0 };
          let sci = 0;
          let comp = 0;
          let worst = 100;
          for (const seed of seeds) {
            const storm = stormOrbit(seed, mission) ?? 0;
            const composite = {} as Record<ResponseId, number>;
            let bestId: ResponseId = 'ride-out';
            let bestScience = 0;
            for (const r of RESPONSE_IDS) {
              const res = simulate(design, mission, seed, [{ orbit: storm, response: r }]);
              composite[r] = compositeScore(res.scores);
              byResponse[r] += composite[r];
              if (r === 'ride-out' || composite[r] > composite[bestId]) {
                bestId = r;
                bestScience = ((res.scores['scienceYield']?.value ?? 0) / 100) * perOrbit * orbits;
              }
            }
            sci += bestScience;
            comp += composite[bestId];
            worst = Math.min(worst, composite[bestId]);
            // Situations for the response analysis: one fuel margin only, to keep the count meaningful.
            if (margin === 0.15 && storage === 120) {
              const others = RESPONSE_IDS.filter((r) => r !== bestId).map((r) => composite[r]);
              const clear = composite[bestId] - Math.max(...others) >= 0.5;
              situations.push({ label, seed, composite, best: clear ? bestId : null });
            }
          }
          const n = seeds.length;
          const cost = first.metrics.totalCostM;
          // Margin headroom (as in Phase 2): spare launcher capacity and spare fuel make a design robust.
          const massHeadroom = Math.min(1, (v.capacityKg - first.metrics.wetKg) / v.capacityKg / 0.15);
          const fuelHeadroom = Math.min(1, first.metrics.dvMarginFrac / 0.3);
          rows.push({
            design, label, marginFrac: margin, valid: true, costM: cost, reliability: v.reliability,
            expectedScience: (sci / n) * v.reliability, efficiency: ((sci / n) * v.reliability) / cost,
            meanComposite: comp / n, robustness: (v.reliability * (worst / 100) * fuelHeadroom * massHeadroom), byResponse,
          });
        }
      }
    }
  }
  return { mission, seeds, rows, situations };
}

export type Archetype = 'lean' | 'scienceHeavy' | 'robust';

export interface SweepSummary {
  total: number;
  valid: number;
  viable: number;
  best: Record<Archetype, SweepRow>;
  paretoFront: SweepRow[];
  responseBest: Record<ResponseId | 'none', number>;
  situationCount: number;
}

/** A design must average this composite to count as a viable strategy. */
export const VIABLE_COMPOSITE = 55;

const maxBy = (rows: SweepRow[], f: (r: SweepRow) => number): SweepRow =>
  rows.reduce((a, b) => {
    const fa = f(a);
    const fb = f(b);
    if (fb > fa + 1e-9) return b;
    if (Math.abs(fb - fa) <= 1e-9 && b.costM < a.costM) return b;
    return a;
  });

export function summarize(data: SweepData): SweepSummary {
  const valid = data.rows.filter((r) => r.valid);
  const viable = valid.filter((r) => r.meanComposite >= VIABLE_COMPOSITE);
  const best: Record<Archetype, SweepRow> = {
    lean: maxBy(viable, (r) => r.efficiency),
    scienceHeavy: maxBy(valid, (r) => r.expectedScience),
    robust: maxBy(viable, (r) => r.robustness),
  };
  const dominates = (a: SweepRow, b: SweepRow): boolean =>
    a.costM <= b.costM && a.expectedScience >= b.expectedScience && a.robustness >= b.robustness &&
    (a.costM < b.costM || a.expectedScience > b.expectedScience || a.robustness > b.robustness);
  const paretoFront = valid.filter((r) => !valid.some((o) => dominates(o, r)));
  const responseBest: Record<ResponseId | 'none', number> = {
    'ride-out': 0, 'shed-heaviest': 0, 'safe-mode': 0, none: 0,
  };
  for (const s of data.situations) responseBest[s.best ?? 'none']++;
  return {
    total: data.rows.length, valid: valid.length, viable: viable.length, best, paretoFront,
    responseBest, situationCount: data.situations.length,
  };
}

export function formatReport(data: SweepData, s: SweepSummary): string {
  const f = (n: number, d = 1): string => n.toFixed(d);
  const line = (name: string, r: SweepRow): string =>
    `| ${name} | ${r.label} | $${f(r.costM)}M | ${f(r.expectedScience)} | ${f(r.meanComposite)} | ${f(r.efficiency, 2)} | ${f(r.robustness, 2)} |`;
  const pc = (n: number): string => `${f((100 * n) / s.situationCount)}%`;
  return [
    `Seeds: ${data.seeds.join(', ')} (storm orbits ${data.seeds.map((x) => stormOrbit(x, data.mission)).join(', ')}).`,
    `Designs in grid: ${s.total}; valid: ${s.valid} (${f((100 * s.valid) / s.total)}%); viable (mean composite >= ${VIABLE_COMPOSITE}): ${s.viable} (${f((100 * s.viable) / s.total)}%).`,
    `Pareto front (cost, expected science, robustness): ${s.paretoFront.length} designs.`,
    '',
    '| Archetype | Design | Cost | Exp. science | Mean composite | Sci/$M | Robustness |',
    '|---|---|---|---|---|---|---|',
    line('Lean', s.best.lean),
    line('Science-heavy', s.best.scienceHeavy),
    line('Robust', s.best.robust),
    '',
    `Storm responses, over ${s.situationCount} situations (design x seed), counting the response with the clearly highest composite (by 0.5 or more):`,
    '',
    '| Response | Clearly best in | Share |',
    '|---|---|---|',
    `| Ride it out | ${s.responseBest['ride-out']} | ${pc(s.responseBest['ride-out'])} |`,
    `| Switch off the biggest power user | ${s.responseBest['shed-heaviest']} | ${pc(s.responseBest['shed-heaviest'])} |`,
    `| Enter safe mode early | ${s.responseBest['safe-mode']} | ${pc(s.responseBest['safe-mode'])} |`,
    `| (no clear winner) | ${s.responseBest.none} | ${pc(s.responseBest.none)} |`,
  ].join('\n');
}
