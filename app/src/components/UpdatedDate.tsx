import type { Lang } from '@printagram/shared';
import { useLang } from '@/i18n';
import { PAGES, type PageKey } from '@/seo/routes';

function fmtDay(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Updated 5 October 2026" for a public page, from its `updated` date in src/seo/routes.ts. */
export function UpdatedDate({
  page,
  label,
  className = 'tiny muted',
  style,
}: {
  page: PageKey;
  label: (date: string) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const lang = useLang((l) => l.lang);
  const iso = PAGES[page].updated;
  return (
    <p className={className} style={style}>
      <time dateTime={iso}>{label(fmtDay(iso, lang))}</time>
    </p>
  );
}
