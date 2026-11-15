// Demo Mode: a scripted PATH, real RESULTS.
//
// The demo does not fake anything. It pre-sets a seed and a design, then every number on screen comes from
// simulate() exactly as in normal play. The seed and design were chosen so that the storm hits, the player
// has a real choice, and "Switch off the biggest power user" turns a Partial mission into Recovered.
// tests/core/demo.test.ts fails if a content retune ever stops this from being true.
import type { Design, MissionDef, ResponseId } from '@/data/schemas/types';
import { autoFuelKg } from './fuel';

export const DEMO_SEED = 29;
export const DEMO_INSTRUMENTS = ['imager', 'spectro', 'thermal'];
export const DEMO_VEHICLE = 'medium';
export const DEMO_BATTERY_WH = 150;
export const DEMO_ARRAY_W = 320;
/** The response the narration points at. Riding it out on the same seed ends Partial. */
export const DEMO_RESPONSE: ResponseId = 'shed-heaviest';

export function buildDemoDesign(mission: MissionDef): Design {
  const base: Design = {
    instruments: DEMO_INSTRUMENTS.slice(),
    vehicle: DEMO_VEHICLE,
    batteryWh: DEMO_BATTERY_WH,
    arrayW: DEMO_ARRAY_W,
    propellantKg: 0,
    storageMb: mission.bus.defaultStorageMb,
  };
  return { ...base, propellantKg: autoFuelKg(base, mission) };
}

/** One sentence of narration per screen (the 90-second judge path). */
export const DEMO_LINES: Record<string, string> = {
  title: 'Demo: a ready-made mission. Press Start the demo.',
  brief: 'This is the goal: map the Moon from orbit. Skip ahead to the design.',
  design: 'The spacecraft is already built. A storm is coming, and this design cannot ride it out. Press Launch.',
  launch: 'Launch is a short animation. Skip it whenever you like.',
  mission: 'A solar storm is on its way. The demo uses "Switch off the biggest power user", but every choice is real.',
  outcome: 'Recovered: your response saved the mission. Read the cause chains, then try Change one decision.',
  diff: 'Same seed, so the luck is identical. Only your decision changed. That is Rewind.',
};
