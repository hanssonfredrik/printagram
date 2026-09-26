import { useEffect, useMemo } from 'react';
import type { BookLayout, PageSpec, Photo } from '@printagram/shared';
import {
  autoLayout,
  buildPages,
  flattenPhotoIds,
  pdfPriceCents,
  photoSpan,
  reconcilePages,
  totalPages,
  type Page,
} from '@printagram/shared';
import { api } from '@/services';
import { chosenPhotos, useDraft, visiblePhotos } from './draft';
import { useLibrary } from './library';
import { useConfig, useSession } from './session';

export interface BookView {
  ready: boolean;
  /** All photos of the library (for pickers). */
  photos: Photo[];
  /** Photos in the book, in print order. */
  chosen: Photo[];
  photosById: Map<string, Photo>;
  cover: Photo | null;
  /** Content pages (what the user arranges). */
  content: PageSpec[];
  /** Full sequence including cover, title page and back cover. */
  pages: Page[];
  total: number;
  priceCents: number;
  dateSpan: string;
  hasLikes: boolean;
  libraryId: string | null;
  manual: boolean;
  layout: BookLayout;
}

/** Derives everything Preview/Checkout/Done need from the draft + the loaded library. */
export function useBook(): BookView {
  const d = useDraft();
  const lib = useLibrary();
  const cfg = useConfig();
  const libraries = useSession((x) => x.libraries);
  const targetId = d.libraryId ?? libraries[0]?.id ?? null;

  useEffect(() => {
    if (targetId && (lib.libraryId !== targetId || lib.photos.length === 0) && !lib.loading)
      void lib.load(targetId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const photos = lib.photos;
  const hasLikes = lib.library?.hasLikes ?? d.source === 'connect';

  return useMemo(() => {
    const visible = visiblePhotos(
      photos,
      {
        favsOnly: d.favsOnly,
        carouselAll: d.carouselAll,
        rangeFrom: d.rangeFrom,
        rangeTo: d.rangeTo,
      },
      hasLikes,
    );
    // Videos cannot be printed, whatever the grid filter shows.
    const selected = chosenPhotos(visible, d.mode, d.selected).filter((p) => !p.isVideo);
    const opts = { ...d.layout, format: d.format, showMeta: d.showMeta };
    const content = d.manualPages
      ? reconcilePages(d.manualPages, selected, opts)
      : autoLayout(selected, opts);
    const photosById = new Map(photos.map((p) => [p.id, p]));
    const chosen = flattenPhotoIds(content)
      .map((id) => photosById.get(id))
      .filter((p): p is Photo => !!p);
    const cover = chosen.find((p) => p.id === d.coverPhotoId) ?? chosen[0] ?? null;
    const total = totalPages(content);
    return {
      ready: !lib.loading && (photos.length > 0 || lib.libraryId === targetId),
      photos,
      chosen,
      photosById,
      cover,
      content,
      pages: buildPages(content),
      total,
      priceCents: pdfPriceCents(cfg.pricing),
      dateSpan: photoSpan(chosen),
      hasLikes,
      libraryId: targetId,
      manual: !!d.manualPages,
      layout: d.layout,
    };
  }, [
    photos,
    d.favsOnly,
    d.carouselAll,
    d.rangeFrom,
    d.rangeTo,
    d.mode,
    d.selected,
    d.coverPhotoId,
    d.format,
    d.showMeta,
    d.layout,
    d.manualPages,
    hasLikes,
    lib.loading,
    lib.libraryId,
    targetId,
    cfg.pricing,
  ]);
}

/** Saves the current draft (creating it the first time) and remembers its id. */
export async function saveCurrentDraft(book: BookView): Promise<string> {
  const d = useDraft.getState();
  if (!book.libraryId) throw new Error('No photo library selected.');
  const saved = await api.saveDraft({
    id: d.draftBookId,
    libraryId: book.libraryId,
    settings: {
      title: d.title,
      format: d.format,
      showMeta: d.showMeta,
      coverPhotoId: book.cover?.id ?? null,
      layout: d.layout,
    },
    pages: book.content,
    manualLayout: book.manual,
  });
  d.setBook({ draftBookId: saved.id });
  return saved.id;
}
