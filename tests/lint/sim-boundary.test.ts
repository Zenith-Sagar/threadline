// Proves the ESLint boundary rule actually fires. If someone weakens eslint.config.js,
// these tests fail.
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

const eslint = new ESLint();

async function rulesFired(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? 'parse-error');
}

const SIM = 'src/sim/example.ts';

describe('src/sim import and global boundary', () => {
  it.each([
    ['Phaser', "import Phaser from 'phaser';\nexport const p = Phaser;\n"],
    ['zustand', "import { createStore } from 'zustand/vanilla';\nexport const s = createStore;\n"],
    ['relative ui import', "import { x } from '../ui/thing';\nexport const y = x;\n"],
    ['nested relative scenes import', "import { x } from '../../scenes/Launch';\nexport const y = x;\n"],
    ['alias nasa import', "import { x } from '@/nasa/client';\nexport const y = x;\n"],
    ['content import', "import { x } from '@/content';\nexport const y = x;\n"],
  ])('blocks %s', async (_name, code) => {
    expect(await rulesFired(code, SIM)).toContain('no-restricted-imports');
  });

  it.each([
    ['window', 'export const w = window;\n'],
    ['document', 'export const t = document.title;\n'],
    ['localStorage', "export const v = localStorage.getItem('x');\n"],
    ['Date', 'export const now = Date.now();\n'],
    ['performance', 'export const p = performance.now();\n'],
  ])('blocks the global %s', async (_name, code) => {
    expect(await rulesFired(code, SIM)).toContain('no-restricted-globals');
  });

  it('blocks Math.random (use the seeded RNG)', async () => {
    expect(await rulesFired('export const r = Math.random();\n', SIM)).toContain('no-restricted-properties');
  });

  it('allows pure code that imports from sim and data/schemas', async () => {
    const code = [
      "import { createRng } from './rng';",
      "import type { Design } from '@/data/schemas/types';",
      'export const make = (d: Design): number => createRng(d.batteryWh)();',
      '',
    ].join('\n');
    expect(await rulesFired(code, SIM)).toEqual([]);
  });

  it('does not restrict the same globals outside src/sim (UI may use the DOM)', async () => {
    const fired = await rulesFired('export const t = document.title;\n', 'src/ui/example.ts');
    expect(fired).not.toContain('no-restricted-globals');
  });
});
