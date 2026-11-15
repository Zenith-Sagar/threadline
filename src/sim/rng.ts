// Seeded, reproducible random numbers. Never use Math.random in src/sim (ESLint enforces this).

/** 32-bit FNV-1a string hash. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Derive an independent seed for a named stream so adding one stream never reshuffles another. */
export function deriveSeed(seed: number, stream: string): number {
  return (hashString(stream) ^ Math.imul(seed >>> 0, 0x9e3779b1)) >>> 0;
}

/** mulberry32: small, fast, good enough for gameplay. Returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalize any number into a valid uint32 seed (non-finite values become 0). */
export function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
}
