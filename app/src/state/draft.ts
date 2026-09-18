import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookFormat, Photo } from '@printagram/shared';
import { monthKey } from '@printagram/shared';

export type AccountKind = 'pro' | 'personal' | 'unsure';
/** Which import path the user is on. 'connect' = Instagram login, 'export' = uploaded ZIP. */
export type FlowSource = 'connect' | 'export';
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
  photosOnly: boolean;
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
  pageIdx: number;

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
    patch: Partial<
      Pick<DraftState, 'photosOnly' | 'favsOnly' | 'carouselAll' | 'rangeFrom' | 'rangeTo'>
    >,
  ) => void;
  setBook: (
    patch: Partial<
      Pick<DraftState, 'title' | 'format' | 'showMeta' | 'coverPhotoId' | 'draftBookId'>
    >,
  ) => void;
  setPageIdx: (i: number) => void;
  setLastOrderId: (id: string | null) => void;
  resetForNewBook: (title?: string) => void;
  resetAll: () => void;
}

export const DEFAULT_TITLE = 'Our years';

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
  photosOnly: true,
  favsOnly: false,
  carouselAll: false,
  rangeFrom: null,
  rangeTo: null,
  draftBookId: null,
  title: DEFAULT_TITLE,
  format: 'square' as BookFormat,
  showMeta: true,
  coverPhotoId: null,
  pageIdx: 0,
  lastOrderId: null,
};

export const useDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      ...initial,

      setSource: (source) => set({ source }),
      setAdding: (adding) => set({ adding }),
      setAcct: (acct) => set({ acct }),
      setGuideTab: (guideTab) => set({ guideTab }),
      setEmail: (email) => set({ email }),
      setReturnSentTo: (returnSentTo) => set({ returnSentTo }),

      startLibrary(libraryId, photos, opts) {
        const keys = [...new Set(photos.map((p) => monthKey(p.year, p.month)))].sort();
        const sameLib = get().libraryId === libraryId;
        const years = [...new Set(photos.map((p) => p.year))].sort();
        const title =
          years.length === 0
            ? DEFAULT_TITLE
            : years.length === 1
              ? `${DEFAULT_TITLE} · ${years[0]}`
              : `${DEFAULT_TITLE} · ${years[0]}–${years[years.length - 1]}`;
        set({
          libraryId,
          rangeFrom: keys[0] ?? null,
          rangeTo: keys[keys.length - 1] ?? null,
          ...(sameLib && opts?.keepSelection
            ? {}
            : {
                mode: 'all',
                selected: [],
                coverPhotoId: null,
                pageIdx: 0,
                draftBookId: null,
                title: get().title === DEFAULT_TITLE || !sameLib ? title : get().title,
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

      setPageIdx: (pageIdx) => set({ pageIdx }),
      setLastOrderId: (lastOrderId) => set({ lastOrderId }),

      resetForNewBook(title) {
        set({
          mode: 'all',
          selected: [],
          coverPhotoId: null,
          pageIdx: 0,
          draftBookId: null,
          title: title ?? get().title,
          favsOnly: false,
        });
      },

      resetAll: () => set({ ...initial }),
    }),
    { name: 'printagram.draft.v1' },
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
  photosOnly: boolean;
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
    if (f.photosOnly && p.isVideo) return false;
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
