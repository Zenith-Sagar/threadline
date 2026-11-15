// Shared data types. Pure types only: no runtime imports, no DOM.
// Every number in content is GAME MODEL unless its label says otherwise.

export type Label = 'NASA DATA' | 'GAME MODEL' | 'SIMPLIFIED PHYSICS' | 'APPROXIMATION';

/** Cause/effect channels used by Consequence Threads and the decision log. */
export type Channel = 'mass' | 'power' | 'comms' | 'risk' | 'cost' | 'data';

export interface Instrument {
  id: string;
  name: string;
  label: Label;
  massKg: number;
  powerW: number;
  costM: number;
  /** Game-scaled science potential per ops orbit. */
  science: number;
  dataMbPerOrbit: number;
  /** Suitability per objective id, 0..1 (used from Phase 4). */
  suitability: Record<string, number>;
  /** Plain-language "Why" shown in the Design Bay. */
  why: string;
}

export interface LaunchVehicle {
  id: string;
  name: string;
  label: Label;
  /** Max wet mass (kg) it can lift to the transfer tier. GAME-SCALED, not a real vehicle. */
  capacityKg: number;
  costM: number;
  /** Probability the launch succeeds, 0..1. GAME MODEL. */
  reliability: number;
  why: string;
}

export interface BusModel {
  structureKg: number;
  batteryKgPerWh: number;
  arrayKgPerW: number;
  baseLoadW: number;
  /** Fraction of battery capacity that may be used. */
  usableBatteryFrac: number;
  fixedCostM: number;
  batteryCostMPerWh: number;
  arrayCostMPerW: number;
  // Phase 3 (data channel). GAME MODEL.
  storageKgPerMb: number;
  storageCostMPerMb: number;
  /** Storage used when a design does not choose one. */
  defaultStorageMb: number;
  /** Data the link can send home each orbit. */
  downlinkMbPerOrbit: number;
}

export interface OrbitSpec {
  /** Earth-body distance in km, for display only (light delay). NASA DATA via snapshot. */
  earthDistanceKm?: number;
  /** Central body radius in km (NASA DATA via snapshot). */
  bodyRadiusKm: number;
  /** Central body GM in km^3/s^2 (NASA DATA via snapshot; limited precision). */
  bodyGmKm3S2: number;
  altitudeKm: number;
  /** 1 = worst-case (beta ~ 0) eclipse; lower values shorten eclipses. */
  eclipseSeverity: number;
}

export interface DeltaVBudget {
  transitMps: number;
  insertionMps: number;
  stationKeepingMps: number;
  /** Isp in seconds. UNVERIFIED placeholder. */
  ispS: number;
}

export interface MissionRules {
  instrumentCount: number;
  opsOrbits: number;
  budgetM: number;
}

/** The seeded mid-mission solar storm. Its timing depends only on the seed, never on the design. GAME MODEL. */
export interface StormSpec {
  earliestOrbit: number;
  latestOrbit: number;
  durationOrbits: number;
  /** Solar array output multiplier while the storm lasts (0..1). */
  arrayFactor: number;
  /** Chance, per powered instrument per storm orbit, of lasting radiation damage. */
  damageChance: number;
}

export interface MissionDef {
  id: string;
  name: string;
  rules: MissionRules;
  bus: BusModel;
  orbit: OrbitSpec;
  dv: DeltaVBudget;
  instruments: Instrument[];
  vehicles: LaunchVehicle[];
  /** Optional so that storm-free missions (regression tests) are still expressible. */
  storm?: StormSpec;
}

export interface Design {
  instruments: string[];
  vehicle: string;
  batteryWh: number;
  arrayW: number;
  /** Propellant mass in kg. Use sizePropellantKg() for a sensible default. */
  propellantKg: number;
  /** Onboard data storage in Mb. Optional: missing means mission.bus.defaultStorageMb. */
  storageMb?: number;
  // Later phases add: antenna class and redundancy level.
}

export interface ScenarioModifier {
  id: string;
  name: string;
  budgetMult?: number;
  massCapMult?: number;
  powerMult?: number;
  commsMult?: number;
  durationMult?: number;
  scoreWeights?: Record<string, number>;
  eventWeights?: Record<string, number>;
}

export type LogKind = 'design' | 'decision' | 'mini' | 'event' | 'state';

export interface LogEntry {
  id: number;
  /** Seconds since the start of ops (design entries use 0). */
  t: number;
  kind: LogKind;
  /** Stable machine key, e.g. "design.instrument.radar" or "event.safe.mode". */
  key: string;
  label: string;
  /** Ids of earlier entries this one follows from. */
  causes: number[];
  channels: Channel[];
  payload?: Record<string, number | string | boolean>;
}

export type Tier = 'Landmark' | 'Success' | 'Partial' | 'Recovered' | 'Lost with Lessons';

export interface ScoreEntry {
  /** 0..100 */
  value: number;
  why: string;
  causes: number[];
}

/** What a player can do when the storm hits. */
export type ResponseId = 'ride-out' | 'shed-heaviest' | 'safe-mode';

/** A decision made during the mission. `orbit` is the orbit the mission paused at. */
export interface Intervention {
  orbit: number;
  response: ResponseId;
}

export type FrameStatus = 'ok' | 'safe-mode' | 'storage-full';

export interface SimFrame {
  orbit: number;
  loadW: number;
  batteryStartWh: number;
  batteryAfterEclipseWh: number;
  brownout: boolean;
  // Phase 3
  status: FrameStatus;
  stormActive: boolean;
  /** Solar array output this orbit (reduced during the storm). */
  arrayW: number;
  storageStartMb: number;
  /** Storage after this orbit's data was added and the downlink sent. */
  storageEndMb: number;
  generatedMb: number;
  downlinkedMb: number;
  /** Instruments that were switched on this orbit. */
  activeIds: string[];
  /** Instruments radiation-damaged during this orbit. */
  damagedIds: string[];
}

export interface MissionMetrics {
  dryKg: number;
  wetKg: number;
  dvAvailableMps: number;
  dvRequiredMps: number;
  dvMarginFrac: number;
  totalCostM: number;
  loadW: number;
  periodMin: number;
  eclipseMin: number;
  sunlitMin: number;
  brownoutOrbits: number[];
  // Phase 3
  storageMb: number;
  downlinkMbPerOrbit: number;
  dataGeneratedMb: number;
  dataReturnedMb: number;
  dataPotentialMb: number;
  peakStorageMb: number;
  storagePauseOrbits: number[];
  damagedInstruments: string[];
  stormOrbit: number | null;
  response: ResponseId | null;
  /** Science % the mission would have had by riding the storm out (null when that is what happened). */
  rideOutSciencePct: number | null;
}

export interface MissionResult {
  seed: number;
  valid: boolean;
  /** Player-friendly reasons the design cannot launch (empty when valid). */
  reasons: string[];
  tier: Tier | null;
  scores: Record<string, ScoreEntry>;
  metrics: MissionMetrics | null;
  log: LogEntry[];
  trace: SimFrame[];
  // Phase 3
  /** The orbit the storm starts on (where the mission pauses), or null. */
  stormOrbit: number | null;
  /** The response that was applied (explicit or the default ride-out). */
  interventions: Intervention[];
}
