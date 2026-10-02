/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Local dev: Vite on :5180 proxies /api to the admin Functions host on :7072 (start-local.ps1
 * -Admin). The Host header is kept, so the API's same-origin check sees localhost:5180.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:7072', changeOrigin: false } },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
