// The tier sentences in docs/tiers.md must match the code word for word.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Tier } from '@/data/schemas/types';
import { TIER_DEFINITIONS } from '@/sim';

const doc = readFileSync('docs/tiers.md', 'utf8');

describe('docs/tiers.md', () => {
  for (const tier of Object.keys(TIER_DEFINITIONS) as Tier[]) {
    it(`defines ${tier} with the same sentence as the code`, () => {
      expect(doc).toContain(`| ${tier} | ${TIER_DEFINITIONS[tier]} |`);
    });
  }
  it('lists the rank order used by Rewind comparisons', () => {
    expect(doc).toContain('Lost with Lessons < Partial < Recovered < Success < Landmark');
  });
});
