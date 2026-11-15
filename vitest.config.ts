import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Node environment on purpose: the simulation must never need a DOM.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
