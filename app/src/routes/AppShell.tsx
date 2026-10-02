import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ConsentBanner, CookieSettingsLink } from '@/components/ConsentBanner';
import { LanguageSelect } from '@/components/ui';
import { PageLink } from '@/components/PageLink';
import { SiteHeader } from '@/components/SiteHeader';
import { useLang, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { pageAt } from '@/seo/routes';
import { useSeo } from '@/seo/useSeo';

function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="tiny muted">
          {t.common.brand} · {t.common.footer.tagline} ·{' '}
          <PageLink page="guides" className="site-footer__link">
            {t.common.footer.guides}
          </PageLink>{' '}
          ·{' '}
          <PageLink page="about" className="site-footer__link">
            {t.common.footer.about}
          </PageLink>{' '}
          ·{' '}
          <PageLink page="privacy" className="site-footer__link">
            {t.common.footer.privacy}
          </PageLink>{' '}
          ·{' '}
          <PageLink page="terms" className="site-footer__link">
            {t.common.footer.terms}
          </PageLink>
          <CookieSettingsLink className="site-footer__link site-footer__button" /> · Venueve AB
        </span>
        <LanguageSelect />
      </div>
    </footer>
  );
}

/** Root route: loads the session and handles scrolling (top on a new page, or to #section). */
export function AppShell() {
  const init = useSession((s) => s.init);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Outlet />
      <ConsentBanner />
    </>
  );
}

/**
 * Public pages (src/seo/routes.ts): rendered straight away, without waiting for the session, so
 * the prerendered HTML and the first client render match. The URL decides the language.
 */
export function PublicLayout() {
  const { pathname } = useLocation();
  const page = pageAt(pathname);
  const setLang = useLang((l) => l.setLang);
  const lang = useLang((l) => l.lang);

  useLayoutEffect(() => {
    if (page && page.lang !== lang) setLang(page.lang);
  }, [page, lang, setLang]);

  useSeo(page);

  return (
    <>
      <SiteHeader page={page?.key ?? null} />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

/** App screens: wait for the session (user, config) before rendering. */
export function SessionGate() {
  const ready = useSession((s) => s.ready);
  if (!ready) return null;
  return (
    <>
      <SiteHeader page={null} variant="app" />
      <Outlet />
      <SiteFooter />
    </>
  );
}
