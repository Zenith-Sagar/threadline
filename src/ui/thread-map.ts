// Pure helpers that decide WHICH Consequence Threads to draw.
//   changedControl(prev, next)  which design control the player just moved
//   movedMeters(prev, next)     which meters changed in a way the player can see, and which way
import type { Design } from '@/data/schemas/types';
import type { MeterView } from './meter-model';
import type { Meter } from './tokens';

export type ControlId =
  | { kind: 'instrument'; id: string }
  | { kind: 'vehicle' }
  | { kind: 'battery' }
  | { kind: 'array' }
  | { kind: 'storage' }
  | { kind: 'fuel' };

/** The first control that differs between two designs, or null if nothing changed. */
export function changedControl(prev: Design, next: Design): ControlId | null {
  for (const id of next.instruments) if (!prev.instruments.includes(id)) return { kind: 'instrument', id };
  for (const id of prev.instruments) if (!next.instruments.includes(id)) return { kind: 'instrument', id };
  if (prev.vehicle !== next.vehicle) return { kind: 'vehicle' };
  if (prev.batteryWh !== next.batteryWh) return { kind: 'battery' };
  if (prev.arrayW !== next.arrayW) return { kind: 'array' };
  if ((prev.storageMb ?? -1) !== (next.storageMb ?? -1)) return { kind: 'storage' };
  if (prev.propellantKg !== next.propellantKg) return { kind: 'fuel' };
  return null;
}

export interface MovedMeter {
  meter: Meter;
  /** Did the filled part of the bar grow or shrink? */
  direction: 'up' | 'down';
}

/** Meters whose visible state changed (status, bar level, or text), in display order. */
export function movedMeters(prev: MeterView[], next: MeterView[]): MovedMeter[] {
  const before = new Map(prev.map((m) => [m.id, m]));
  const out: MovedMeter[] = [];
  for (const m of next) {
    const p = before.get(m.id);
    if (!p || p.sig === m.sig) continue;
    out.push({ meter: m.id, direction: m.frac >= p.frac ? 'up' : 'down' });
  }
  return out;
}
