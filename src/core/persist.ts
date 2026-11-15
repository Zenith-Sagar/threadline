// Saves the last design and seed while the player is working on them (debounced), so "Continue" can restore them.
// Demo Mode never overwrites the player's own saved design.
import type { StoreApi } from 'zustand/vanilla';
import type { SaveStore } from '@/save/storage';
import type { GameState } from './store';

export const PERSIST_DEBOUNCE_MS = 400;

export function wirePersistence(store: StoreApi<GameState>, save: SaveStore): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = (): void => {
    timer = undefined;
    const s = store.getState();
    if (s.demo || (s.shared !== null && s.design === s.shared.design) || s.screen === 'title' || s.screen === 'brief' && s.design.instruments.length === 0) return;
    save.update((d) => {
      d.lastDesign = { ...s.design, instruments: s.design.instruments.slice() };
      d.lastSeed = s.seed;
      d.lastVariant = s.variant;
    });
  };
  let last = store.getState().design;
  let lastSeed = store.getState().seed;
  let lastVariant = store.getState().variant;
  const unsub = store.subscribe((s) => {
    if (s.design === last && s.seed === lastSeed && s.variant === lastVariant) return;
    last = s.design;
    lastSeed = s.seed;
    lastVariant = s.variant;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, PERSIST_DEBOUNCE_MS);
  });
  return () => {
    unsub();
    if (timer !== undefined) clearTimeout(timer);
  };
}
