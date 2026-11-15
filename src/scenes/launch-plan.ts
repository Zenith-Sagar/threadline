// Pure launch timeline. No Phaser, no DOM, no store: it only turns a LaunchPlan into captions.
// Both players (the Phaser scene and the DOM fallback) read the same beats, so what you
// see, what a screen reader announces, and the timing always agree.
import type { LaunchPlan } from './launch-contract';

export const LAUNCH_MS = {
  success: 10_000,
  failure: 9_000,
  /** Reduced motion: a calmer, shorter sequence of still captions. */
  reduced: 8_500,
} as const;

export interface PlanInput {
  outcome: 'success' | 'failure';
  vehicleName: string;
  reducedMotion: boolean;
}

export function makeLaunchPlan(input: PlanInput): LaunchPlan {
  const durationMs = input.reducedMotion ? LAUNCH_MS.reduced : LAUNCH_MS[input.outcome];
  return { ...input, durationMs };
}

export interface Beat {
  /** Milliseconds from the start. */
  atMs: number;
  /** Plain-language caption. */
  caption: string;
}

/** Base timelines are written for 10 s (success) and 9 s (failure) and scaled to plan.durationMs. */
const SUCCESS: Beat[] = [
  { atMs: 0, caption: 'Countdown. All stations report ready.' },
  { atMs: 2000, caption: 'Ignition. The engines light.' },
  { atMs: 3000, caption: 'Liftoff.' },
  { atMs: 5000, caption: 'Climbing fast through the atmosphere.' },
  { atMs: 7000, caption: 'Engines cut off and the rocket stage separates.' },
  { atMs: 8500, caption: 'Your spacecraft is released and on its way to the Moon.' },
];

const FAILURE: Beat[] = [
  { atMs: 0, caption: 'Countdown. All stations report ready.' },
  { atMs: 2000, caption: 'Ignition. The engines light.' },
  { atMs: 3000, caption: 'Liftoff.' },
  { atMs: 5200, caption: 'Something is wrong. The rocket is losing thrust.' },
  { atMs: 6200, caption: 'The flight cannot continue.' },
  { atMs: 7600, caption: 'The spacecraft is lost. Mission control will now trace what went wrong.' },
];

export function launchBeats(plan: LaunchPlan): Beat[] {
  const base = plan.outcome === 'success' ? SUCCESS : FAILURE;
  const baseDuration = plan.outcome === 'success' ? LAUNCH_MS.success : LAUNCH_MS.failure;
  const scale = plan.durationMs / baseDuration;
  return base.map((b) => ({ atMs: Math.round(b.atMs * scale), caption: b.caption }));
}

/** Index of the beat that is current at time t (clamped to the last beat). */
export function beatIndexAt(beats: Beat[], tMs: number): number {
  let idx = 0;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (b && tMs >= b.atMs) idx = i;
  }
  return idx;
}
