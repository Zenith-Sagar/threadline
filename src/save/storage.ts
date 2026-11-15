// Saved progress: last design, seed, best tier per seed, "seen tutorial", display preferences.
//
// Rules:
//   - Every storage call is wrapped in try/catch. Blocked, full or missing storage never breaks the game:
//     it silently falls back to memory for this visit and `persistent` turns false (the UI says so).
//   - One versioned key. Unknown or old versions, and corrupt JSON, are ignored (start fresh), never thrown.
//   - Stored data is untrusted: it is validated field by field before use.
import type { Design, Tier } from '@/data/schemas/types';
import { isDesign } from '@/data/schemas/guards';
import { tierRank } from '@/sim';

export const SAVE_KEY = 'threadline.save';
export const SAVE_VERSION = 1;

/** Key for "best tier": just the seed for the standard mission (as before), "seed:variant" for the others. */
export const bestKey = (seed: number, variant = 'standard'): string =>
  variant === 'standard' ? String(Math.trunc(seed)) : `${Math.trunc(seed)}:${variant}`;
const BEST_KEY_RE = /^\d{1,10}(:[a-z-]{1,20})?$/;
const MAX_SEEDS = 50;
const TIERS: Tier[] = ['Lost with Lessons', 'Partial', 'Recovered', 'Success', 'Landmark'];

export type TextSize = 'normal' | 'large' | 'larger';
export interface Prefs {
  contrast: boolean;
  textSize: TextSize;
}
export interface SaveData {
  v: typeof SAVE_VERSION;
  lastDesign: Design | null;
  lastSeed: number | null;
  /** Phase 5: the mission variant the last design was made for (null = standard). */
  lastVariant: string | null;
  bestTierBySeed: Record<string, Tier>;
  seenTutorial: boolean;
  prefs: Prefs;
}

export const emptySave = (): SaveData => ({
  v: SAVE_VERSION,
  lastDesign: null,
  lastSeed: null,
  lastVariant: null,
  bestTierBySeed: {},
  seenTutorial: false,
  prefs: { contrast: false, textSize: 'normal' },
});

const isTier = (x: unknown): x is Tier => typeof x === 'string' && (TIERS as string[]).includes(x);

/** Parse untrusted text into SaveData. Anything wrong with it yields a clean empty save. Never throws. */
export function parseSave(text: string | null): SaveData {
  if (!text || text.length > 20_000) return emptySave();
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return emptySave();
    const r = raw as Record<string, unknown>;
    if (r['v'] !== SAVE_VERSION) return emptySave();
    const out = emptySave();
    if (isDesign(r['lastDesign'])) out.lastDesign = r['lastDesign'];
    if (typeof r['lastSeed'] === 'number' && Number.isFinite(r['lastSeed'])) out.lastSeed = r['lastSeed'];
    if (typeof r['lastVariant'] === 'string' && /^[a-z-]{1,20}$/.test(r['lastVariant'])) out.lastVariant = r['lastVariant'];
    const best = r['bestTierBySeed'];
    if (typeof best === 'object' && best !== null && !Array.isArray(best)) {
      for (const [k, v] of Object.entries(best).slice(0, MAX_SEEDS)) if (BEST_KEY_RE.test(k) && isTier(v)) out.bestTierBySeed[k] = v;
    }
    out.seenTutorial = r['seenTutorial'] === true;
    const p = r['prefs'];
    if (typeof p === 'object' && p !== null) {
      const pr = p as Record<string, unknown>;
      out.prefs.contrast = pr['contrast'] === true;
      if (pr['textSize'] === 'large' || pr['textSize'] === 'larger') out.prefs.textSize = pr['textSize'];
    }
    return out;
  } catch {
    return emptySave();
  }
}

/** Keep the better of two tiers (Lost < Partial < Recovered < Success < Landmark). */
export function betterTier(a: Tier | undefined, b: Tier): Tier {
  return a === undefined || tierRank(b) > tierRank(a) ? b : a;
}

export interface SaveStore {
  read(): SaveData;
  update(fn: (d: SaveData) => void): void;
  /** Record a tier for a seed, keeping the best one. */
  recordTier(seed: number, tier: Tier, variant?: string): void;
  /** Forget everything (also clears the stored copy). */
  reset(): void;
  /** False when the browser blocked storage: progress lasts only for this visit. */
  readonly persistent: boolean;
}

type GetStorage = () => Storage | null;
const browserStorage: GetStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // accessing localStorage can itself throw when storage is blocked
  }
};

export function createSave(getStorage: GetStorage = browserStorage): SaveStore {
  let persistent = true;
  const storage = (): Storage | null => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };
  let data = emptySave();
  try {
    const st = storage();
    if (st === null) persistent = false;
    else data = parseSave(st.getItem(SAVE_KEY));
  } catch {
    persistent = false;
  }

  const write = (): void => {
    try {
      const st = storage();
      if (st === null) {
        persistent = false;
        return;
      }
      st.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      persistent = false; // blocked, or the quota is full: keep playing from memory
    }
  };

  return {
    read: () => data,
    update(fn) {
      fn(data);
      write();
    },
    recordTier(seed, tier, variant = 'standard') {
      const key = bestKey(seed, variant);
      this.update((d) => {
        d.bestTierBySeed[key] = betterTier(d.bestTierBySeed[key], tier);
        const keys = Object.keys(d.bestTierBySeed);
        if (keys.length > MAX_SEEDS) for (const k of keys.slice(0, keys.length - MAX_SEEDS)) delete d.bestTierBySeed[k];
      });
    },
    reset() {
      data = emptySave();
      try {
        storage()?.removeItem(SAVE_KEY);
      } catch {
        persistent = false;
      }
    },
    get persistent() {
      return persistent;
    },
  };
}
