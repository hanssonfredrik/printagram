import type { AppConfig, Lang } from '@printagram/shared';
import type { Messages } from '@/i18n';
import { absoluteUrl, GUIDE_KEYS, PAGES, pathFor, type PageKey } from './routes';

type Json = Record<string, unknown>;

/** `{price}` in FAQ answers is filled in from the config (landing FAQ and its FAQPage markup). */
export function fillPrice(text: string, price: string): string {
  return text.replaceAll('{price}', price);
}

export function pageTitle(key: PageKey, t: Messages): string {
  if (key === 'landing') return t.seo.pages.landing.title;
  const base = isGuide(key) ? t.guides.items[key].title : t.seo.pages[key].title;
  return base.includes('Inbunden') ? base : base + t.seo.titleSuffix;
}

export function pageDescription(key: PageKey, t: Messages): string {
  return isGuide(key) ? t.guides.items[key].description : t.seo.pages[key].description;
}

function isGuide(key: PageKey): key is (typeof GUIDE_KEYS)[number] {
  return (GUIDE_KEYS as PageKey[]).includes(key);
}

/**
 * schema.org JSON-LD for a public page, as one @graph. Only facts the page itself shows:
 * no ratings, and the product offer only once real payments are on.
 */
export function structuredData(opts: {
  key: PageKey;
  lang: Lang;
  t: Messages;
  cfg: AppConfig;
  /** False until /api/config has answered: leaves out config-dependent parts (the offer). */
  configLoaded: boolean;
  site: string;
  price: string;
}): Json {
  const { key, lang, t, cfg, site } = opts;
  const url = absoluteUrl(site, pathFor(key, lang));
  const home = absoluteUrl(site, pathFor('landing', lang));
  const orgId = `${absoluteUrl(site, '/')}#organization`;
  const siteId = `${absoluteUrl(site, '/')}#website`;
  const org: Json = {
    '@type': 'Organization',
    '@id': orgId,
    name: 'Inbunden',
    legalName: 'Venueve AB',
    url: absoluteUrl(site, '/'),
    logo: absoluteUrl(site, '/logo.png'),
    email: 'hello@inbunden.com',
    description: t.seo.organizationDescription,
    address: { '@type': 'PostalAddress', addressCountry: 'SE' },
  };
  const website: Json = {
    '@type': 'WebSite',
    '@id': siteId,
    name: 'Inbunden',
    url: absoluteUrl(site, '/'),
    inLanguage: ['en', 'sv'],
    publisher: { '@id': orgId },
  };
  const page: Json = {
    '@type': key === 'about' ? 'AboutPage' : key === 'guides' ? 'CollectionPage' : 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: pageTitle(key, t),
    description: pageDescription(key, t),
    inLanguage: lang,
    isPartOf: { '@id': siteId },
  };
  const graph: Json[] = [org, website];
  const faq = (items: { q: string; a: string }[]): Json => ({
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    inLanguage: lang,
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: fillPrice(f.a, opts.price) },
    })),
  });

  if (key === 'landing') {
    graph.push(page, faq(t.landing.faq));
    if (opts.configLoaded && cfg.payment.provider !== 'fake') {
      graph.push({
        '@type': 'Product',
        '@id': `${home}#pdf-book`,
        name: t.seo.product.name,
        description: t.seo.product.description,
        image: absoluteUrl(site, '/og-image.jpg'),
        brand: { '@id': orgId },
        offers: {
          '@type': 'Offer',
          price: (cfg.pricing.baseCents / 100).toFixed(2),
          priceCurrency: cfg.pricing.currency.toUpperCase(),
          availability: 'https://schema.org/InStock',
          url: home,
          seller: { '@id': orgId },
        },
      });
    }
  } else if (isGuide(key)) {
    const g = t.guides.items[key];
    const meta = PAGES[key];
    graph.push(
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: g.title,
        description: g.description,
        inLanguage: lang,
        url,
        mainEntityOfPage: url,
        image: absoluteUrl(site, '/og-image.jpg'),
        datePublished: meta.published,
        dateModified: meta.updated,
        author: { '@id': orgId },
        publisher: { '@id': orgId },
      },
      faq(g.faq),
    );
    graph.push(
      breadcrumbs(site, lang, t, [
        ['guides', t.guides.breadcrumb],
        [key, g.title],
      ]),
    );
  } else {
    graph.push(page);
    if (key === 'guides') {
      graph.push(breadcrumbs(site, lang, t, [['guides', t.guides.breadcrumb]]));
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function breadcrumbs(site: string, lang: Lang, t: Messages, trail: [PageKey, string][]): Json {
  const items: [PageKey, string][] = [['landing', t.seo.breadcrumbHome], ...trail];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([k, name], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absoluteUrl(site, pathFor(k, lang)),
    })),
  };
}
