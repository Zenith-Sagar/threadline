// Launch screen. DOM owns the screen; the animation runs behind the contract in
// src/scenes/launch-contract.ts (plan in, captions and completion out).
import type { LaunchHandle } from '@/scenes/launch-contract';
import { makeLaunchPlan } from '@/scenes/launch-plan';
import { h } from '../dom';
import { icon } from '../icons';
import type { Ctx, Screen } from './types';

export function createLaunchScreen(ctx: Ctx): Screen {
  const s = ctx.store.getState();
  const failed = s.result?.log.some((e) => e.key === 'event.launch.failure') ?? false;
  const vehicle = s.mission.vehicles.find((v) => v.id === s.design.vehicle);
  const plan = makeLaunchPlan({
    outcome: failed ? 'failure' : 'success',
    vehicleName: vehicle?.name ?? 'Launcher',
    reducedMotion: ctx.reducedMotion(),
  });

  const heading = h('h1', { tabindex: -1 }, `Launch: ${plan.vehicleName}`);
  const stage = h('div', { class: 'launch-stage' });
  const caption = h('p', { class: 'launch-caption' }, 'Preparing the launch...');
  const skipBtn = h('button', { type: 'button', class: 'btn' }, icon('arrow', 16), 'Skip launch (Space or Enter)');
  const el = h(
    'section',
    { class: 'screen screen--launch' },
    heading,
    stage,
    h('p', { class: 'launch-caption', role: 'status' }, caption),
    h('div', { class: 'btn-row' }, skipBtn),
  );

  let handle: LaunchHandle | null = null;
  let destroyed = false;
  let finished = false;

  const finish = (): void => {
    if (finished || destroyed) return;
    finished = true;
    ctx.store.getState().finishLaunch();
  };
  const skip = (): void => {
    if (handle) handle.skip();
    else finish(); // Phaser is still loading: leave now and tidy up when it arrives
  };

  ctx.mountLaunch(stage, plan, {
    onPhase: (text) => {
      caption.textContent = text;
    },
    onDone: () => finish(),
  })
    .then((hd) => {
      if (destroyed) hd.destroy();
      else handle = hd;
    })
    .catch(() => {
      caption.textContent = 'The launch animation could not start, so we are skipping ahead.';
      finish();
    });

  skipBtn.addEventListener('click', skip);
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const t = e.target;
    if (t === document.body || t === heading || t === skipBtn) {
      e.preventDefault();
      skip();
    }
  };
  document.addEventListener('keydown', onKey);

  return {
    el, heading,
    destroy: () => {
      destroyed = true;
      document.removeEventListener('keydown', onKey);
      handle?.destroy();
      handle = null;
    },
  };
}
