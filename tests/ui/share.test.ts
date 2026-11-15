// @vitest-environment happy-dom
// Share links in the DOM (Phase 5, slice C): the outcome buttons, the manual-copy fallback, and the
// "Try to beat this" banner. The encode/decode rules themselves are in tests/share/code.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { buildDemoDesign, DEMO_SEED } from '@/core/demo';
import { createGameStore } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { decodeShare, encodeShare } from '@/share/code';
import { mountApp } from '@/ui/app';
import { destroyCards } from '@/ui/cards';

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));
const fakeLaunch: MountLaunch = async (_c, _p, cb) => {
  setTimeout(() => cb.onDone('finished'), 0);
  return { skip: () => cb.onDone('skipped'), destroy: () => undefined };
};
const action = (name: string): HTMLButtonElement => {
  const el = document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`);
  if (!el) throw new Error(`no [data-action=${name}]`);
  return el;
};
const setClipboard = (writeText: (t: string) => Promise<void>): void => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
};

let cleanup: (() => void) | undefined;
let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app') as HTMLElement;
  document.execCommand = () => false; // the old copy route fails unless a test says otherwise
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  destroyCards();
  vi.restoreAllMocks();
});

/** An outcome screen from a finished, non-demo mission (the demo design and seed, answered with the demo response). */
async function outcome() {
  const store = createGameStore({ mission: M, newSeed: () => DEMO_SEED });
  store.getState().resume(buildDemoDesign(M), DEMO_SEED);
  cleanup = mountApp(root, store, { mountLaunch: fakeLaunch });
  store.getState().launch();
  store.getState().finishLaunch();
  const pause = store.getState().pauseOrbit;
  expect(pause).not.toBeNull();
  store.getState().chooseResponse('shed-heaviest');
  store.getState().finishMission();
  await tick();
  expect(document.querySelector('h1')?.textContent).toMatch(/Recovered/);
  return store;
}

describe('share panel on the outcome screen', () => {
  it('"Copy link" copies a link that opens this exact mission', async () => {
    const written: string[] = [];
    setClipboard(async (t) => { written.push(t); });
    await outcome();
    action('copy-link').click();
    await tick();
    expect(written).toHaveLength(1);
    const hash = written[0]?.split('#')[1] ?? '';
    expect(hash).toContain(`seed=${DEMO_SEED}`);
    expect(hash).toContain('mission=standard');
    expect(hash).toContain('resp=shed-heaviest');
    const back = decodeShare(hash, M);
    expect(back.ok && back.share.design).toEqual(buildDemoDesign(M));
    expect(document.querySelector('.share-panel [role=status]')?.textContent).toBe('Link copied.');
  });

  it('"Copy summary" copies plain text: tier, four scores, the top cause, a link', async () => {
    const written: string[] = [];
    setClipboard(async (t) => { written.push(t); });
    await outcome();
    action('copy-summary').click();
    await tick();
    const text = written[0] ?? '';
    expect(text).toMatch(/^Threadline: Recovered \(Standard mission, seed 29\)/);
    for (const label of ['Science yield', 'Data return', 'Spacecraft health', 'Budget margin']) expect(text).toContain(label);
    expect(text).toContain('Why: ');
    expect(text).toMatch(/Try to beat it: .*#v=1&seed=29/);
  });

  it('when the browser refuses to copy, the text is shown, selected, for manual copying', async () => {
    setClipboard(async () => { throw new DOMException('denied', 'NotAllowedError'); });
    await outcome();
    action('copy-link').click();
    await tick(20);
    const box = document.querySelector<HTMLTextAreaElement>('.share-text');
    expect(box?.closest('.share-fallback')?.hasAttribute('hidden')).toBe(false);
    expect(box?.value).toContain('#v=1&seed=29');
    expect(box?.hasAttribute('readonly')).toBe(true); // selectable, not editable
    expect(document.querySelector('.share-panel [role=status]')?.textContent).toMatch(/isn.t available/);
  });
});

describe('"Try to beat this" banner and bad links', () => {
  it('a valid link lands on the Design Bay with the shared design loaded and the tier computed locally', async () => {
    const store = createGameStore({ mission: M, newSeed: () => 1 });
    cleanup = mountApp(root, store, { mountLaunch: fakeLaunch });
    const r = decodeShare(`#${encodeShare({ variant: 'standard', seed: DEMO_SEED, design: buildDemoDesign(M), response: 'shed-heaviest' })}`, M);
    if (!r.ok) throw new Error(r.reason);
    store.getState().loadShared(r.share, r.adjusted);
    await tick();
    expect(document.querySelector('h1')?.textContent).toBe('Design Bay');
    const banner = document.querySelector('.share-banner');
    expect(banner?.hasAttribute('hidden')).toBe(false);
    expect(banner?.textContent).toContain('Try to beat this: Recovered');
    expect(banner?.textContent).toContain('Switch off'); // their storm answer is described, not imposed
    expect(document.querySelectorAll('input[type=checkbox]:checked')).toHaveLength(3);
    action('banner-dismiss').click();
    await tick();
    expect(document.querySelector('.share-banner')?.hasAttribute('hidden')).toBe(true);
  });

  it('a link that cannot be opened shows a plain message and the game still starts normally', async () => {
    const store = createGameStore({ mission: M, newSeed: () => 1 });
    cleanup = mountApp(root, store, { mountLaunch: fakeLaunch });
    const bad = decodeShare('#v=9&seed=1', M);
    expect(bad.ok).toBe(false);
    store.getState().setShareNotice(`That link could not be opened: ${bad.ok ? '' : bad.reason} Starting a normal game instead.`);
    await tick();
    const banner = document.querySelector('.share-banner');
    expect(banner?.textContent).toMatch(/could not be opened.*different version/);
    expect(document.querySelector('h1')?.textContent).toBe('Threadline'); // nothing was blocked
    action('banner-dismiss').click();
    await tick();
    expect(document.querySelector('.share-banner')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('share links with storage blocked', () => {
  it('copying a link needs no storage, so it works when the browser blocks it', async () => {
    const { createSave } = await import('@/save/storage');
    const blocked = createSave(() => { throw new DOMException('blocked', 'SecurityError'); });
    expect(blocked.persistent).toBe(false);
    const written: string[] = [];
    setClipboard(async (t) => { written.push(t); });
    const store = createGameStore({ mission: M, newSeed: () => DEMO_SEED });
    store.getState().resume(buildDemoDesign(M), DEMO_SEED);
    cleanup = mountApp(root, store, { mountLaunch: fakeLaunch, save: blocked });
    store.getState().launch();
    store.getState().finishLaunch();
    store.getState().chooseResponse('shed-heaviest');
    store.getState().finishMission();
    await tick();
    action('copy-link').click();
    await tick();
    expect(written[0]).toContain('#v=1&seed=29');
  });
});
