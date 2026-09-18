/**
 * Shared domain types used by the SPA (app/), the API (api/) and tests.
 * Keep this file free of runtime dependencies.
 */

export type PhotoSource = 'instagram' | 'export';

export type BookFormat = 'square' | 'portrait';

export type AuthLevel = 'anonymous' | 'email' | 'password';

export type LibraryStatus = 'importing' | 'ready' | 'expired' | 'deleting';

export type BookStatus = 'draft' | 'ordered';

export type OrderStatus = 'created' | 'paid' | 'ready' | 'failed' | 'expired' | 'refunded';

export type ImportJobStatus = 'running' | 'done' | 'failed';

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
}

export interface Book extends BookSettings {
  id: string;
  libraryId: string;
  status: BookStatus;
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
  status: OrderStatus;
  title: string;
  format: BookFormat;
  pageCount: number;
  photoCount: number;
  amountCents: number;
  currency: 'eur';
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
}

export interface PricingConfig {
  baseCents: number;
  includedPages: number;
  extraPageCents: number;
  currency: 'eur';
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
  stripePublishableKey: string | null;
  mockPayments: boolean;
}

export interface ApiError {
  error: { code: string; message: string };
}

export type ConnectError = 'personal' | 'denied' | 'expired' | 'unknown';

export type UploadErrorKind = 'html' | 'empty' | 'corrupt' | 'large' | 'generic';
