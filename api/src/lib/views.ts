import type {
  Book,
  BookLayout,
  LayoutDensity,
  LibrarySummary,
  Order,
  PageSpec,
  Photo,
} from '@printagram/shared';
import { DEFAULT_LAYOUT, legacyPages, totalPages } from '@printagram/shared';
import type { BookRow, LibraryRow, OrderRow, PhotoRow } from './tables.js';

export function libraryView(l: LibraryRow): LibrarySummary {
  return {
    id: l.libraryId,
    source: l.source,
    status: l.status,
    photoCount: l.photoCount,
    sourceLabel: l.sourceLabel,
    importedAt: l.importedAt,
    lastImportAt: l.lastImportAt,
    newestMediaAt: l.newestMediaAt,
    keptUntil: l.expiresAt,
    hasLikes: l.source === 'instagram',
    instagramConnected: l.igConnected && !l.igTokenInvalid,
  };
}

export function photoView(p: PhotoRow): Photo {
  return {
    id: p.photoId,
    postId: p.postId,
    source: p.source,
    takenAt: p.takenAt,
    year: p.year,
    month: p.month,
    caption: p.caption,
    likes: p.likes,
    isVideo: p.isVideo,
    carouselIdx: p.carouselIdx,
    carouselCount: p.carouselCount,
    width: p.width,
    height: p.height,
    mime: p.mime ?? null,
    origUrl: p.origBlob,
    thumbUrl: p.thumbBlob,
    status: p.status,
  };
}

export function bookView(b: BookRow): Book {
  return {
    id: b.bookId,
    libraryId: b.libraryId,
    status: b.status,
    title: b.title,
    format: b.format,
    showMeta: b.showMeta,
    coverPhotoId: b.coverPhotoId,
    layout: normalizeLayout(b.layout),
    pages: bookPages(b),
    manualLayout: !!b.manualLayout,
    photoIds: b.photoIds,
    pageCount: totalPages(bookPages(b)),
    version: b.version,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    orderId: b.orderId,
  };
}

export function orderView(o: OrderRow, coverThumbUrl: string | null = null): Order {
  return {
    id: o.orderId,
    bookId: o.bookId,
    libraryId: o.libraryId,
    status: o.status,
    title: o.title,
    format: o.format,
    pageCount: o.pageCount,
    photoCount: o.photoCount,
    subtotalCents: o.subtotalCents ?? o.amountCents,
    discountCents: o.discountCents ?? 0,
    promoCode: o.promoCode ?? null,
    amountCents: o.amountCents,
    currency: o.currency,
    paymentProvider: o.paymentProvider ?? 'fake',
    failureReason: o.failureReason ?? null,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    readyAt: o.readyAt,
    pdfVersion: o.pdfVersion,
    pdfBytes: o.pdfBytes,
    shareToken: o.shareToken,
    coverThumbUrl,
  };
}

const DENSITIES: readonly LayoutDensity[] = ['1', '2', '3', '4', 'auto'];

export function normalizeLayout(l: unknown): BookLayout {
  const v = (l ?? {}) as Partial<BookLayout>;
  return {
    density: v.density && DENSITIES.includes(v.density) ? v.density : DEFAULT_LAYOUT.density,
    fullBleed: v.fullBleed === true,
  };
}

/** Pages of a stored book or order; rows saved before page layouts existed get the old layout. */
export function bookPages(b: {
  pages?: PageSpec[] | null;
  photoIds: string[];
  format: Book['format'];
}): PageSpec[] {
  if (Array.isArray(b.pages) && b.pages.length > 0) return b.pages;
  const stub = b.photoIds.map((id) => ({ id, width: null, height: null }) as unknown as Photo);
  return legacyPages(stub, b.format);
}
