/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@printagram/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    // "real" mode talks to /api (served by the SWA CLI on :4280 or by Azure).
    __API_MODE__: JSON.stringify(mode === 'real' || mode === 'production' ? 'real' : 'mock'),
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Pre-bundle worker dependencies so a first-time optimisation never reloads the page mid-import.
  optimizeDeps: {
    include: [
      'pdf-lib',
      '@pdf-lib/fontkit',
      '@zip.js/zip.js',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
    ],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}));
