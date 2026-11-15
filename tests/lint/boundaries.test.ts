// Proves the Phase 2 import boundaries fire:
//   src/scenes  may not import the store, UI, simulation or content (only the launch contract).
//   src/ui      may read the simulation but must never import simulate().
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

const eslint = new ESLint();
async function rulesFired(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? 'parse-error');
}

describe('src/scenes boundary (Phaser talks to the DOM only through the contract)', () => {
  const SCENE = 'src/scenes/example.ts';
  it.each([
    ['store', "import { createGameStore } from '@/core/store';\nexport const s = createGameStore;\n"],
    ['relative core', "import { x } from '../core/store';\nexport const y = x;\n"],
    ['ui', "import { h } from '../ui/dom';\nexport const y = h;\n"],
    ['simulation', "import { simulate } from '@/sim';\nexport const y = simulate;\n"],
    ['content', "import { LUNAR_RECON } from '@/content';\nexport const y = LUNAR_RECON;\n"],
  ])('blocks importing %s', async (_n, code) => {
    expect(await rulesFired(code, SCENE)).toContain('no-restricted-imports');
  });

  it('allows the contract, sibling scene files and Phaser', async () => {
    const code = [
      "import Phaser from 'phaser';",
      "import type { LaunchPlan } from './launch-contract';",
      "import { launchBeats } from './launch-plan';",
      'export const f = (p: LaunchPlan) => [Phaser, launchBeats(p)];',
      '',
    ].join('\n');
    expect(await rulesFired(code, SCENE)).toEqual([]);
  });
});

describe('src/ui never runs the simulation', () => {
  const UI = 'src/ui/example.ts';
  it('blocks importing simulate', async () => {
    const fired = await rulesFired("import { simulate } from '@/sim';\nexport const s = simulate;\n", UI);
    expect(fired).toContain('no-restricted-imports');
  });
  it('allows read-only helpers', async () => {
    const fired = await rulesFired("import { previewMission } from '@/sim';\nexport const p = previewMission;\n", UI);
    expect(fired).toEqual([]);
  });
});
