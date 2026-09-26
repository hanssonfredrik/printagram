/**
 * Shared domain types used by the SPA (app/), the API (api/) and tests.
 * Keep this file free of runtime dependencies.
 */

import type { BookLayout, PageSpec } from './layout.js';
import type { Lang } from './i18n.js';

export type PhotoSource = 'instagram' | 'export';

export type BookFormat = 'square' | 'portrait';

export type AuthLevel = 'anonymous' | 'email' | 'password';

export type LibraryStatus = 'importing' | 'ready' | 'expired' | 'deleting';

export type BookStatus = 'draft' | 'ordered';

export type OrderStatus = 'created' | 'paid' | 'ready' | 'failed' | 'expired' | 'refunded';

export type ImportJobStatus = 'running' | 'done' | 'failed';

export type PaymentProviderName = 'fake' | 'stripe';

/** Test cards understood by the fake payment provider (same numbers as Stripe's test mode). */
export interface TestCard {
  number: string;
  label: string;
  outcome: 'succeeded' | 'card_declined' | 'insufficient_funds';
}

export type PromoType = 'percent' | 'fixed';

export interface Photo {
  id: string;
  /** Stable id of the Instagram post this photo belongs to. */
  postId: string;
  source: PhotoSource;
  /** ISO 8601 instant when the post was created. */
  takenAt: string;
  year: number;
  /** 0-based month. */
  month: number;
  caption: string;
  likes: number | null;
  isVideo: boolean;
  carouselIdx: number;
  carouselCount: number;
  width: number | null;
  height: number | null;
  /** image/jpeg, image/png or image/webp (null for photos imported before this was stored). */
  mime: string | null;
  /** Relative blob path (orig/...jpg), a full URL, or an object URL in mock mode. */
  origUrl: string;
  thumbUrl: string;
  status: 'pending' | 'ready' | 'missing';
}

export interface LibrarySummary {
  id: string;
  source: PhotoSource;
  status: LibraryStatus;
  photoCount: number;
  /** Username for Instagram libraries, file name for exports. */
  sourceLabel: string;
  importedAt: string;
  lastImportAt: string;
  /** Newest post timestamp seen so far; used for incremental imports. */
  newestMediaAt: string | null;
  keptUntil: string;
  hasLikes: boolean;
  instagramConnected: boolean;
}

export interface BookSettings {
  title: string;
  format: BookFormat;
  showMeta: boolean;
  coverPhotoId: string | null;
  layout: BookLayout;
  /** Language of the text printed in the book (dates, title page, back cover). */
  lang: Lang;
}

export interface Book extends BookSettings {
  id: string;
  libraryId: string;
  status: BookStatus;
  /** Content pages in print order (cover, title and back are implicit). */
  pages: PageSpec[];
  /** True once the user arranged pages by hand (auto-layout no longer rearranges them). */
  manualLayout: boolean;
  /** All photos in print order (derived from pages). */
  photoIds: string[];
  pageCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  orderId: string | null;
}

export interface Order {
  id: string;
  bookId: string;
  libraryId: string;
  status: OrderStatus;
  title: string;
  format: BookFormat;
  pageCount: number;
  photoCount: number;
  /** Price before discount. */
  subtotalCents: number;
  discountCents: number;
  promoCode: string | null;
  /** What the customer pays: subtotal − discount (never below 0). */
  amountCents: number;
  currency: 'eur';
  paymentProvider: PaymentProviderName;
  /** Last payment failure shown to the user (e.g. card declined); cleared on success. */
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  readyAt: string | null;
  pdfVersion: number;
  pdfBytes: number | null;
  shareToken: string | null;
  coverThumbUrl: string | null;
}

export interface UserInfo {
  id: string;
  email: string | null;
  authLevel: AuthLevel;
  /** Last UI language seen from this user; emails are sent in it. */
  lang: Lang;
}

export interface PricingConfig {
  baseCents: number;
  currency: 'eur';
  /** "From" prices shown for printed books (not orderable yet). */
  printedFrom: { softcoverCents: number; hardcoverCents: number };
}

export interface AppConfig {
  connectEnabled: boolean;
  printedBooksEnabled: boolean;
  pricing: PricingConfig;
  limits: {
    maxPhotosPerBook: number;
    maxPhotosPerLibrary: number;
    maxExportBytes: number;
  };
  payment: {
    provider: PaymentProviderName;
    stripePublishableKey: string | null;
    /** Only for the fake provider. */
    testCards: TestCard[];
  };
  print: { bleedMm: number };
}

export interface PromoResult {
  order: Order;
  /** Present when the code was rejected; the order is returned unchanged. */
  rejected?: { code: string; reason: string };
}

export interface ApiError {
  error: { code: string; message: string };
}

export type ConnectError = 'personal' | 'denied' | 'expired' | 'unknown';

export type UploadErrorKind = 'html' | 'empty' | 'corrupt' | 'large' | 'unsupported' | 'generic';
