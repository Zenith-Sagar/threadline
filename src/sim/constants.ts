// Physical constants and hard limits for the simulation.

/** Standard gravity in m/s^2 (defined value). Cite on the Delta-v Science Card in Phase 4. UNVERIFIED in this session. */
export const G0_MS2 = 9.80665;

/** Speed of light in km/s (defined value). Cite on the comms Science Card. UNVERIFIED in this session. */
export const LIGHT_SPEED_KM_S = 299792.458;

/** Hard cap on ops orbits so a bad mission definition can never loop forever. */
export const MAX_OPS_ORBITS = 1000;

/** Guardrail limits for player-editable numbers. */
export const LIMITS = {
  batteryWhMax: 2000,
  arrayWMax: 2000,
  propellantKgMax: 2000,
  storageMbMax: 2000,
} as const;
