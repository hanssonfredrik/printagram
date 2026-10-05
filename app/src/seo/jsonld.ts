import {
  currencyForLang,
  paymentsAreTest,
  pdfPriceCents,
  type AppConfig,
  type Lang,
} from '@printagram/shared';
import type { Messages } from '@/i18n';
import { forFlags, plainText } from './text';
import { absoluteUrl, GUIDE_KEYS, ogImagePath, PAGES, pathFor, type PageKey } from './routes';

/**
 * The brand's public profiles (Instagram, Facebook, LinkedIn, ...) for Organization.sameAs.
 * Empty until they exist; search engines use them to tie the brand to its accounts.
 */
export const SAME_AS: string[] = [];

type Json = Record<string, unknown>;

/** `{price}` in FAQ answers is filled in from the config (landing FAQ and its FAQPage markup). */
export function fillPrice(text: string, price: string): string {
  return text.replaceAll('{price}', price);
}

/** The <title>; `suffix` false gives the bare name (breadcrumbs). */
export function pageTitle(key: PageKey, t: Messages, suffix = true): string {
  if (key === 'landing') return t.seo.pages.landing.title;
  const base = isGuide(key) ? t.guides.items[key].title : t.seo.pages[key].title;
  return !suffix || base.includes('Inbunden') ? base : base + t.seo.titleSuffix;
}

export function pageDescription(key: PageKey, t: Messages): string {
  return isGuide(key) ? t.guides.items[key].description : t.seo.pages[key].description;
}

export function isGuide(key: PageKey): key is (typeof GUIDE_KEYS)[number] {
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
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@inbunden.com',
      availableLanguage: ['English', 'Swedish'],
    },
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
  const image = absoluteUrl(site, ogImagePath(lang));
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
    dateModified: PAGES[key].updated,
    primaryImageOfPage: image,
  };
  const graph: Json[] = [org, website];
  const faq = (items: { q: string; a: string }[]): Json => ({
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    inLanguage: lang,
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: plainText(fillPrice(f.a, opts.price)) },
    })),
  });

  if (key === 'landing') {
    graph.push(page, faq(forFlags(t.landing.faq, cfg)));
    if (opts.configLoaded && !paymentsAreTest(cfg.payment)) {
      graph.push({
        '@type': 'Product',
        '@id': `${home}#pdf-book`,
        name: t.seo.product.name,
        description: t.seo.product.description,
        image,
        brand: { '@id': orgId },
        offers: {
          '@type': 'Offer',
          price: (pdfPriceCents(cfg.pricing, currencyForLang(lang)) / 100).toFixed(2),
          priceCurrency: currencyForLang(lang).toUpperCase(),
          availability: 'https://schema.org/InStock',
          url: home,
          seller: { '@id': orgId },
          // A digital download: delivered at once, so no returns (see the terms).
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
            applicableCountry: 'SE',
          },
        },
      });
    }
  } else if (isGuide(key)) {
    const g = t.guides.items[key];
    const meta = PAGES[key];
    graph.push(
      page,
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: g.title,
        description: g.description,
        inLanguage: lang,
        url,
        mainEntityOfPage: { '@id': `${url}#webpage` },
        isPartOf: { '@id': siteId },
        image,
        datePublished: meta.published,
        dateModified: meta.updated,
        author: { '@id': orgId },
        publisher: { '@id': orgId },
      },
      faq(forFlags(g.faq, cfg)),
    );
    graph.push(
      breadcrumbs(url, site, lang, t, [
        ['guides', t.guides.breadcrumb],
        [key, g.title],
      ]),
    );
  } else if (key === 'guides') {
    graph.push(
      {
        ...page,
        hasPart: { '@id': `${url}#list` },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#list`,
        itemListElement: GUIDE_KEYS.map((k, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: absoluteUrl(site, pathFor(k, lang)),
          name: t.guides.items[k].title,
        })),
      },
      breadcrumbs(url, site, lang, t, [['guides', t.guides.breadcrumb]]),
    );
  } else {
    graph.push(page, breadcrumbs(url, site, lang, t, [[key, pageTitle(key, t, false)]]));
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function breadcrumbs(
  url: string,
  site: string,
  lang: Lang,
  t: Messages,
  trail: [PageKey, string][],
): Json {
  const items: [PageKey, string][] = [['landing', t.seo.breadcrumbHome], ...trail];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map(([k, name], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absoluteUrl(site, pathFor(k, lang)),
    })),
  };
}
