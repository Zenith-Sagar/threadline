// DOM <-> Phaser contract for the launch scene. TYPES ONLY: this file imports nothing,
// so the DOM side can depend on it without pulling Phaser into the main bundle.
//
//   DOM  -> Phaser : a LaunchPlan (plain data) at mount time, and LaunchHandle.skip()/destroy()
//   Phaser -> DOM  : LaunchCallbacks.onPhase(caption) for live captions, onDone(how) when finished
//
// Phaser never reads or writes the game store, and the DOM never touches Phaser objects.
// The scene is created only on the launch screen and destroyed when the screen unmounts.

export interface LaunchPlan {
  /** What happens to the rocket. Decided by the simulation, not by the scene. */
  outcome: 'success' | 'failure';
  vehicleName: string;
  /** Total animation time. 8-12 s normally; shorter when reduced motion is on. */
  durationMs: number;
  /** When true: no shake, no particles, no flicker, and a shorter, calmer sequence. */
  reducedMotion: boolean;
}

export interface LaunchCallbacks {
  /** A short plain-language caption for the current moment (the DOM shows it in a live region). */
  onPhase(caption: string): void;
  /** Called exactly once. */
  onDone(how: 'finished' | 'skipped'): void;
}

export interface LaunchHandle {
  skip(): void;
  destroy(): void;
}

export type MountLaunch = (
  container: HTMLElement,
  plan: LaunchPlan,
  callbacks: LaunchCallbacks,
) => Promise<LaunchHandle>;
