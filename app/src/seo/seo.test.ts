import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING, type AppConfig } from '@printagram/shared';
import { messagesFor } from '@/i18n';
import { structuredData } from './jsonld';
import {
  allPublicPaths,
  alternates,
  GUIDE_KEYS,
  PAGE_KEYS,
  pageAt,
  PAGES,
  pathFor,
  robotsTxt,
  sitemapXml,
} from './routes';

const SITE = 'https://inbunden.com';

describe('public page table', () => {
  it('has a unique path per page and language, Swedish under /sv', () => {
    const paths = allPublicPaths().map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const key of PAGE_KEYS) {
      expect(pathFor(key, 'sv') === '/sv' || pathFor(key, 'sv').startsWith('/sv/')).toBe(true);
      expect(pathFor(key, 'en').startsWith('/sv')).toBe(false);
    }
  });

  it('maps every path back to its page, and app routes to nothing', () => {
    for (const { key, lang, path } of allPublicPaths()) {
      expect(pageAt(path)).toEqual({ key, lang });
    }
    expect(pageAt('/about/')).toEqual({ key: 'about', lang: 'en' });
    expect(pageAt('/books')).toBeNull();
    expect(pageAt('/s/token')).toBeNull();
  });

  it('gives every page reciprocal hreflang alternates with an English x-default', () => {
    for (const key of PAGE_KEYS) {
      const alts = alternates(SITE, key);
      expect(alts.map((a) => a.hreflang)).toEqual(['en', 'sv', 'x-default']);
      expect(alts[2]!.href).toBe(alts[0]!.href);
    }
    expect(alternates(SITE, 'landing')[0]!.href).toBe('https://inbunden.com/');
    expect(alternates(SITE, 'about')[1]!.href).toBe('https://inbunden.com/sv/om');
  });

  it('lists every public URL in the sitemap and points robots.txt at it', () => {
    const xml = sitemapXml(SITE);
    for (const { path } of allPublicPaths()) {
      expect(xml).toContain(`<loc>${path === '/' ? SITE + '/' : SITE + path}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(PAGE_KEYS.length * 2);
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).toContain(`<lastmod>${PAGES.guidePrint.updated}</lastmod>`);
    const robots = robotsTxt(SITE);
    expect(robots).toContain('Sitemap: https://inbunden.com/sitemap.xml');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).not.toMatch(/Disallow: \/$/m);
  });

  it('has a dated guide text in both languages for every guide', () => {
    for (const key of GUIDE_KEYS) {
      expect(PAGES[key].published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const lang of ['en', 'sv'] as const) {
        const g = messagesFor(lang).guides.items[key];
        expect(g.title.length).toBeGreaterThan(10);
        expect(g.description.length).toBeLessThanOrEqual(170);
        expect(g.faq.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('structured data', () => {
  const cfg = (provider: 'fake' | 'stripe'): AppConfig =>
    ({
      pricing: DEFAULT_PRICING,
      payment: { provider, stripePublishableKey: null, testCards: [] },
    }) as unknown as AppConfig;
  const graph = (data: Record<string, unknown>) =>
    data['@graph'] as { '@type': string; [k: string]: unknown }[];

  it('describes the landing page with the organization and the FAQ', () => {
    const data = structuredData({
      key: 'landing',
      lang: 'en',
      t: messagesFor('en'),
      cfg: cfg('fake'),
      configLoaded: true,
      site: SITE,
      price: '€9',
    });
    const types = graph(data).map((n) => n['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'WebPage', 'FAQPage']);
    const faq = graph(data).find((n) => n['@type'] === 'FAQPage')!;
    const answers = JSON.stringify(faq.mainEntity);
    expect(answers).toContain('€9 per book');
    expect(answers).not.toContain('{price}');
    expect(() => JSON.parse(JSON.stringify(data))).not.toThrow();
  });

  it('adds the product offer only with real payments, at the configured price', () => {
    const data = structuredData({
      key: 'landing',
      lang: 'sv',
      t: messagesFor('sv'),
      cfg: cfg('stripe'),
      configLoaded: true,
      site: SITE,
      price: '9 €',
    });
    const product = graph(data).find((n) => n['@type'] === 'Product')!;
    expect(product.offers).toMatchObject({
      price: (DEFAULT_PRICING.baseCents / 100).toFixed(2),
      priceCurrency: 'EUR',
    });
  });

  it('leaves the offer out while Stripe runs with test keys', () => {
    const data = structuredData({
      key: 'landing',
      lang: 'en',
      t: messagesFor('en'),
      cfg: {
        ...cfg('stripe'),
        payment: { provider: 'stripe', stripePublishableKey: 'pk_test_x', testCards: [] },
      },
      configLoaded: true,
      site: SITE,
      price: '€9',
    });
    expect(graph(data).some((n) => n['@type'] === 'Product')).toBe(false);
  });

  it('marks guides up as articles with breadcrumbs', () => {
    const data = structuredData({
      key: 'guidePrint',
      lang: 'sv',
      t: messagesFor('sv'),
      cfg: cfg('fake'),
      configLoaded: true,
      site: SITE,
      price: '9 €',
    });
    const article = graph(data).find((n) => n['@type'] === 'Article')!;
    expect(article.inLanguage).toBe('sv');
    expect(article.url).toBe('https://inbunden.com/sv/guider/skriv-ut-din-fotobok');
    expect(article.dateModified).toBe(PAGES.guidePrint.updated);
    const crumbs = graph(data).find((n) => n['@type'] === 'BreadcrumbList')!;
    expect(JSON.stringify(crumbs)).toContain('https://inbunden.com/sv/guider');
  });
});
