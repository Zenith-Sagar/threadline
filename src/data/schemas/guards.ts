// Hand-written runtime guards. Used for anything that crosses a trust boundary
// (mission codes, URL hashes, saved games). Never trust parsed JSON: validate it.
import type { Design } from './types';

export function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function isDesign(x: unknown): x is Design {
  if (!isRecord(x)) return false;
  const { instruments, vehicle, batteryWh, arrayW, propellantKg, storageMb } = x;
  return (
    Array.isArray(instruments) &&
    instruments.length <= 12 &&
    instruments.every((i) => typeof i === 'string' && i.length > 0 && i.length <= 40) &&
    typeof vehicle === 'string' &&
    vehicle.length > 0 &&
    vehicle.length <= 40 &&
    isFiniteNumber(batteryWh) &&
    isFiniteNumber(arrayW) &&
    isFiniteNumber(propellantKg) &&
    (storageMb === undefined || isFiniteNumber(storageMb))
  );
}

/** Parse untrusted JSON text into a Design, or return null. Never throws. */
export function parseDesign(text: string): Design | null {
  if (text.length > 2048) return null;
  try {
    const data: unknown = JSON.parse(text);
    return isDesign(data) ? data : null;
  } catch {
    return null;
  }
}
