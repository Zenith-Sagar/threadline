// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { threadPath } from '@/ui/threads';

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

/** First "M x y" point of a path. */
const start = (d: string): { x: number; y: number } => {
  const m = /^M([\d.-]+) ([\d.-]+)/.exec(d);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};

describe('threadPath', () => {
  const src = rect(100, 200, 300, 180); // a card
  const meters = [0, 1, 2, 3, 4].map((i) => rect(420, 100 + i * 130, 400, 110)); // meters to its right

  it('fans several threads out along the source edge instead of stacking them on one point', () => {
    const ys = meters.map((m, i) => start(threadPath(src, m, i, meters.length).d).y);
    expect(new Set(ys).size).toBe(meters.length);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys); // top to bottom, in order
    for (const y of ys) {
      expect(y).toBeGreaterThan(src.top);
      expect(y).toBeLessThan(src.bottom);
    }
  });

  it('a single thread leaves from the middle of the source', () => {
    const y = start(threadPath(src, meters[0]!, 0, 1).d).y;
    expect(y).toBeCloseTo(src.top + src.height / 2, 5);
  });

  it('ends exactly at the meter and puts the badge just before it', () => {
    const g = threadPath(src, meters[2]!, 2, 5);
    expect(g.end.x).toBe(meters[2]!.left);
    expect(g.badge.x).toBeLessThan(g.end.x);
  });
});
