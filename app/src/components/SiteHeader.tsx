import { useEffect, useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { paymentsAreTest } from '@printagram/shared';
import { Button, cx, LanguageSelect } from '@/components/ui';
import { PageLink } from '@/components/PageLink';
import { useT } from '@/i18n';
import { useDraft } from '@/state/draft';
import { useSession } from '@/state/session';
import type { PageKey } from '@/seo/routes';
import s from './siteHeader.module.css';

type NavItem = { page: PageKey; hash?: string; label: string; active: boolean };

/**
 * Top navigation on the public pages (landing, guides, about, legal). App screens keep their own
 * headers. Links are real <a href>s in the current language so crawlers can follow them.
 */
export function SiteHeader({ page }: { page: PageKey | null }) {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const user = useSession((x) => x.user);
  const ready = useSession((x) => x.ready);
  const testMode = useSession((x) => paymentsAreTest(x.config.payment));
  const setAdding = useDraft((d) => d.setAdding);
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.key;
  const setOpen = (o: boolean) => setOpenAt(o ? location.key : null);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const signedIn = user?.authLevel === 'password' || user?.authLevel === 'email';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const start = () => {
    setAdding(false);
    nav('/start');
  };

  const items: NavItem[] = [
    { page: 'landing', hash: 'how', label: t.common.nav.how, active: false },
    { page: 'landing', hash: 'pricing', label: t.common.nav.pricing, active: false },
    {
      page: 'guides',
      label: t.common.nav.guides,
      active: page === 'guides' || !!page?.startsWith('guide'),
    },
    { page: 'about', label: t.common.nav.about, active: page === 'about' },
  ];

  // A hash link to the section already on screen doesn't change the URL, so scroll by hand.
  const jump = (item: NavItem) => () => {
    setOpen(false);
    if (item.hash && page === 'landing') {
      document.getElementById(item.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const links = (className?: string) =>
    items.map((item) => (
      <PageLink
        key={item.label}
        page={item.page}
        hash={item.hash}
        className={className}
        current={item.active}
        onClick={jump(item)}
      >
        {item.label}
      </PageLink>
    ));

  const account = signedIn ? (
    <Button variant="ghost" size="md" to="/books">
      {t.landing.myBooks}
    </Button>
  ) : (
    <Button variant="ghost" size="md" to="/signin">
      {t.landing.signIn}
    </Button>
  );

  return (
    <header className={s.bar} data-scrolled={scrolled || open ? '' : undefined}>
      <a href="#main" className={s.skip}>
        {t.common.nav.skip}
      </a>
      <div className={s.inner}>
        <div className={s.brandRow}>
          <PageLink page="landing" className={cx('brand', s.brand)}>
            <img src="/logo.svg" alt="" width={28} height={28} className={s.mark} />
            {t.common.brand}
          </PageLink>
          {ready && testMode && (
            <span className={s.testPill} title={t.landing.testModeTitle}>
              {t.landing.testMode}
            </span>
          )}
        </div>

        <nav aria-label={t.common.nav.label} className={s.nav}>
          {links(s.link)}
        </nav>

        <div className={s.actions}>
          <span className={s.wide}>
            <LanguageSelect />
          </span>
          <span className={s.wide}>{account}</span>
          <Button
            size="md"
            onClick={start}
            className={cx(s.cta, page === 'landing' && s['cta--landing'])}
          >
            {t.landing.start}
          </Button>
          <button
            type="button"
            className={s.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? t.common.nav.closeMenu : t.common.nav.menu}
            onClick={() => setOpen(!open)}
          >
            <span className={cx(s.burger, open && s['burger--open'])} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div id={menuId} className={s.panel}>
          <nav aria-label={t.common.nav.label} className={s.panelNav}>
            {links(s.panelLink)}
          </nav>
          <div className={s.panelFoot}>
            <LanguageSelect />
            {account}
          </div>
        </div>
      )}
    </header>
  );
}
