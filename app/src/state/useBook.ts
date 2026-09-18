import { useEffect, useMemo } from 'react';
import type { Photo } from '@printagram/shared';
import { buildPages, fmtSpan, pageCount, price, type Page } from '@printagram/shared';
import { chosenPhotos, useDraft, visiblePhotos } from './draft';
import { useLibrary } from './library';
import { useConfig, useSession } from './session';
import { useDemo } from './demo';

export interface BookView {
  ready: boolean;
  photos: Photo[];
  chosen: Photo[];
  cover: Photo | null;
  pages: Page[];
  total: number;
  priceCents: number;
  dateSpan: string;
  hasLikes: boolean;
  libraryId: string | null;
}

/** Derives everything the Preview/Checkout/Done screens need from the draft + loaded library. */
export function useBook(): BookView {
  const d = useDraft();
  const lib = useLibrary();
  const cfg = useConfig();
  const libraries = useSession((x) => x.libraries);
  const demoEmpty = useDemo((x) => x.empty);
  const targetId = d.libraryId ?? libraries[0]?.id ?? null;

  useEffect(() => {
    if (targetId && (lib.libraryId !== targetId || lib.photos.length === 0) && !lib.loading)
      void lib.load(targetId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const photos = useMemo(() => (demoEmpty ? [] : lib.photos), [demoEmpty, lib.photos]);
  const hasLikes = lib.library?.hasLikes ?? d.source === 'connect';

  return useMemo(() => {
    const visible = visiblePhotos(
      photos,
      {
        photosOnly: d.photosOnly,
        favsOnly: d.favsOnly,
        carouselAll: d.carouselAll,
        rangeFrom: d.rangeFrom,
        rangeTo: d.rangeTo,
      },
      hasLikes,
    );
    const chosen = chosenPhotos(visible, d.mode, d.selected);
    const cover = chosen.find((p) => p.id === d.coverPhotoId) ?? chosen[0] ?? null;
    const pages = buildPages({ photos: chosen, format: d.format });
    const total = pageCount(chosen.length, d.format);
    const first = chosen[0];
    const last = chosen[chosen.length - 1];
    return {
      ready: !lib.loading && (photos.length > 0 || lib.libraryId === targetId),
      photos,
      chosen,
      cover,
      pages,
      total,
      priceCents: price(total, cfg.pricing).totalCents,
      dateSpan: first && last ? fmtSpan(first.takenAt, last.takenAt) : '',
      hasLikes,
      libraryId: targetId,
    };
  }, [
    photos,
    d.photosOnly,
    d.favsOnly,
    d.carouselAll,
    d.rangeFrom,
    d.rangeTo,
    d.mode,
    d.selected,
    d.coverPhotoId,
    d.format,
    hasLikes,
    lib.loading,
    lib.libraryId,
    targetId,
    cfg.pricing,
  ]);
}
