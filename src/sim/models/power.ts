// Orbit-by-orbit power balance. Label: SIMPLIFIED PHYSICS / GAME MODEL.
// Departures from reality: fixed eclipse length, constant solar flux, 100% charge efficiency,
// no battery aging, no thermal coupling.

export interface PowerParams {
  loadW: number;
  /** Load in safe mode (instruments off). */
  baseLoadW: number;
  arrayW: number;
  usableWh: number;
  eclipseH: number;
  sunlitH: number;
}

export interface PowerStep {
  afterEclipseWh: number;
  endWh: number;
  brownout: boolean;
}

/**
 * Advance one orbit: eclipse first (battery only), then sunlight (array minus load).
 * A brownout puts the spacecraft in safe mode for the rest of that orbit (instruments off).
 */
export function stepOrbit(startWh: number, p: PowerParams): PowerStep {
  let e = startWh - p.loadW * p.eclipseH;
  let brownout = false;
  if (e < 0) {
    brownout = true;
    e = 0;
  }
  const sunLoadW = brownout ? p.baseLoadW : p.loadW;
  const rawEnd = e + (p.arrayW - sunLoadW) * p.sunlitH;
  if (rawEnd < 0) brownout = true;
  const endWh = Math.min(p.usableWh, Math.max(0, rawEnd));
  return { afterEclipseWh: e, endWh, brownout };
}
