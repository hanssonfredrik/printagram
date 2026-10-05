/**
 * Every page search engines and AI crawlers should index, with its URL per language.
 * The single source of truth for the router, sitemap.xml, robots.txt, llms.txt, hreflang,
 * the language picker and the prerender script (scripts/prerender.ts), so keep it free of
 * runtime imports: vite.config.ts and the script load it too.
 */
import type { Lang } from '@printagram/shared';

/** Public origin. VITE_SITE_URL overrides it (vite.config.ts); PR previews still point here. */
export const DEFAULT_SITE_URL = 'https://inbunden.com';

export type PageKey = 'landing' | 'about' | 'privacy' | 'terms' | 'guides' | GuideKey;

/** In the order the guides index lists them. */
export type GuideKey =
  | 'guideInstagramBook'
  | 'guideInstagramExport'
  | 'guideExportProblems'
  | 'guidePrint'
  | 'guidePrintPhotos'
  | 'guideYearBook'
  | 'guideGift'
  | 'guideCompare';

export interface PublicPage {
  paths: Record<Lang, string>;
  /** sitemap.xml priority. */
  priority: number;
  /** Last real content change (YYYY-MM-DD): sitemap lastmod, dateModified and the visible date. */
  updated: string;
  /** First publication (YYYY-MM-DD), for the guides' Article markup. */
  published?: string;
}

export const PAGES: Record<PageKey, PublicPage> = {
  landing: { paths: { en: '/', sv: '/sv' }, priority: 1, updated: '2026-10-05' },
  about: { paths: { en: '/about', sv: '/sv/om' }, priority: 0.6, updated: '2026-10-05' },
  guides: { paths: { en: '/guides', sv: '/sv/guider' }, priority: 0.7, updated: '2026-10-05' },
  guideInstagramBook: {
    paths: { en: '/guides/instagram-photo-book', sv: '/sv/guider/fotobok-av-instagram' },
    priority: 0.8,
    published: '2026-09-30',
    updated: '2026-10-05',
  },
  guideInstagramExport: {
    paths: { en: '/guides/download-instagram-data', sv: '/sv/guider/ladda-ner-instagram-data' },
    priority: 0.8,
    published: '2026-09-30',
    updated: '2026-10-05',
  },
  guideExportProblems: {
    paths: {
      en: '/guides/instagram-export-problems',
      sv: '/sv/guider/problem-med-instagram-export',
    },
    priority: 0.6,
    published: '2026-10-05',
    updated: '2026-10-05',
  },
  guidePrint: {
    paths: { en: '/guides/print-your-photo-book', sv: '/sv/guider/skriv-ut-din-fotobok' },
    priority: 0.7,
    published: '2026-09-30',
    updated: '2026-10-05',
  },
  guidePrintPhotos: {
    paths: { en: '/guides/print-instagram-photos', sv: '/sv/guider/skriva-ut-instagrambilder' },
    priority: 0.7,
    published: '2026-10-05',
    updated: '2026-10-05',
  },
  guideYearBook: {
    paths: { en: '/guides/yearly-photo-book', sv: '/sv/guider/arsbok-fotobok' },
    priority: 0.7,
    published: '2026-10-05',
    updated: '2026-10-05',
  },
  guideGift: {
    paths: { en: '/guides/photo-book-gift', sv: '/sv/guider/fotobok-som-present' },
    priority: 0.7,
    published: '2026-10-05',
    updated: '2026-10-05',
  },
  guideCompare: {
    paths: {
      en: '/guides/instagram-photo-book-services-compared',
      sv: '/sv/guider/jamfor-fotobokstjanster-for-instagram',
    },
    priority: 0.8,
    published: '2026-10-05',
    updated: '2026-10-05',
  },
  privacy: {
    paths: { en: '/privacy', sv: '/sv/integritet' },
    priority: 0.3,
    updated: '2026-10-05',
  },
  terms: { paths: { en: '/terms', sv: '/sv/villkor' }, priority: 0.3, updated: '2026-10-02' },
};

/**
 * App routes (router.tsx, under SessionGate) as Static Web Apps route patterns. They are served
 * the noindexed SPA shell; every other unknown URL gets a real 404 (scripts/prerender.ts).
 */
export const APP_ROUTES = [
  '/start',
  '/connect',
  '/google',
  '/export',
  '/export/*',
  '/select',
  '/preview',
  '/checkout',
  '/done',
  '/done/*',
  '/signin',
  '/r/*',
  '/reset/*',
  '/books',
  '/s/*',
] as const;

export const PAGE_KEYS = Object.keys(PAGES) as PageKey[];
export const GUIDE_KEYS = PAGE_KEYS.filter(
  (k): k is GuideKey => k.startsWith('guide') && k !== 'guides',
);
export const PAGE_LANGS: readonly Lang[] = ['en', 'sv'];

export function pathFor(key: PageKey, lang: Lang): string {
  return PAGES[key].paths[lang];
}

/** Which public page (and language) a pathname is, or null for app routes. */
export function pageAt(pathname: string): { key: PageKey; lang: Lang } | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const key of PAGE_KEYS) {
    for (const lang of PAGE_LANGS) {
      if (PAGES[key].paths[lang] === p) return { key, lang };
    }
  }
  return null;
}

/** Every public URL path, e.g. for the prerender script. */
export function allPublicPaths(): { key: PageKey; lang: Lang; path: string }[] {
  return PAGE_KEYS.flatMap((key) =>
    PAGE_LANGS.map((lang) => ({ key, lang, path: pathFor(key, lang) })),
  );
}

/** The share image per language: a screenshot of that landing page (scripts/prerender.ts). */
export function ogImagePath(lang: Lang): string {
  return `/og-image-${lang}.jpg`;
}

export function absoluteUrl(site: string, path: string): string {
  const base = site.replace(/\/$/, '');
  return path === '/' ? `${base}/` : `${base}${path}`;
}

/** hreflang alternates for a page: one per language plus x-default (English). */
export function alternates(site: string, key: PageKey): { hreflang: string; href: string }[] {
  return [
    ...PAGE_LANGS.map((lang) => ({ hreflang: lang, href: absoluteUrl(site, pathFor(key, lang)) })),
    { hreflang: 'x-default', href: absoluteUrl(site, pathFor(key, 'en')) },
  ];
}

/** sitemap.xml with hreflang alternates for every public URL. */
export function sitemapXml(site: string): string {
  const urls = PAGE_KEYS.flatMap((key) =>
    PAGE_LANGS.map((lang) => {
      const page = PAGES[key];
      const links = alternates(site, key)
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
        .join('\n');
      return [
        '  <url>',
        `    <loc>${absoluteUrl(site, pathFor(key, lang))}</loc>`,
        `    <lastmod>${page.updated}</lastmod>`,
        `    <priority>${page.priority.toFixed(1)}</priority>`,
        links,
        '  </url>',
      ].join('\n');
    }),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** robots.txt: everything public is open to search engines and AI crawlers alike. */
export function robotsTxt(site: string): string {
  return [
    '# Search engines and AI assistants (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,',
    '# Google-Extended, ...) are all welcome. App screens carry noindex instead of a Disallow.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /s/',
    '',
    `Sitemap: ${absoluteUrl(site, '/sitemap.xml')}`,
    '',
  ].join('\n');
}
