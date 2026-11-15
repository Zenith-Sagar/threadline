import type { StoreApi } from 'zustand/vanilla';
import type { GameState } from '@/core/store';
import type { MountLaunch } from '@/scenes/launch-contract';
import type { SaveStore } from '@/save/storage';
import type { CardId } from '../science-cards';

/** Everything a screen needs from the app shell. Screens never import each other. */
export interface Ctx {
  store: StoreApi<GameState>;
  /** Speak a short message to screen-reader users (polite live region). */
  announce(message: string): void;
  reducedMotion(): boolean;
  mountLaunch: MountLaunch;
  /** Phase 4: saved progress (in-memory when the browser blocks storage). */
  save: SaveStore;
  /** Phase 4: open a Science Card. */
  openCard(id: CardId, from?: HTMLElement | null): void;
}

export interface Screen {
  el: HTMLElement;
  /** Receives focus when the screen appears (so keyboard and screen-reader users start at the top). */
  heading: HTMLElement;
  destroy?(): void;
}
