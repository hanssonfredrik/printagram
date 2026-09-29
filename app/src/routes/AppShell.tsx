import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { LanguageSelect } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';

function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="tiny muted">
          {t.common.brand} · {t.common.footer.tagline} ·{' '}
          <Link to="/about" className="site-footer__link">
            {t.common.footer.about}
          </Link>{' '}
          ·{' '}
          <Link to="/privacy" className="site-footer__link">
            {t.common.footer.privacy}
          </Link>{' '}
          ·{' '}
          <Link to="/terms" className="site-footer__link">
            {t.common.footer.terms}
          </Link>
        </span>
        <LanguageSelect />
      </div>
    </footer>
  );
}

export function AppShell() {
  const init = useSession((s) => s.init);
  const ready = useSession((s) => s.ready);
  const { pathname } = useLocation();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!ready) return null;

  return (
    <>
      <Outlet />
      <SiteFooter />
    </>
  );
}
