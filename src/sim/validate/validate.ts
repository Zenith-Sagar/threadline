// Design validation: turns problems into player-friendly "cannot launch because..." messages.
// Never throws. Structural problems are reported first so later math only sees safe inputs.
import type { Design, Instrument, LaunchVehicle, MissionDef, MissionMetrics } from '@/data/schemas/types';
import { LIMITS } from '../constants';
import { computeMetrics } from '../models/metrics';
import { storageMbOf } from '../models/data';

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
  fixes: string[];
  instruments: Instrument[];
  vehicle: LaunchVehicle | null;
  metrics: MissionMetrics | null;
}

const fail = (reasons: string[], fixes: string[]): ValidationResult => ({
  ok: false, reasons, fixes, instruments: [], vehicle: null, metrics: null,
});

const round = (n: number): number => Math.round(n);

export function validateDesign(design: Design, mission: MissionDef): ValidationResult {
  const reasons: string[] = [];
  const fixes: string[] = [];

  // --- Structural checks -------------------------------------------------------------------
  const wanted = mission.rules.instrumentCount;
  if (design.instruments.length !== wanted) {
    reasons.push(`Pick exactly ${wanted} instruments (you have ${design.instruments.length}).`);
    fixes.push(`Add or remove instruments until you have ${wanted}.`);
  }
  if (new Set(design.instruments).size !== design.instruments.length) {
    reasons.push('Each instrument can only be chosen once.');
    fixes.push('Remove the duplicate instrument.');
  }
  const instruments: Instrument[] = [];
  for (const id of design.instruments) {
    const found = mission.instruments.find((i) => i.id === id);
    if (found) instruments.push(found);
    else reasons.push(`Unknown instrument "${id}".`);
  }
  const vehicle = mission.vehicles.find((v) => v.id === design.vehicle) ?? null;
  if (!vehicle) reasons.push(`Unknown launch vehicle "${design.vehicle}".`);

  const numbers: [string, number, number, boolean][] = [
    ['Battery size', design.batteryWh, LIMITS.batteryWhMax, true],
    ['Solar array size', design.arrayW, LIMITS.arrayWMax, true],
    ['Propellant', design.propellantKg, LIMITS.propellantKgMax, false],
    ['Data storage', storageMbOf(design, mission), LIMITS.storageMbMax, true],
  ];
  for (const [name, value, max, mustBePositive] of numbers) {
    if (!Number.isFinite(value) || value < 0 || value > max || (mustBePositive && value === 0)) {
      reasons.push(`${name} must be a number between ${mustBePositive ? 'above 0' : '0'} and ${max}.`);
    }
  }
  if (reasons.length > 0 || !vehicle) return fail(reasons, fixes);

  // --- Engineering checks ------------------------------------------------------------------
  const metrics = computeMetrics(design, mission, instruments, vehicle);

  if (design.arrayW <= mission.bus.baseLoadW) {
    reasons.push(
      `The solar array (${round(design.arrayW)} W) can't even cover the spacecraft's baseline power (${round(mission.bus.baseLoadW)} W).`,
    );
    fixes.push('Choose a larger solar array.');
  }
  if (metrics.wetKg > vehicle.capacityKg) {
    reasons.push(
      `Your spacecraft weighs ${round(metrics.wetKg)} kg fully fueled, but the ${vehicle.name} lifts at most ${round(vehicle.capacityKg)} kg.`,
    );
    fixes.push('Drop a heavy instrument, carry less propellant, or pick a bigger launcher.');
  }
  if (metrics.dvAvailableMps < metrics.dvRequiredMps) {
    reasons.push(
      `Not enough fuel: you can change speed by ${round(metrics.dvAvailableMps)} m/s but the mission needs ${round(metrics.dvRequiredMps)} m/s.`,
    );
    fixes.push('Carry more propellant, or make the spacecraft lighter.');
  }
  if (metrics.totalCostM > mission.rules.budgetM) {
    reasons.push(
      `The design costs $${round(metrics.totalCostM)}M but the budget is $${round(mission.rules.budgetM)}M.`,
    );
    fixes.push('Choose cheaper instruments, a smaller launcher, or smaller power systems.');
  }

  if (reasons.length > 0) return { ok: false, reasons, fixes, instruments, vehicle, metrics };
  return { ok: true, reasons: [], fixes: [], instruments, vehicle, metrics };
}
