import type {
  AppConfig,
  Book,
  BookSettings,
  LibrarySummary,
  Order,
  Photo,
  UserInfo,
} from '@printagram/shared';

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface RegisterItem {
  key: string;
  postKey: string;
  takenAt: string;
  caption: string;
  isVideo: boolean;
  carouselIdx: number;
  carouselCount: number;
  width: number | null;
  height: number | null;
  bytes: number;
}

export interface RegisterResult {
  key: string;
  photoId: string;
  skipped: boolean;
  origPutUrl: string | null;
  thumbPutUrl: string | null;
}

export interface ImportProgress {
  status: 'running' | 'done' | 'failed';
  processed: number;
  skipped: number;
  failed: number;
  total: number | null;
  more: boolean;
  error?: string;
}

export interface InstagramStatus {
  connected: boolean;
  username: string | null;
  libraryId: string | null;
  tokenExpiresAt: string | null;
}

export interface OrderCreateResult {
  order: Order;
  clientSecret: string | null;
  mock: boolean;
}

export interface PdfUploadTarget {
  version: number;
  putUrl: string;
  photos: Photo[];
  book: BookSettings & { photoCount: number; pageCount: number };
}

export interface ShareInfo {
  title: string;
  pages: number;
  bytes: number | null;
  format: string;
  downloadUrl: string;
}

export interface MeResult {
  user: UserInfo;
  libraries: LibrarySummary[];
}

/**
 * Everything the SPA needs from a backend. Implemented twice:
 *  - api.mock.ts: in-memory, zero dependencies, seeded demo data
 *  - api.real.ts: fetch() against /api served by Azure Static Web Apps
 */
export interface Api {
  readonly mode: 'mock' | 'real';

  getConfig(): Promise<AppConfig>;
  ensureSession(): Promise<MeResult>;
  me(): Promise<MeResult | null>;

  register(email: string, password: string): Promise<UserInfo>;
  login(email: string, password: string, mergeFrom?: boolean): Promise<UserInfo>;
  logout(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<UserInfo>;
  sendReturnLink(email: string, resumeTo: string): Promise<void>;
  consumeMagicLink(token: string): Promise<{ user: UserInfo; resumeTo: string }>;
  sendExportSteps(email: string): Promise<void>;
  deleteAccount(): Promise<void>;

  listLibraries(): Promise<LibrarySummary[]>;
  getLibrary(id: string): Promise<LibrarySummary>;
  listPhotos(libraryId: string): Promise<Photo[]>;
  deleteLibrary(id: string): Promise<void>;
  createExportLibrary(fileName: string): Promise<LibrarySummary>;
  registerPhotos(
    libraryId: string,
    items: RegisterItem[],
    incremental: boolean,
  ): Promise<RegisterResult[]>;
  uploadPhotoBlobs(
    libraryId: string,
    target: RegisterResult,
    orig: Blob,
    thumb: Blob,
  ): Promise<void>;
  confirmPhotos(libraryId: string, photoIds: string[]): Promise<void>;
  completeImport(libraryId: string, fileName?: string): Promise<LibrarySummary>;

  instagramStartUrl(): Promise<string>;
  instagramStatus(): Promise<InstagramStatus>;
  startInstagramImport(libraryId: string): Promise<{ jobId: string; libraryId: string }>;
  runInstagramImport(jobId: string): Promise<ImportProgress>;
  disconnectInstagram(): Promise<void>;

  listBooks(): Promise<Book[]>;
  saveDraft(input: {
    id?: string | null;
    libraryId: string;
    settings: BookSettings;
    photoIds: string[];
  }): Promise<Book>;
  getBook(id: string): Promise<Book>;
  duplicateBook(id: string): Promise<Book>;
  deleteBook(id: string): Promise<void>;

  createOrder(bookId: string): Promise<OrderCreateResult>;
  getOrder(id: string): Promise<Order>;
  syncOrder(id: string): Promise<Order>;
  mockPay(id: string, outcome: 'ok' | 'fail'): Promise<Order>;
  listOrders(): Promise<Order[]>;
  getPdfUploadTarget(orderId: string, regenerate?: boolean): Promise<PdfUploadTarget>;
  uploadPdf(
    target: PdfUploadTarget,
    pdf: Uint8Array,
    onProgress?: (pct: number) => void,
  ): Promise<void>;
  completePdf(orderId: string, version: number, bytes: number, pages: number): Promise<Order>;
  downloadUrl(orderId: string): Promise<string>;
  getShare(token: string): Promise<ShareInfo>;
}
