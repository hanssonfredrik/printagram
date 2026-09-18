import type { BookFormat, Photo } from './types.js';
import { photosPerPage } from './pricing.js';

/** Physical page sizes in millimetres. */
export const PAGE_SIZES_MM: Record<BookFormat, { width: number; height: number }> = {
  square: { width: 210, height: 210 },
  portrait: { width: 210, height: 280 },
};

export const PAGE_MARGIN_MM = 12;
export const PHOTO_GAP_MM = 6;
export const CAPTION_HEIGHT_MM = 7;
/** Reserved for future printed books: Gelato wants 4 mm, Peecho adds its own. */
export const DEFAULT_BLEED_MM = 0;

export const MM_TO_PT = 72 / 25.4;

export type Page =
  | { type: 'cover'; index: 0 }
  | { type: 'title'; index: 1 }
  | { type: 'photos'; index: number; photos: Photo[] }
  | { type: 'back'; index: number };

export interface BookLayoutInput {
  photos: Photo[];
  format: BookFormat;
}

/** Builds the page list used by both the DOM preview and the PDF worker. */
export function buildPages({ photos, format }: BookLayoutInput): Page[] {
  const per = photosPerPage(format);
  const pages: Page[] = [
    { type: 'cover', index: 0 },
    { type: 'title', index: 1 },
  ];
  for (let i = 0; i < photos.length; i += per) {
    pages.push({ type: 'photos', index: pages.length, photos: photos.slice(i, i + per) });
  }
  pages.push({ type: 'back', index: pages.length });
  return pages;
}

export function pageLabel(page: Page, total: number): string {
  if (page.type === 'cover') return 'Cover';
  if (page.type === 'back') return 'Back cover';
  return `Page ${page.index} of ${total - 2}`;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the photo slots (in mm, origin top-left) on a photo page.
 * Square: two slots stacked vertically. Portrait: one slot.
 * When captions are shown, each slot reserves CAPTION_HEIGHT_MM below the image.
 */
export function photoSlots(
  format: BookFormat,
  count: number,
  showMeta: boolean,
  bleedMm = DEFAULT_BLEED_MM,
): { image: Rect; caption: Rect | null }[] {
  const size = PAGE_SIZES_MM[format];
  const inner = {
    x: PAGE_MARGIN_MM + bleedMm,
    y: PAGE_MARGIN_MM + bleedMm,
    width: size.width - 2 * PAGE_MARGIN_MM,
    height: size.height - 2 * PAGE_MARGIN_MM,
  };
  const per = photosPerPage(format);
  const slotsCount = Math.max(1, Math.min(per, count || per));
  const slotHeight = (inner.height - PHOTO_GAP_MM * (per - 1)) / per;
  const captionH = showMeta ? CAPTION_HEIGHT_MM : 0;
  const out: { image: Rect; caption: Rect | null }[] = [];
  for (let i = 0; i < slotsCount; i++) {
    const top = inner.y + i * (slotHeight + PHOTO_GAP_MM);
    out.push({
      image: { x: inner.x, y: top, width: inner.width, height: slotHeight - captionH },
      caption: showMeta
        ? { x: inner.x, y: top + slotHeight - captionH, width: inner.width, height: captionH }
        : null,
    });
  }
  return out;
}

/**
 * object-fit: cover crop for an image of (iw × ih) into a slot (sw × sh).
 * Returns the source crop rectangle in image pixels.
 */
export function coverCrop(
  iw: number,
  ih: number,
  sw: number,
  sh: number,
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  const scale = Math.max(sw / iw, sh / ih);
  const sWidth = sw / scale;
  const sHeight = sh / scale;
  return { sx: (iw - sWidth) / 2, sy: (ih - sHeight) / 2, sWidth, sHeight };
}

/** Cover slot: full-bleed image area above a title band. */
export function coverLayout(format: BookFormat): { image: Rect; title: Rect } {
  const size = PAGE_SIZES_MM[format];
  const bandH = 22;
  const m = PAGE_MARGIN_MM;
  return {
    image: { x: m, y: m, width: size.width - 2 * m, height: size.height - 2 * m - bandH },
    title: { x: m, y: size.height - m - bandH, width: size.width - 2 * m, height: bandH },
  };
}
