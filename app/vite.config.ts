/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE_URL, robotsTxt, sitemapXml } from './src/seo/routes';

/**
 * Search/social metadata that needs the public origin (VITE_SITE_URL, default https://inbunden.com):
 * absolute og:image in index.html, and robots.txt / sitemap.xml from the page table in
 * src/seo/routes.ts. Per-page titles, canonicals, hreflang and JSON-LD are set by useSeo() and
 * baked into static HTML by scripts/prerender.ts.
 */
function seo(siteUrl: string): Plugin {
  const site = (siteUrl || DEFAULT_SITE_URL).replace(/\/$/, '');
  return {
    name: 'printagram-seo',
    transformIndexHtml(html) {
      return html.replaceAll('%OG_IMAGE%', `${site}/og-image.jpg`);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(site) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(site) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Tests swap the real API client for an in-memory test double (src/test/fakeApi.ts).
  plugins: [react(), seo(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '')],
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
    alias: [
      {
        find: /^@\/services$/,
        replacement: fileURLToPath(new URL('./src/test/services.ts', import.meta.url)),
      },
    ],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}));
