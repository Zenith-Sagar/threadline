// The launch dice roll, shared by simulate() and findPauseOrbit(). Seed-only, so it never depends on the response.
import { createRng, deriveSeed } from '../rng';

export function launchRoll(seed: number): number {
  return createRng(deriveSeed(seed, 'launch'))();
}
