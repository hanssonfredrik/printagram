import type { BookRow, LibraryRow, OrderRow, UserRow } from '../core.js';

/**
 * What the admin UI may see. Never passwordHash, TOTP secrets, access tokens, share tokens or
 * blob paths: each view lists its fields explicitly.
 */

export function userView(u: UserRow) {
  return {
    id: u.userId,
    email: u.email,
    authLevel: u.authLevel,
    status: u.status,
    lang: u.lang ?? null,
    createdAt: u.createdAt,
    lastSeenAt: u.lastSeenAt,
    isAdmin: u.isAdmin === true,
    mfaEnrolled: !!u.adminTotpSecret,
    hasPassword: !!u.passwordHash,
  };
}

export function libraryView(l: LibraryRow) {
  return {
    id: l.libraryId,
    source: l.source,
    status: l.status,
    photoCount: l.photoCount,
    sourceLabel: l.sourceLabel,
    importedAt: l.importedAt,
    lastImportAt: l.lastImportAt,
    expiresAt: l.expiresAt,
    igConnected: l.igConnected,
    igUsername: l.igUsername,
  };
}

export function bookView(b: BookRow) {
  return {
    id: b.bookId,
    title: b.title,
    format: b.format,
    status: b.status,
    pageCount: b.pageCount,
    photoCount: b.photoIds.length,
    libraryId: b.libraryId,
    orderId: b.orderId,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export type OrderLike = Omit<OrderRow, 'layout' | 'pages' | 'photoIds'>;

export function orderView(o: OrderLike, email?: string | null) {
  return {
    id: o.orderId,
    userId: o.userId,
    email: email ?? null,
    title: o.title,
    format: o.format,
    status: o.status,
    pageCount: o.pageCount,
    photoCount: o.photoCount,
    subtotalCents: o.subtotalCents,
    discountCents: o.discountCents,
    promoCode: o.promoCode,
    amountCents: o.amountCents,
    currency: o.currency,
    paymentProvider: o.paymentProvider,
    stripePaymentIntentId: o.stripePaymentIntentId,
    failureReason: o.failureReason,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    readyAt: o.readyAt,
    pdfVersion: o.pdfVersion,
    pdfBytes: o.pdfBytes,
    pdfPages: o.pdfPages,
    hasPdf: !!o.pdfBlob,
    shared: !!o.shareToken,
  };
}
