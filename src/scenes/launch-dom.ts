// DOM fallback launch player: used when reduced motion is on, or if Phaser cannot load or start.
// A calm sequence of captions with a progress bar. No motion, no canvas, same timing and contract.
import type { LaunchCallbacks, LaunchHandle, LaunchPlan } from './launch-contract';
import { beatIndexAt, launchBeats } from './launch-plan';

export function startDomLaunch(
  container: HTMLElement,
  plan: LaunchPlan,
  cb: LaunchCallbacks,
): LaunchHandle {
  const beats = launchBeats(plan);
  const list = document.createElement('ol');
  list.className = 'launch-beats';
  const items = beats.map((b) => {
    const li = document.createElement('li');
    li.textContent = b.caption;
    list.append(li);
    return li;
  });
  const progress = document.createElement('progress');
  progress.className = 'launch-progress';
  progress.max = plan.durationMs;
  progress.value = 0;
  progress.setAttribute('aria-label', 'Launch progress');
  container.append(list, progress);

  let done = false;
  let lastIdx = -1;
  let elapsed = 0;
  const STEP = 100;

  const finish = (how: 'finished' | 'skipped'): void => {
    if (done) return;
    done = true;
    clearInterval(timer);
    cb.onDone(how);
  };

  const tick = (): void => {
    elapsed += STEP;
    progress.value = Math.min(plan.durationMs, elapsed);
    const idx = beatIndexAt(beats, elapsed);
    if (idx !== lastIdx) {
      lastIdx = idx;
      items.forEach((li, i) => {
        li.classList.toggle('is-current', i === idx);
        li.classList.toggle('is-past', i < idx);
      });
      const caption = beats[idx]?.caption;
      if (caption) cb.onPhase(caption);
    }
    if (elapsed >= plan.durationMs) finish('finished');
  };

  const timer = setInterval(tick, STEP);
  tick();

  return {
    skip: () => finish('skipped'),
    destroy: () => {
      done = true;
      clearInterval(timer);
      list.remove();
      progress.remove();
    },
  };
}
