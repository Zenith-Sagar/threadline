import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import { sanitizeDesign } from '@/core/restore';
import { SAVE_KEY, SAVE_VERSION, betterTier, createSave, emptySave, parseSave } from '@/save/storage';

class MemStorage implements Storage {
  data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  key(i: number): string | null { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string): void { this.data.delete(k); }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}
class BlockedStorage extends MemStorage {
  override getItem(): string | null { throw new DOMException('blocked', 'SecurityError'); }
  override setItem(): void { throw new DOMException('quota', 'QuotaExceededError'); }
  override removeItem(): void { throw new DOMException('blocked', 'SecurityError'); }
}
const design = { instruments: ['imager'], vehicle: 'light', batteryWh: 150, arrayW: 200, propellantKg: 80, storageMb: 120 };

describe('save: round trip', () => {
  it('saves and restores design, seed, best tier per seed and the tutorial flag', () => {
    const mem = new MemStorage();
    const a = createSave(() => mem);
    a.update((d) => { d.lastDesign = design; d.lastSeed = 42; d.seenTutorial = true; d.prefs.contrast = true; d.prefs.textSize = 'large'; });
    a.recordTier(42, 'Partial');
    const b = createSave(() => mem); // a fresh visit
    expect(b.read().lastDesign).toEqual(design);
    expect(b.read().lastSeed).toBe(42);
    expect(b.read().seenTutorial).toBe(true);
    expect(b.read().bestTierBySeed['42']).toBe('Partial');
    expect(b.read().prefs).toEqual({ contrast: true, textSize: 'large' });
    expect(b.persistent).toBe(true);
    expect(JSON.parse(mem.getItem(SAVE_KEY) ?? '{}').v).toBe(SAVE_VERSION);
  });

  it('keeps only the BEST tier per seed', () => {
    const s = createSave(() => new MemStorage());
    s.recordTier(7, 'Success');
    s.recordTier(7, 'Partial');
    expect(s.read().bestTierBySeed['7']).toBe('Success');
    s.recordTier(7, 'Landmark');
    expect(s.read().bestTierBySeed['7']).toBe('Landmark');
    expect(betterTier('Recovered', 'Partial')).toBe('Recovered');
    expect(betterTier(undefined, 'Lost with Lessons')).toBe('Lost with Lessons');
  });

  it('"Reset progress" clears memory and the stored copy', () => {
    const mem = new MemStorage();
    const s = createSave(() => mem);
    s.update((d) => { d.seenTutorial = true; });
    s.recordTier(1, 'Success');
    s.reset();
    expect(s.read()).toEqual(emptySave());
    expect(mem.getItem(SAVE_KEY)).toBeNull();
  });

  it('prunes to 50 seeds so the save cannot grow without bound', () => {
    const s = createSave(() => new MemStorage());
    for (let i = 0; i < 80; i++) s.recordTier(i, 'Partial');
    expect(Object.keys(s.read().bestTierBySeed).length).toBeLessThanOrEqual(50);
  });
});

describe('save: storage blocked, full or missing', () => {
  it('works from memory when every storage call throws (blocked cookies / private mode)', () => {
    const s = createSave(() => new BlockedStorage());
    expect(s.persistent).toBe(false);
    s.update((d) => { d.seenTutorial = true; });
    s.recordTier(3, 'Success');
    expect(s.read().seenTutorial).toBe(true);
    expect(s.read().bestTierBySeed['3']).toBe('Success');
    expect(() => s.reset()).not.toThrow();
  });

  it('works when localStorage itself is unavailable (getStorage returns null or throws)', () => {
    const none = createSave(() => null);
    expect(none.persistent).toBe(false);
    none.update((d) => { d.lastSeed = 5; });
    expect(none.read().lastSeed).toBe(5);
    const throws = createSave(() => { throw new Error('SecurityError'); });
    expect(throws.persistent).toBe(false);
    expect(throws.read()).toEqual(emptySave());
  });

  it('a full disk after a good start flips persistent to false but keeps the data in memory', () => {
    const mem = new MemStorage();
    const s = createSave(() => mem);
    expect(s.persistent).toBe(true);
    mem.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
    s.update((d) => { d.lastSeed = 9; });
    expect(s.persistent).toBe(false);
    expect(s.read().lastSeed).toBe(9);
  });
});

describe('save: untrusted data', () => {
  it('ignores corrupt JSON, wrong versions, oversize text and nonsense fields', () => {
    expect(parseSave('{not json')).toEqual(emptySave());
    expect(parseSave(null)).toEqual(emptySave());
    expect(parseSave(JSON.stringify({ v: 999, seenTutorial: true }))).toEqual(emptySave());
    expect(parseSave('x'.repeat(30_000))).toEqual(emptySave());
    const odd = parseSave(JSON.stringify({
      v: SAVE_VERSION, lastDesign: { instruments: 'no' }, lastSeed: 'x',
      bestTierBySeed: { '1': 'Legendary', '2': 'Success' }, seenTutorial: 'yes',
      prefs: { contrast: 1, textSize: 'huge' },
    }));
    expect(odd.lastDesign).toBeNull();
    expect(odd.lastSeed).toBeNull();
    expect(odd.bestTierBySeed).toEqual({ '2': 'Success' });
    expect(odd.seenTutorial).toBe(false);
    expect(odd.prefs).toEqual({ contrast: false, textSize: 'normal' });
  });

  it('sanitises a saved design: unknown instruments dropped, numbers clamped, count capped', () => {
    const d = sanitizeDesign(
      { instruments: ['radar', 'ghost', 'radar', 'imager', 'spectro', 'thermal'], vehicle: 'nope', batteryWh: 1e9, arrayW: -5, propellantKg: NaN, storageMb: 99999 },
      M,
    );
    expect(d.instruments).toEqual(['radar', 'imager', 'spectro']);
    expect(M.vehicles.some((v) => v.id === d.vehicle)).toBe(true);
    expect(d.batteryWh).toBe(400);
    expect(d.arrayW).toBe(100);
    expect(d.propellantKg).toBe(0);
    expect(d.storageMb).toBe(300);
  });
});
