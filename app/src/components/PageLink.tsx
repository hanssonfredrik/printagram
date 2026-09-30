import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useLang } from '@/i18n';
import { pathFor, type PageKey } from '@/seo/routes';

/** A public page's URL in the current UI language, e.g. about → /about or /sv/om. */
function useLocalizedPath(page: PageKey, hash?: string): string {
  const lang = useLang((l) => l.lang);
  return pathFor(page, lang) + (hash ? `#${hash}` : '');
}

/** A real <a href> to a public page in the current language, so crawlers can follow it. */
export function PageLink({
  page,
  hash,
  className,
  children,
  current,
  onClick,
}: {
  page: PageKey;
  hash?: string;
  className?: string;
  children: ReactNode;
  current?: boolean;
  onClick?: () => void;
}) {
  const to = useLocalizedPath(page, hash);
  return (
    <Link
      to={to}
      className={className}
      aria-current={current ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
