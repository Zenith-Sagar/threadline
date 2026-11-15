// Circular-orbit helpers. Label: SIMPLIFIED PHYSICS (two-body, circular, no perturbations).
import { LIGHT_SPEED_KM_S } from '../constants';
import type { OrbitSpec } from '@/data/schemas/types';

/** Circular orbit speed in km/s: v = sqrt(GM / r). */
export function circularSpeedKmS(gmKm3S2: number, radiusKm: number): number {
  return Math.sqrt(gmKm3S2 / radiusKm);
}

/** Orbital period in minutes: T = 2*pi*r / v. */
export function orbitPeriodMin(orbit: OrbitSpec): number {
  const r = orbit.bodyRadiusKm + orbit.altitudeKm;
  const v = circularSpeedKmS(orbit.bodyGmKm3S2, r);
  return (2 * Math.PI * r) / v / 60;
}

/**
 * Maximum fraction of each orbit spent in the body's shadow (sun in the orbit plane):
 * asin(R / (R + h)) / pi. `eclipseSeverity` (0..1) scales it for sun-angle variety.
 */
export function eclipseFraction(orbit: OrbitSpec): number {
  const r = orbit.bodyRadiusKm + orbit.altitudeKm;
  const severity = Math.min(1, Math.max(0, orbit.eclipseSeverity));
  return (Math.asin(orbit.bodyRadiusKm / r) / Math.PI) * severity;
}

/** One-way light travel time in seconds over a distance in km. */
export function lightTimeS(distanceKm: number): number {
  return distanceKm / LIGHT_SPEED_KM_S;
}
