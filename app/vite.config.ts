/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Search/social metadata that needs the public origin (VITE_SITE_URL, e.g. https://inbunden.app):
 * canonical + og:url + absolute og:image in index.html, and robots.txt / sitemap.xml in the build.
 * Without it the build still works: relative og:image, robots.txt without a sitemap.
 */
function seo(siteUrl: string): Plugin {
  const site = siteUrl.replace(/\/$/, '');
  const pages = ['/', '/about'];
  return {
    name: 'printagram-seo',
    transformIndexHtml(html) {
      const image = `${site}/og-image.jpg`;
      const tags = site
        ? [
            `<link rel="canonical" href="${site}/" />`,
            `<meta property="og:url" content="${site}/" />`,
          ].join('\n    ')
        : '';
      return html
        .replace('<!-- seo -->', tags)
        .replaceAll('%OG_IMAGE%', site ? image : '/og-image.jpg');
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /s/'];
      if (site) robots.push('', `Sitemap: ${site}/sitemap.xml`);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' });
      if (site) {
        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...pages.map((p) => `  <url><loc>${site}${p}</loc></url>`),
          '</urlset>',
        ];
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemap.join('\n') + '\n',
        });
      }
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
