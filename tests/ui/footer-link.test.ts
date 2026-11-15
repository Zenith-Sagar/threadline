// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { createGameStore } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import { mountApp } from '@/ui/app';
import { destroyCards } from '@/ui/cards';

const fakeLaunch: MountLaunch = async (_c, _p, cb) => ({ skip: () => cb.onDone('skipped'), destroy: () => undefined });

describe('footer', () => {
  afterEach(() => { destroyCards(); document.body.innerHTML = ''; });
  it('links to the Attributions page with a relative URL (works under any deploy base path)', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const unmount = mountApp(document.getElementById('app') as HTMLElement, createGameStore({ mission: M, newSeed: () => 1 }), { mountLaunch: fakeLaunch });
    const a = document.querySelector('a[data-link="attributions"]') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('attributions.html');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(a.textContent).toMatch(/new tab/);
    unmount();
  });
});
