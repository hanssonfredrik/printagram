/** Languages the app, the emails and the printed book can be in. */
export type Lang = 'en' | 'sv';

export const LANGS: readonly Lang[] = ['en', 'sv'];
export const DEFAULT_LANG: Lang = 'en';

/** Display names, each in its own language (for the language picker). */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', sv: 'Svenska' };

/** Exact match on a supported language, else null. "sv-SE" → "sv", "de" → null. */
export function matchLang(tag: string | null | undefined): Lang | null {
  const base = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return (LANGS as readonly string[]).includes(base ?? '') ? (base as Lang) : null;
}

/** Any value to a supported language, falling back to English. */
export function normalizeLang(tag: string | null | undefined): Lang {
  return matchLang(tag) ?? DEFAULT_LANG;
}

/** First supported language in a list of preferences (e.g. navigator.languages). */
export function pickLang(tags: readonly (string | null | undefined)[]): Lang {
  for (const t of tags) {
    const l = matchLang(t);
    if (l) return l;
  }
  return DEFAULT_LANG;
}

/** Best supported language from an Accept-Language header ("sv-SE,sv;q=0.9,en;q=0.8"). */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  const ranked = header
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { tag: tag ?? '', q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return pickLang(ranked.map((x) => x.tag));
}

export const MONTHS_SHORT_BY_LANG: Record<Lang, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sv: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
};

/** Text that ends up in the book itself (preview and PDF) or in its defaults. */
export interface BookText {
  defaultTitle: string;
  photos: (n: number) => string;
  madeWith: string;
  copySuffix: string;
}

const BOOK_TEXT: Record<Lang, BookText> = {
  en: {
    defaultTitle: 'Our years',
    photos: (n) => (n === 1 ? '1 photo' : `${n} photos`),
    madeWith: 'Made with Inbunden',
    copySuffix: '(copy)',
  },
  sv: {
    defaultTitle: 'Våra år',
    photos: (n) => (n === 1 ? '1 foto' : `${n} foton`),
    madeWith: 'Skapad med Inbunden',
    copySuffix: '(kopia)',
  },
};

export function bookText(lang: Lang = DEFAULT_LANG): BookText {
  return BOOK_TEXT[lang] ?? BOOK_TEXT.en;
}

/** True when a title is still one generated from a default ("Our years", "Våra år · 2021–2024"). */
export function isDefaultTitle(title: string): boolean {
  return LANGS.some((l) => {
    const d = BOOK_TEXT[l].defaultTitle;
    return title === d || title.startsWith(`${d} · `);
  });
}
