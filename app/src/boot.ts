/**
 * Runs before the router is created (imported first in main.tsx). Public pages take their
 * language from the URL. A first-time visitor with a Swedish browser who lands on an English
 * public page is sent to its Swedish twin; crawlers (en-US, nothing saved) never are.
 */
import { browserLang, hasSavedLang, useLang } from '@/i18n';
import { pageAt, pathFor } from '@/seo/routes';

const page = pageAt(window.location.pathname);

/**
 * Whether the page in #root (if any) was prerendered for this URL and language, so main.tsx can
 * hydrate it instead of rendering from scratch.
 */
export let canHydrate = page !== null;

if (page) {
  let lang = page.lang;
  if (lang === 'en' && !hasSavedLang() && browserLang() === 'sv') {
    lang = 'sv';
    const { search, hash } = window.location;
    window.history.replaceState(null, '', pathFor(page.key, 'sv') + search + hash);
    canHydrate = false;
  }
  useLang.getState().setLang(lang);
}
