/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(() => ({
  // Tests swap the real API client for an in-memory test double (src/test/fakeApi.ts).
  plugins: [react()],
  resolve: {
    alias: {
      '@printagram/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
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
    alias: [{ find: /^@\/services$/, replacement: fileURLToPath(new URL('./src/test/services.ts', import.meta.url)) }],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}));
