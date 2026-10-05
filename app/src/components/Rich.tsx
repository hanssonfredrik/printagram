import type { ReactNode } from 'react';
import { PageLink } from './PageLink';
import { PAGE_KEYS, type PageKey } from '@/seo/routes';
import { LINK_MARKUP } from '@/seo/text';

/**
 * Renders copy that may contain `[text](pageKey)` links as crawlable links to public pages in
 * the current language. Unknown keys render as plain text.
 */
export function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_MARKUP)) {
    const [all, label, key, hash] = m;
    parts.push(text.slice(last, m.index));
    parts.push(
      PAGE_KEYS.includes(key as PageKey) ? (
        <PageLink key={m.index} page={key as PageKey} hash={hash}>
          {label}
        </PageLink>
      ) : (
        label
      ),
    );
    last = m.index + all.length;
  }
  parts.push(text.slice(last));
  // No empty strings: they would be empty text nodes that the prerendered HTML can't contain.
  return <>{parts.filter((p) => p !== '')}</>;
}
