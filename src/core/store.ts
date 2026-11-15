// Game state (zustand vanilla). The single source of truth for the DOM screens.
//
// Rules:
//   - The simulation (src/sim) is called from here and nowhere in the UI.
//   - Phaser never touches this store. The launch screen talks to Phaser through the
//     contract in src/scenes/launch-contract.ts (config in, callbacks out).
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Design, Intervention, MissionDef, MissionResult, ResponseId, Tier } from '@/data/schemas/types';
import type { SharedMission } from '@/share/code';
import {
  diffDesigns, diffInterventions, diffResults, findPauseOrbit, normalizeSeed, simulate,
  stormOrbit, validateDesign,
} from '@/sim';
import type { DecisionChange, DecisionKey, ResultDiff } from '@/sim';
import { applyVariant, type VariantId } from '@/content/variants';
import { buildDemoDesign, DEMO_RESPONSE, DEMO_SEED } from './demo';
import { AUTO_FUEL_MARGIN, autoFuelKg } from './fuel';

export type Screen = 'title' | 'brief' | 'design' | 'launch' | 'mission' | 'outcome' | 'diff';

/** Slider ranges for the Design Bay. */
export const RANGES = {
  batteryWh: { min: 50, max: 400, step: 10 },
  arrayW: { min: 100, max: 400, step: 10 },
  propellantKg: { min: 0, max: 200, step: 1 },
  storageMb: { min: 40, max: 300, step: 10 },
} as const;

export { AUTO_FUEL_MARGIN };

export interface Baseline {
  design: Design;
  result: MissionResult;
  /** The storm response that was in force (empty when no storm was reached). */
  interventions: Intervention[];
}

/** Phase 5: a design opened from a share link, plus the tier the receiver's own simulate() computed for it. */
export interface SharedInfo {
  design: Design;
  seed: number;
  variant: VariantId;
  response: ResponseId | null;
  /** Computed locally from the link's design, seed, variant and response. Never read from the link. */
  tier: Tier | null;
  /** Notes about anything that was clamped or dropped while opening the link. */
  notes: string[];
}

export interface GameState {
  /** The ACTIVE mission: the base mission with the chosen variant applied. Every screen and simulate() read this. */
  mission: MissionDef;
  /** Phase 5: the unmodified mission the variants are derived from. */
  baseMission: MissionDef;
  variant: VariantId;
  /** Pick a mission variant (Title and Brief screens only). Content-only: it changes mission constants, nothing else. */
  setVariant: (id: VariantId) => void;
  screen: Screen;
  seed: number;
  design: Design;
  /** Result of the most recent run. */
  result: MissionResult | null;
  /** The run being rewound from (set while the player is changing decisions). */
  baseline: Baseline | null;
  rewindFocus: DecisionKey | null;
  diff: ResultDiff | null;
  decisionChanges: DecisionChange[];
  /** Incremented when the player presses Launch on an invalid design (the UI moves focus to the reasons). */
  blockedLaunches: number;
  /** Phase 3: the storm response chosen in Mission Control (or changed while rewinding). */
  interventions: Intervention[];
  /** Phase 3: the orbit where Mission Control pauses for the storm decision, or null. */
  pauseOrbit: number | null;
  /** Phase 4: Demo Mode (a scripted path through real simulate() results). */
  demo: boolean;
  /** Phase 5: the opened share link (drives the "Try to beat this" banner), or null. */
  shared: SharedInfo | null;
  /** Phase 5: a message about a link that could not be opened (shown as a banner, never blocks). */
  shareNotice: string | null;
  loadShared: (share: SharedMission, notes: string[]) => void;
  setShareNotice: (text: string | null) => void;
  dismissShared: () => void;
  /** Phase 4: counters the guided first run watches (UI events, never part of the simulation). */
  threadsDrawn: number;
  /** Which control caused the most recent thread (the guided run needs to tell a slider from an instrument tick). */
  lastThreadControl: string | null;
  autoSizes: number;

  noteThread: (control?: string) => void;
  startDemo: () => void;
  exitDemo: () => void;
  /** Demo: launch, answer the storm with the demo response, and show the outcome. All real simulate() calls. */
  demoSkipToOutcome: () => void;
  /** Continue a saved design (already sanitised by the caller). */
  resume: (design: Design, seed: number, variant?: VariantId) => void;
  newMission: (seed?: number) => void;
  go: (screen: Screen) => void;
  /** Returns false when a 4th instrument is refused. */
  toggleInstrument: (id: string) => boolean;
  setVehicle: (id: string) => void;
  setBattery: (wh: number) => void;
  setArray: (w: number) => void;
  setPropellant: (kg: number) => void;
  setStorage: (mb: number) => void;
  autoSizeFuel: () => void;
  /** Runs the mission if the design is valid. Returns false (and bumps blockedLaunches) otherwise. */
  launch: () => boolean;
  /** Launch animation over: go to Mission Control when there is a decision to make, else to the outcome. */
  finishLaunch: () => void;
  /** Mission Control: the player's answer to the storm. Re-runs the mission with this intervention. */
  chooseResponse: (response: ResponseId) => void;
  /** Mission Control is over: show the outcome. */
  finishMission: () => void;
  /** While rewinding: change only the storm response. */
  setResponse: (response: ResponseId) => void;
  beginRewind: (focus?: DecisionKey) => void;
  cancelRewind: () => void;
  /** From the diff screen: use the newest run as the baseline for another change. */
  continueRewind: () => void;
}

export interface StoreOptions {
  mission: MissionDef;
  /** Seed source. Lives outside src/sim so the engine stays deterministic. */
  newSeed: () => number;
}

const clamp = (n: number, min: number, max: number): number =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;

const cloneDesign = (d: Design): Design => ({ ...d, instruments: d.instruments.slice() });

export function defaultDesign(): Design {
  return { instruments: [], vehicle: 'light', batteryWh: 150, arrayW: 200, propellantKg: 90 };
}

const cloneInterventions = (list: Intervention[]): Intervention[] => list.map((i) => ({ ...i }));

export function createGameStore(opts: StoreOptions): StoreApi<GameState> {
  const baseMission = opts.mission;

  return createStore<GameState>()((set, get) => {
    const patchDesign = (patch: Partial<Design>): void => set({ design: { ...get().design, ...patch } });

    return {
      mission: baseMission,
      baseMission,
      variant: 'standard',
      setVariant: (id) => {
        const st = get();
        if (st.screen !== 'title' && st.screen !== 'brief') return;
        set({ variant: id, mission: applyVariant(baseMission, id) });
      },
      screen: 'title',
      seed: 0,
      design: defaultDesign(),
      result: null,
      baseline: null,
      rewindFocus: null,
      diff: null,
      decisionChanges: [],
      blockedLaunches: 0,
      interventions: [],
      pauseOrbit: null,
      demo: false,
      shared: null,
      shareNotice: null,
      threadsDrawn: 0,
      lastThreadControl: null,
      autoSizes: 0,

      noteThread: (control) => set({ threadsDrawn: get().threadsDrawn + 1, lastThreadControl: control ?? null }),

      startDemo: () =>
        set({
          demo: true, shared: null, screen: 'design', seed: DEMO_SEED, design: buildDemoDesign(baseMission),
          // The demo always runs the standard mission, whatever variant the player last chose.
          variant: 'standard', mission: baseMission,
          result: null, baseline: null, rewindFocus: null, diff: null, decisionChanges: [],
          blockedLaunches: 0, interventions: [], pauseOrbit: null,
        }),

      exitDemo: () => set({ demo: false, shared: null, screen: 'title', result: null, baseline: null, diff: null, decisionChanges: [], interventions: [], pauseOrbit: null }),

      demoSkipToOutcome: () => {
        const st = get();
        if (!st.demo || st.baseline) return;
        if (!st.launch()) return;
        get().finishLaunch();
        if (get().screen === 'mission') get().chooseResponse(DEMO_RESPONSE);
        get().finishMission();
      },

      loadShared: (share, notes) => {
        const m = applyVariant(baseMission, share.variant);
        const seed = normalizeSeed(share.seed);
        const pause = findPauseOrbit(share.design, m, seed);
        const interventions: Intervention[] = share.response && pause !== null ? [{ orbit: pause, response: share.response }] : [];
        const r = simulate(share.design, m, seed, interventions);
        set({
          demo: false, screen: 'design', seed, design: share.design, variant: share.variant, mission: m,
          result: null, baseline: null, rewindFocus: null, diff: null, decisionChanges: [],
          blockedLaunches: 0, interventions: [], pauseOrbit: null, shareNotice: null,
          shared: { design: share.design, seed, variant: share.variant, response: share.response, tier: r.valid ? r.tier : null, notes },
        });
      },

      setShareNotice: (text) => set({ shareNotice: text }),
      dismissShared: () => set({ shared: null, shareNotice: null }),

      resume: (design, seed, variant = 'standard') =>
        set({
          demo: false, shared: null, screen: 'design', seed: normalizeSeed(seed), design,
          variant, mission: applyVariant(baseMission, variant),
          result: null, baseline: null, rewindFocus: null, diff: null, decisionChanges: [],
          blockedLaunches: 0, interventions: [], pauseOrbit: null,
        }),

      newMission: (seed) =>
        set({
          demo: false,
          shared: null,
          screen: 'brief',
          seed: normalizeSeed(seed ?? opts.newSeed()),
          design: { ...defaultDesign(), storageMb: get().mission.bus.defaultStorageMb },
          result: null, baseline: null, rewindFocus: null, diff: null, decisionChanges: [],
          blockedLaunches: 0, interventions: [], pauseOrbit: null,
        }),

      go: (screen) => set({ screen }),

      toggleInstrument: (id) => {
        const { design } = get();
        if (!get().mission.instruments.some((i) => i.id === id)) return false;
        if (design.instruments.includes(id)) {
          patchDesign({ instruments: design.instruments.filter((i) => i !== id) });
          return true;
        }
        if (design.instruments.length >= get().mission.rules.instrumentCount) return false;
        patchDesign({ instruments: [...design.instruments, id] });
        return true;
      },

      setVehicle: (id) => {
        if (get().mission.vehicles.some((v) => v.id === id)) patchDesign({ vehicle: id });
      },
      setBattery: (wh) => patchDesign({ batteryWh: clamp(Math.round(wh), RANGES.batteryWh.min, RANGES.batteryWh.max) }),
      setArray: (w) => patchDesign({ arrayW: clamp(Math.round(w), RANGES.arrayW.min, RANGES.arrayW.max) }),
      setPropellant: (kg) =>
        patchDesign({ propellantKg: clamp(Math.round(kg), RANGES.propellantKg.min, RANGES.propellantKg.max) }),

      setStorage: (mb) =>
        patchDesign({ storageMb: clamp(Math.round(mb), RANGES.storageMb.min, RANGES.storageMb.max) }),

      autoSizeFuel: () => {
        const { design } = get();
        patchDesign({ propellantKg: clamp(autoFuelKg(design, get().mission), RANGES.propellantKg.min, RANGES.propellantKg.max) });
        set({ autoSizes: get().autoSizes + 1 });
      },

      launch: () => {
        const { design, seed, baseline, interventions } = get();
        if (!validateDesign(design, get().mission).ok) {
          set({ blockedLaunches: get().blockedLaunches + 1 });
          return false;
        }
        if (baseline) {
          // Rewind: same seed, changed design and/or storm response. No animation; straight to the comparison.
          const result = simulate(design, get().mission, seed, interventions);
          set({
            result,
            diff: diffResults(baseline.result, result),
            decisionChanges: [
              ...diffDesigns(baseline.design, design, get().mission),
              ...diffInterventions(baseline.interventions, interventions, design, get().mission),
            ],
            screen: 'diff',
          });
        } else {
          // First flight: run with the default response so the launch animation knows whether it succeeds.
          // The real response is chosen in Mission Control, and everything before the storm is identical.
          const result = simulate(design, get().mission, seed, []);
          set({ result, interventions: [], pauseOrbit: findPauseOrbit(design, get().mission, seed), screen: 'launch' });
        }
        return true;
      },

      finishLaunch: () => {
        // Idempotent: a late animation callback (after Skip, or after Demo's skip-to-outcome) must not pull the player backwards.
        if (get().screen !== 'launch') return;
        const { pauseOrbit, result } = get();
        set({ screen: pauseOrbit !== null && result !== null && result.valid ? 'mission' : 'outcome' });
      },

      chooseResponse: (response) => {
        const { design, seed, pauseOrbit } = get();
        if (pauseOrbit === null) return;
        const interventions: Intervention[] = [{ orbit: pauseOrbit, response }];
        set({ interventions, result: simulate(design, get().mission, seed, interventions) });
      },

      finishMission: () => set({ screen: 'outcome' }),

      setResponse: (response) => {
        // The storm orbit depends only on the seed, so a response can be set even if the last flight never launched.
        const storm = get().baseline ? stormOrbit(get().seed, get().mission) : null;
        if (storm === null) return;
        set({ interventions: [{ orbit: storm, response }] });
      },

      beginRewind: (focus) => {
        const { design, result } = get();
        if (!result) return;
        const applied = cloneInterventions(result.interventions);
        set({
          baseline: { design: cloneDesign(design), result, interventions: applied },
          interventions: cloneInterventions(applied),
          rewindFocus: focus ?? null,
          diff: null, decisionChanges: [],
          screen: 'design',
        });
      },

      cancelRewind: () => {
        const { baseline } = get();
        if (!baseline) return;
        set({
          design: cloneDesign(baseline.design), result: baseline.result, baseline: null, rewindFocus: null,
          interventions: cloneInterventions(baseline.interventions), screen: 'outcome',
        });
      },

      continueRewind: () => {
        const { design, result, interventions } = get();
        if (!result) return;
        set({
          baseline: { design: cloneDesign(design), result, interventions: cloneInterventions(interventions) },
          rewindFocus: null, diff: null, decisionChanges: [],
          screen: 'design',
        });
      },
    };
  });
}
