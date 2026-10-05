import { useEffect } from 'react';
import { currencyForLang, fmtMoney, pdfPriceCents, type Lang } from '@printagram/shared';
import { messagesFor } from '@/i18n';
import { useSession } from '@/state/session';
import { isGuide, pageDescription, pageTitle, structuredData } from './jsonld';
import {
  absoluteUrl,
  alternates,
  DEFAULT_SITE_URL,
  ogImagePath,
  PAGES,
  pathFor,
  type PageKey,
} from './routes';

export const SITE_URL = (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

/** Tags this hook adds (rather than updates) carry this attribute so they can be replaced. */
const OWNED = 'data-seo';

function meta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function add(tag: 'link' | 'script' | 'meta', attrs: Record<string, string>, text?: string) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.setAttribute(OWNED, '');
  if (text) el.textContent = text;
  document.head.appendChild(el);
}

/**
 * Head tags for a public page: title, description, canonical, hreflang, Open Graph, robots and
 * JSON-LD. The prerender (scripts/prerender.ts) snapshots the result, so the same code produces
 * both the static HTML crawlers read and the head after client-side navigation.
 * `page` null (404 and other non-indexed screens) sets noindex.
 */
export function useSeo(page: { key: PageKey; lang: Lang } | null) {
  const cfg = useSession((s) => s.config);
  const configLoaded = useSession((s) => s.configLoaded);

  useEffect(() => {
    document.head.querySelectorAll(`[${OWNED}]`).forEach((el) => el.remove());
    if (!page) {
      add('meta', { name: 'robots', content: 'noindex' });
      return;
    }
    const { key, lang } = page;
    const t = messagesFor(lang);
    const title = pageTitle(key, t);
    const description = pageDescription(key, t);
    const url = absoluteUrl(SITE_URL, pathFor(key, lang));

    const image = absoluteUrl(SITE_URL, ogImagePath(lang));
    const guide = isGuide(key);

    document.title = title;
    document.documentElement.lang = lang;
    meta('name', 'description', description);
    meta('property', 'og:type', guide ? 'article' : 'website');
    meta('property', 'og:title', title);
    meta('property', 'og:description', description);
    meta('property', 'og:image', image);
    meta('property', 'og:image:alt', t.seo.imageAlt);
    add('meta', { property: 'og:url', content: url });
    add('meta', { property: 'og:locale', content: t.seo.locale });
    if (guide) {
      add('meta', { property: 'article:published_time', content: PAGES[key].published ?? '' });
      add('meta', { property: 'article:modified_time', content: PAGES[key].updated });
    }
    add('meta', { name: 'robots', content: 'index, follow, max-image-preview:large' });
    add('meta', {
      property: 'og:locale:alternate',
      content: messagesFor(lang === 'en' ? 'sv' : 'en').seo.locale,
    });
    add('link', { rel: 'canonical', href: url });
    for (const a of alternates(SITE_URL, key)) {
      add('link', { rel: 'alternate', hreflang: a.hreflang, href: a.href });
    }
    const data = structuredData({
      key,
      lang,
      t,
      cfg,
      configLoaded,
      site: SITE_URL,
      price: fmtMoney(
        pdfPriceCents(cfg.pricing, currencyForLang(lang)),
        currencyForLang(lang),
        lang,
      ),
    });
    add('script', { type: 'application/ld+json' }, JSON.stringify(data));
  }, [page?.key, page?.lang, cfg, configLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
}
