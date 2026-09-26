import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { LanguageSelect } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';

function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="tiny muted">Printagram · {t.common.footer.tagline}</span>
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
