import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Production: no source maps (smaller, and nothing extra to publish).
  // Deploying under a sub-path (GitHub Pages project site)? Pass it on the command line: vite build --base=/<repo>/
  build: { target: 'es2022', sourcemap: false },
});
