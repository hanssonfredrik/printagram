import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book, BookFormat, BookLayout, Lang, PageSpec, Photo } from '@printagram/shared';
import { bookText, DEFAULT_LAYOUT, isDefaultTitle, monthKey } from '@printagram/shared';
import { getLang } from '@/i18n';

export type AccountKind = 'pro' | 'personal' | 'unsure';
/**
 * Which path the user is on. 'connect' = Instagram login, 'export' = uploaded ZIP,
 * 'library' = working from photos already imported (My books).
 */
export type FlowSource = 'connect' | 'export' | 'library';
export type SelectMode = 'all' | 'choose';

export interface DraftState {
  // Flow
  source: FlowSource | null;
  adding: boolean;
  acct: AccountKind;
  guideTab: 'mobile' | 'desktop';
  email: string;
  returnSentTo: string | null;

  // Library in use
  libraryId: string | null;

  // Selection
  mode: SelectMode;
  selected: string[];
  favsOnly: boolean;
  carouselAll: boolean;
  rangeFrom: string | null;
  rangeTo: string | null;

  // Book
  draftBookId: string | null;
  title: string;
  format: BookFormat;
  showMeta: boolean;
  coverPhotoId: string | null;
  /** Language printed in the book. New books take the UI language; changing it is explicit. */
  lang: Lang;
  pageIdx: number;
  layout: BookLayout;
  /** Pages as arranged by hand; null while the layout is automatic. */
  manualPages: PageSpec[] | null;

  // Order
  lastOrderId: string | null;

  // Actions
  setSource: (s: FlowSource | null) => void;
  setAdding: (v: boolean) => void;
  setAcct: (a: AccountKind) => void;
  setGuideTab: (t: 'mobile' | 'desktop') => void;
  setEmail: (e: string) => void;
  setReturnSentTo: (e: string | null) => void;
  startLibrary: (libraryId: string, photos: Photo[], opts?: { keepSelection?: boolean }) => void;
  setMode: (m: SelectMode, visibleIds?: string[]) => void;
  toggleIds: (ids: string[], on: boolean) => void;
  setFilter: (
    patch: Partial<Pick<DraftState, 'favsOnly' | 'carouselAll' | 'rangeFrom' | 'rangeTo'>>,
  ) => void;
  setBook: (
    patch: Partial<
      Pick<DraftState, 'title' | 'format' | 'showMeta' | 'coverPhotoId' | 'draftBookId'>
    >,
  ) => void;
  /** Changes the book language; a still-default title follows it ("Our years" → "Våra år"). */
  setBookLang: (lang: Lang) => void;
  setPageIdx: (i: number) => void;
  setLayout: (patch: Partial<BookLayout>) => void;
  /** Stores a hand-made arrangement (from Arrange / template picker). */
  setManualPages: (pages: PageSpec[]) => void;
  /** Drops the hand-made arrangement and goes back to the automatic layout. */
  resetLayout: () => void;
  /** Restores a saved draft exactly: selection, filters, pages and settings. */
  openBook: (book: Book, libraryPhotos: Photo[]) => void;
  setLastOrderId: (id: string | null) => void;
  resetForNewBook: (title?: string) => void;
  resetAll: () => void;
}

/** English default title; the title for a book comes from `defaultTitleFor`. */
export const DEFAULT_TITLE = bookText('en').defaultTitle;

/** "Our years · 2021–2024" in the given language, from the years the photos span. */
export function defaultTitleFor(lang: Lang, photos: { year: number }[]): string {
  const base = bookText(lang).defaultTitle;
  const years = [...new Set(photos.map((p) => p.year))].sort();
  if (years.length === 0) return base;
  if (years.length === 1) return `${base} · ${years[0]}`;
  return `${base} · ${years[0]}–${years[years.length - 1]}`;
}

const initial = {
  source: null,
  adding: false,
  acct: 'pro' as AccountKind,
  guideTab: 'mobile' as const,
  email: '',
  returnSentTo: null,
  libraryId: null,
  mode: 'all' as SelectMode,
  selected: [],
  favsOnly: false,
  carouselAll: true,
  rangeFrom: null,
  rangeTo: null,
  draftBookId: null,
  title: DEFAULT_TITLE,
  format: 'square' as BookFormat,
  showMeta: true,
  coverPhotoId: null,
  lang: 'en' as Lang,
  pageIdx: 0,
  layout: DEFAULT_LAYOUT,
  manualPages: null as PageSpec[] | null,
  lastOrderId: null,
};

export const useDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      ...initial,
      lang: getLang(),

      setSource: (source) => set({ source }),
      setAdding: (adding) => set({ adding }),
      setAcct: (acct) => set({ acct }),
      setGuideTab: (guideTab) => set({ guideTab }),
      setEmail: (email) => set({ email }),
      setReturnSentTo: (returnSentTo) => set({ returnSentTo }),

      startLibrary(libraryId, photos, opts) {
        const keys = [...new Set(photos.map((p) => monthKey(p.year, p.month)))].sort();
        const sameLib = get().libraryId === libraryId;
        const keep = sameLib && opts?.keepSelection;
        // A new book is in the UI language; kept work keeps its own.
        const lang = keep ? get().lang : getLang();
        const title = defaultTitleFor(lang, photos);
        set({
          libraryId,
          rangeFrom: keys[0] ?? null,
          rangeTo: keys[keys.length - 1] ?? null,
          ...(keep
            ? {}
            : {
                mode: 'all',
                selected: [],
                coverPhotoId: null,
                pageIdx: 0,
                draftBookId: null,
                manualPages: null,
                lang,
                title: isDefaultTitle(get().title) || !sameLib ? title : get().title,
              }),
        });
      },

      setMode(mode, visibleIds) {
        if (mode === 'choose' && visibleIds) set({ mode, selected: visibleIds });
        else set({ mode });
      },

      toggleIds(ids, on) {
        const sel = new Set(get().selected);
        for (const id of ids) {
          if (on) sel.add(id);
          else sel.delete(id);
        }
        set({ selected: [...sel], mode: 'choose' });
      },

      setFilter(patch) {
        set(patch);
      },

      setBook(patch) {
        set(patch);
      },

      setBookLang(lang) {
        const { title, lang: from } = get();
        if (lang === from) return;
        const fromBase = bookText(from).defaultTitle;
        const toBase = bookText(lang).defaultTitle;
        set({
          lang,
          title:
            isDefaultTitle(title) && title.startsWith(fromBase)
              ? toBase + title.slice(fromBase.length)
              : title,
        });
      },

      setPageIdx: (pageIdx) => set({ pageIdx }),
      setLayout: (patch) => set({ layout: { ...get().layout, ...patch } }),
      setManualPages: (manualPages) => set({ manualPages }),
      resetLayout: () => set({ manualPages: null }),

      openBook(book, libraryPhotos) {
        const keys = [...new Set(libraryPhotos.map((p) => monthKey(p.year, p.month)))].sort();
        set({
          libraryId: book.libraryId,
          draftBookId: book.status === 'draft' ? book.id : null,
          title: book.title,
          format: book.format,
          showMeta: book.showMeta,
          coverPhotoId: book.coverPhotoId,
          lang: book.lang ?? 'en',
          layout: book.layout ?? DEFAULT_LAYOUT,
          manualPages: book.manualLayout ? book.pages : null,
          // Select exactly the book's photos, with filters wide enough to show all of them.
          mode: 'choose',
          selected: [...book.photoIds],
          favsOnly: false,
          carouselAll: true,
          rangeFrom: keys[0] ?? null,
          rangeTo: keys[keys.length - 1] ?? null,
          pageIdx: 0,
        });
      },
      setLastOrderId: (lastOrderId) => set({ lastOrderId }),

      resetForNewBook(title) {
        set({
          lang: getLang(),
          mode: 'all',
          selected: [],
          coverPhotoId: null,
          pageIdx: 0,
          draftBookId: null,
          manualPages: null,
          title: title ?? get().title,
          favsOnly: false,
          carouselAll: true,
        });
      },

      resetAll: () => set({ ...initial, lang: getLang() }),
    }),
    {
      name: 'printagram.draft.v2',
      // v1: videos are always hidden and carousels show all images by default.
      version: 1,
      migrate: (persisted) => {
        const { photosOnly: _photosOnly, ...rest } = (persisted ?? {}) as Record<string, unknown>;
        return { ...rest, carouselAll: true } as unknown as DraftState;
      },
    },
  ),
);

/** Likes threshold for "most liked": top quartile by like count. */
export function favThreshold(photos: Photo[]): number {
  const likes = photos
    .filter((p) => p.likes !== null)
    .map((p) => p.likes as number)
    .sort((a, b) => a - b);
  if (likes.length === 0) return Infinity;
  return likes[Math.floor(likes.length * 0.75)] ?? Infinity;
}

export interface Filters {
  favsOnly: boolean;
  carouselAll: boolean;
  rangeFrom: string | null;
  rangeTo: string | null;
}

export function visiblePhotos(photos: Photo[], f: Filters, hasLikes: boolean): Photo[] {
  const thr = f.favsOnly && hasLikes ? favThreshold(photos) : null;
  return photos.filter((p) => {
    const k = monthKey(p.year, p.month);
    if (f.rangeFrom && k < f.rangeFrom) return false;
    if (f.rangeTo && k > f.rangeTo) return false;
    // Videos can't be printed, so they are never offered.
    if (p.isVideo) return false;
    if (thr !== null && (p.likes ?? -1) < thr) return false;
    if (!f.carouselAll && p.carouselIdx !== 0) return false;
    return true;
  });
}

export function chosenPhotos(visible: Photo[], mode: SelectMode, selected: string[]): Photo[] {
  if (mode === 'all') return visible;
  const set = new Set(selected);
  return visible.filter((p) => set.has(p.id));
}
