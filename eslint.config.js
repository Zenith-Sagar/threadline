// ESLint flat config.
// KEY RULE: everything under src/sim (and src/data/schemas) must stay pure TypeScript:
//   - no DOM / browser globals
//   - no Phaser, no state store, no UI/scene/audio/network layers
//   - no non-determinism (Math.random, Date, performance)
// This is what makes the engine unit-testable and lets Rewind re-run a mission instantly.
// tsconfig.sim.json adds a second, type-level guard by compiling these folders without the DOM lib.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const FORBIDDEN_LAYERS = [
  'ui', 'scenes', 'minigames', 'audio', 'a11y', 'share',
  'save', 'nasa', 'core', 'narrative', 'content', 'snapshots',
];

const simImportRules = {
  patterns: [
    {
      group: ['phaser', 'phaser/*', 'zustand', 'zustand/*'],
      message: 'The simulation must not depend on Phaser or the state store.',
    },
    {
      // Matches both relative ("../../ui/x") and alias ("@/ui/x") imports.
      regex: `(^|/)(${FORBIDDEN_LAYERS.join('|')})(/|$)`,
      message:
        'src/sim may only import from src/sim and src/data/schemas. Pass content in as arguments instead.',
    },
  ],
};

const SIM_BANNED_GLOBALS = [
  'window', 'document', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'indexedDB',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'XMLHttpRequest', 'WebSocket',
  'AudioContext', 'Audio', 'Image', 'HTMLElement', 'Element',
  'Date', 'performance',
].map((name) => ({
  name,
  message: `"${name}" is not allowed in src/sim (keep the engine pure and deterministic).`,
}));

// Phase 2 boundaries:
//   src/scenes  Phaser lives here and talks to the DOM ONLY through src/scenes/launch-contract.ts.
//               It must not import the store, the UI, the simulation or content.
//   src/ui      may read the simulation (previews, cause chains) but never RUN it: only the store calls simulate().
const SCENE_FORBIDDEN = ['core', 'ui', 'sim', 'content', 'data', 'nasa', 'save', 'share'];

export default defineConfig(
  // Generated output is never linted: build folders, the offline package, audit logs and review artifacts.
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'release/**', 'audit-logs/**', 'audit-shots/**', 'review/**', 'submission/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/sim/**/*.ts', 'src/data/schemas/**/*.ts'],
    languageOptions: { globals: { ...globals.es2022 } },
    rules: {
      'no-restricted-imports': ['error', simImportRules],
      'no-restricted-globals': ['error', ...SIM_BANNED_GLOBALS],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG from src/sim/rng.ts.' },
      ],
    },
  },
  {
    files: ['src/scenes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `(^|/)(${SCENE_FORBIDDEN.join('|')})(/|$)`,
              message: 'src/scenes talks to the game only through launch-contract.ts (no store, UI or simulation imports).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/sim', importNames: ['simulate'], message: 'Only the store runs simulate(). The UI reads previews and results.' },
            { name: '@/sim/simulate', message: 'Only the store runs simulate(). The UI reads previews and results.' },
          ],
        },
      ],
    },
  },
);
