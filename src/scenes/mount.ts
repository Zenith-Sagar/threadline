// mountLaunch: the only entry point the DOM uses to start the launch animation.
// Phaser is loaded lazily (dynamic import), so it never weighs down the title or Design Bay.
// Any failure falls back to the DOM player, so a launch can never block the game.
import type { MountLaunch } from './launch-contract';
import { startDomLaunch } from './launch-dom';

export const mountLaunch: MountLaunch = async (container, plan, callbacks) => {
  if (!plan.reducedMotion) {
    try {
      const scene = await import('./launch-scene');
      return scene.startPhaserLaunch(container, plan, callbacks);
    } catch (err) {
      console.warn('Phaser launch unavailable, using the text version.', err);
      container.replaceChildren();
    }
  }
  return startDomLaunch(container, plan, callbacks);
};
