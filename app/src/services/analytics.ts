import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Google Analytics 4, loaded only after the visitor accepts (GA sets the _ga cookies, which need
 * consent under GDPR / the Swedish LEK). Nothing is requested from Google before that.
 *
 * Only on the production hosts: localhost, PR previews and prerendering (automated browser)
 * never load it. Global Privacy Control / Do Not Track count as "declined" and hide the banner.
 * The tag is the standard gtag.js snippet, moved into this module because the CSP allows no
 * inline scripts.
 */
export const GA_ID = 'G-JJQ0ZS1MSP';
const GA_HOSTS = ['inbunden.com', 'www.inbunden.com'];

export type Consent = 'granted' | 'denied';

interface ConsentState {
  analytics: Consent | null;
  decidedAt: string | null;
  set: (c: Consent) => void;
  /** "Cookie settings" in the footer: ask again. */
  reset: () => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      analytics: null,
      decidedAt: null,
      set: (analytics) => set({ analytics, decidedAt: new Date().toISOString() }),
      reset: () => set({ analytics: null, decidedAt: null }),
    }),
    { name: 'printagram.consent', version: 1 },
  ),
);

/** Whether this page may offer analytics at all (production host, a real person's browser). */
export function analyticsAvailable(
  host = typeof location === 'undefined' ? '' : location.hostname,
  nav: (Navigator & { globalPrivacyControl?: boolean }) | undefined = typeof navigator ===
  'undefined'
    ? undefined
    : navigator,
): boolean {
  if (!GA_HOSTS.includes(host) || !nav || nav.webdriver) return false;
  return !(nav.globalPrivacyControl === true || nav.doNotTrack === '1');
}

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let loaded = false;

function loadGa() {
  if (loaded) {
    // Re-enabled after a decline in the same visit.
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = false;
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the Arguments object, exactly as in Google's snippet.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/** Stops collection and removes GA's cookies (consent withdrawn). */
function stopGa() {
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = true;
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  const domain = location.hostname.replace(/^www\./, '');
  for (const name of document.cookie.split(';').map((c) => c.split('=')[0]!.trim())) {
    if (!name.startsWith('_ga')) continue;
    for (const d of ['', `; domain=${domain}`, `; domain=.${domain}`])
      document.cookie = `${name}=; Max-Age=0; path=/${d}`;
  }
}

/** Applies the stored choice now and whenever it changes. Call once at startup. */
export function initAnalytics(): void {
  if (!analyticsAvailable()) return;
  const apply = (c: Consent | null) => {
    if (c === 'granted') loadGa();
    else if (loaded || c === 'denied') stopGa();
  };
  apply(useConsent.getState().analytics);
  useConsent.subscribe((s, prev) => {
    if (s.analytics !== prev.analytics) apply(s.analytics);
  });
}
