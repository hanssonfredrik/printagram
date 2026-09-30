/**
 * Every page search engines and AI crawlers should index, with its URL per language.
 * The single source of truth for the router, sitemap.xml, robots.txt, llms.txt, hreflang,
 * the language picker and the prerender script (scripts/prerender.ts), so keep it free of
 * runtime imports: vite.config.ts and the script load it too.
 */
import type { Lang } from '@printagram/shared';

/** Public origin. VITE_SITE_URL overrides it (vite.config.ts); PR previews still point here. */
export const DEFAULT_SITE_URL = 'https://inbunden.com';

export type PageKey =
  | 'landing'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'guides'
  | 'guideInstagramBook'
  | 'guideInstagramExport'
  | 'guidePrint';

export type GuideKey = 'guideInstagramBook' | 'guideInstagramExport' | 'guidePrint';

export interface PublicPage {
  paths: Record<Lang, string>;
  /** sitemap.xml priority. */
  priority: number;
  /** Last real content change (YYYY-MM-DD): sitemap lastmod and the guides' dateModified. */
  updated?: string;
  /** First publication (YYYY-MM-DD), for the guides' Article markup. */
  published?: string;
}

export const PAGES: Record<PageKey, PublicPage> = {
  landing: { paths: { en: '/', sv: '/sv' }, priority: 1 },
  about: { paths: { en: '/about', sv: '/sv/om' }, priority: 0.6 },
  guides: { paths: { en: '/guides', sv: '/sv/guider' }, priority: 0.7 },
  guideInstagramBook: {
    paths: { en: '/guides/instagram-photo-book', sv: '/sv/guider/fotobok-av-instagram' },
    priority: 0.8,
    published: '2026-09-30',
    updated: '2026-09-30',
  },
  guideInstagramExport: {
    paths: { en: '/guides/download-instagram-data', sv: '/sv/guider/ladda-ner-instagram-data' },
    priority: 0.8,
    published: '2026-09-30',
    updated: '2026-09-30',
  },
  guidePrint: {
    paths: { en: '/guides/print-your-photo-book', sv: '/sv/guider/skriv-ut-din-fotobok' },
    priority: 0.7,
    published: '2026-09-30',
    updated: '2026-09-30',
  },
  privacy: { paths: { en: '/privacy', sv: '/sv/integritet' }, priority: 0.3 },
  terms: { paths: { en: '/terms', sv: '/sv/villkor' }, priority: 0.3 },
};

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
        ...(page.updated ? [`    <lastmod>${page.updated}</lastmod>`] : []),
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
