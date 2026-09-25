import type { Book, LibrarySummary, Order, Photo } from '@printagram/shared';
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
    photoIds: b.photoIds,
    pageCount: b.pageCount,
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
