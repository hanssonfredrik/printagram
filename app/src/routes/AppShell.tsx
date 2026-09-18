import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useSession } from '@/state/session';
import { DemoBar } from '@/components/DemoBar';
import { DEMO_ENABLED } from '@/state/demo';

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
      {DEMO_ENABLED && <DemoBar />}
    </>
  );
}
