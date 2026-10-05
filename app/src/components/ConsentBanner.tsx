import { useSyncExternalStore } from 'react';
import { useT } from '@/i18n';
import { analyticsAvailable, useConsent } from '@/services/analytics';
import { PageLink } from './PageLink';
import { Button } from './ui';
import s from './consentBanner.module.css';

/**
 * Asks once for Google Analytics consent. Accept and Decline are equally easy, nothing loads
 * before Accept, and "Cookie settings" in the footer brings the banner back.
 * Shown only where analytics can run (production host, real browser); prerendering runs in an
 * automated browser, so the static HTML never contains it.
 */
export function ConsentBanner() {
  const t = useT();
  const mounted = useMounted();
  const analytics = useConsent((c) => c.analytics);
  const set = useConsent((c) => c.set);
  if (!mounted || analytics !== null || !analyticsAvailable()) return null;
  return (
    <section className={s.banner} role="region" aria-label={t.common.consent.label}>
      <p className={s.text}>
        {t.common.consent.body}{' '}
        <PageLink page="privacy" className={s.link}>
          {t.common.consent.more}
        </PageLink>
      </p>
      <div className={s.actions}>
        <Button variant="outline" size="sm" onClick={() => set('denied')}>
          {t.common.consent.decline}
        </Button>
        <Button variant="outline" size="sm" onClick={() => set('granted')}>
          {t.common.consent.accept}
        </Button>
      </div>
    </section>
  );
}

/** Footer link that reopens the banner (only where analytics exists). */
export function CookieSettingsLink({ className }: { className?: string }) {
  const t = useT();
  const mounted = useMounted();
  const reset = useConsent((c) => c.reset);
  if (!mounted || !analyticsAvailable()) return null;
  return (
    <>
      {' · '}
      <button type="button" className={className} onClick={reset}>
        {t.common.footer.cookies}
      </button>
    </>
  );
}

const noSubscribe = () => () => {};

/**
 * False while React hydrates prerendered HTML, so browser-only UI (it depends on the host and the
 * browser) is left out of the first render, the same as in the static HTML. True otherwise.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}
