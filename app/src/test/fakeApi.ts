import type {
  AppConfig,
  Book,
  LibrarySummary,
  Order,
  Photo,
  PhotoSource,
  UserInfo,
} from '@printagram/shared';
import {
  addMonths,
  bookText,
  currencyForLang,
  DEFAULT_PRICING,
  MAX_EXPORT_BYTES,
  MAX_PHOTOS_PER_BOOK,
  MAX_PHOTOS_PER_LIBRARY,
  DEFAULT_LAYOUT,
  flattenPhotoIds,
  pdfPriceCents,
  totalPages,
  discountCents,
  normalizePromoCode,
  PROMO_MESSAGES,
  TEST_CARDS,
} from '@printagram/shared';
import {
  ApiClientError,
  type Api,
  type GoogleSession,
  type GoogleStatus,
  type ImportProgress,
  type InstagramStatus,
  type MeResult,
  type OrderCreateResult,
  type PdfUploadTarget,
  type RegisterResult,
  type ShareInfo,
} from '@/services/api';
import { useLang } from '@/i18n';
import { makeDemoPhotos } from './demoData';

/** Toggles driven by the dev-only Demo bar (mirrors the design prototype's demo controls). */
export interface MockFlags {
  connectMode: 'live' | 'coming-soon';
  googleMode: 'live' | 'off';
  connectOutcome: 'ok' | 'personal' | 'denied';
  emptyLibrary: boolean;
  payFails: boolean;
  latencyMs: number;
}

export const mockFlags: MockFlags = {
  connectMode: 'live',
  googleMode: 'live',
  connectOutcome: 'ok',
  emptyLibrary: false,
  payFails: false,
  latencyMs: 250,
};

interface MockState {
  user: UserInfo;
  password: string | null;
  libraries: LibrarySummary[];
  photosByLibrary: Record<string, Photo[]>;
  books: Book[];
  orders: Order[];
  pdfs: Record<string, string>; // orderId -> object URL
  instagram: { username: string; libraryId: string; expiresAt: string } | null;
  google: { libraryId: string; expiresAt: string; sessionId: string | null; polls: number } | null;
  importJobs: Record<string, { libraryId: string; total: number; processed: number }>;
  shares: Record<string, string>; // token -> orderId
}

const KEY = 'printagram.mock.v1';
const DEMO_USERNAME = 'mara.linde';

let seq = Date.now() % 100000;
const uid = (p: string) => `${p}_${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();
const sleep = (ms = mockFlags.latencyMs) => new Promise((r) => setTimeout(r, ms));

function freshUser(): UserInfo {
  return { id: uid('u'), email: null, authLevel: 'anonymous', lang: 'en' };
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockState;
      // Photos backed by blob: URLs do not survive a reload; drop those libraries' photos.
      for (const [lib, photos] of Object.entries(parsed.photosByLibrary)) {
        if (photos.some((p) => p.thumbUrl.startsWith('blob:'))) parsed.photosByLibrary[lib] = [];
      }
      parsed.pdfs = {};
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return {
    user: freshUser(),
    password: null,
    libraries: [],
    photosByLibrary: {},
    books: [],
    orders: [],
    pdfs: {},
    instagram: null,
    google: null,
    importJobs: {},
    shares: {},
  };
}

let state: MockState = load();

function save() {
  try {
    const { pdfs: _pdfs, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify({ ...rest, pdfs: {} }));
  } catch {
    /* quota or private mode */
  }
}

export function resetMockState() {
  state = {
    user: freshUser(),
    password: null,
    libraries: [],
    photosByLibrary: {},
    books: [],
    orders: [],
    pdfs: {},
    instagram: null,
    google: null,
    importJobs: {},
    shares: {},
  };
  save();
}

function lib(id: string): LibrarySummary {
  const l = state.libraries.find((x) => x.id === id);
  if (!l) throw new ApiClientError('NOT_FOUND', 'Library not found', 404);
  return l;
}

function extendKeptUntil(l: LibrarySummary) {
  const base = new Date(Math.max(Date.now(), new Date(l.keptUntil).getTime()));
  l.keptUntil = addMonths(base, 3).toISOString();
}

const MOCK_PROMOS: Record<string, { type: 'percent' | 'fixed'; value: number }> = {
  WELCOME100: { type: 'percent', value: 100 },
  TEST20: { type: 'percent', value: 20 },
};

function markMockPaid(o: Order): Order {
  o.status = 'paid';
  o.paidAt = nowIso();
  o.failureReason = null;
  const book = state.books.find((b) => b.id === o.bookId);
  if (book) {
    book.status = 'ordered';
    book.orderId = o.id;
    const l = state.libraries.find((x) => x.id === book.libraryId);
    if (l) extendKeptUntil(l);
  }
  save();
  return toOrderView(o);
}

function toOrderView(o: Order): Order {
  return { ...o };
}

function coverThumbFor(book: Book): string | null {
  const photos = state.photosByLibrary[book.libraryId] ?? [];
  const cover =
    photos.find((p) => p.id === book.coverPhotoId) ??
    photos.find((p) => book.photoIds.includes(p.id));
  return cover?.thumbUrl ?? null;
}

/** Creates a demo library populated with seeded photos (used by the Connect flow). */
function createDemoLibrary(source: PhotoSource, label: string): LibrarySummary {
  const id = uid('lib');
  // Google Photos brings the pictures only: no captions, likes or carousel grouping.
  const photos = mockFlags.emptyLibrary
    ? []
    : source === 'googlephotos'
      ? makeDemoPhotos('export').map((p) => ({
          ...p,
          source,
          postId: p.id,
          caption: '',
          likes: null,
          carouselIdx: 0,
          carouselCount: 1,
        }))
      : makeDemoPhotos(source);
  const newest = photos.reduce<string | null>(
    (acc, p) => (!acc || p.takenAt > acc ? p.takenAt : acc),
    null,
  );
  const l: LibrarySummary = {
    id,
    source,
    status: 'ready',
    photoCount: photos.filter((p) => !p.isVideo).length,
    sourceLabel: label,
    importedAt: nowIso(),
    lastImportAt: nowIso(),
    newestMediaAt: newest,
    keptUntil: addMonths(new Date(), 3).toISOString(),
    hasLikes: source === 'instagram',
    instagramConnected: source === 'instagram',
  };
  state.libraries = [l, ...state.libraries.filter((x) => x.source !== source)];
  state.photosByLibrary[id] = photos;
  save();
  return l;
}

/** Demo shortcut for the Upload screen: seeds an export library as if a ZIP had been imported. */
export function seedDemoExportLibrary(fileName: string, incremental: boolean): LibrarySummary {
  const existing = state.libraries.find((l) => l.source === 'export');
  const demo = mockFlags.emptyLibrary ? [] : makeDemoPhotos('export');
  if (existing && incremental) {
    const have = new Set((state.photosByLibrary[existing.id] ?? []).map((p) => p.id));
    const extra = demo.filter((p) => !have.has(p.id)).slice(0, 38);
    state.photosByLibrary[existing.id] = [...(state.photosByLibrary[existing.id] ?? []), ...extra];
    existing.photoCount = state.photosByLibrary[existing.id]!.filter((p) => !p.isVideo).length;
    existing.lastImportAt = nowIso();
    existing.sourceLabel = fileName;
    extendKeptUntil(existing);
    save();
    return existing;
  }
  const l = createDemoLibrary('export', fileName);
  return l;
}

export const mockApi: Api = {
  mode: 'mock',

  async getConfig(): Promise<AppConfig> {
    return {
      connectEnabled: mockFlags.connectMode === 'live',
      googlePhotosEnabled: mockFlags.googleMode === 'live',
      printedBooksEnabled: false,
      pricing: DEFAULT_PRICING,
      limits: {
        maxPhotosPerBook: MAX_PHOTOS_PER_BOOK,
        maxPhotosPerLibrary: MAX_PHOTOS_PER_LIBRARY,
        maxExportBytes: MAX_EXPORT_BYTES,
      },
      payment: {
        provider: 'fake',
        stripePublishableKey: null,
        testCards: TEST_CARDS,
      },
      print: { bleedMm: 4 },
    };
  },

  async ensureSession(): Promise<MeResult> {
    return { user: state.user, libraries: state.libraries };
  },

  async me(): Promise<MeResult | null> {
    return { user: state.user, libraries: state.libraries };
  },

  async register(email, password) {
    await sleep();
    if (password.length < 8)
      throw new ApiClientError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    if (state.user.email && state.user.email !== email.toLowerCase() && state.password) {
      throw new ApiClientError(
        'EMAIL_TAKEN',
        'That email already has an account. Sign in to continue.',
        409,
      );
    }
    state.user = { ...state.user, email: email.toLowerCase(), authLevel: 'password' };
    state.password = password;
    save();
    return state.user;
  },

  async login(email, password) {
    await sleep();
    if (!email.includes('@'))
      throw new ApiClientError('INVALID_CREDENTIALS', 'Please enter a valid email address.', 401);
    if (state.password && state.user.email === email.toLowerCase() && state.password !== password) {
      throw new ApiClientError('INVALID_CREDENTIALS', 'Wrong email or password.', 401);
    }
    state.user = { ...state.user, email: email.toLowerCase(), authLevel: 'password' };
    state.password = state.password ?? password;
    save();
    return state.user;
  },

  async logout() {
    state.user = freshUser();
    save();
  },

  async forgotPassword() {
    await sleep();
  },

  async resetPassword(_token, password) {
    await sleep();
    state.password = password;
    state.user = { ...state.user, authLevel: 'password' };
    save();
    return state.user;
  },

  async sendReturnLink(email) {
    await sleep();
    if (!state.user.email)
      state.user = { ...state.user, email: email.toLowerCase(), authLevel: 'email' };
    save();
  },

  async consumeMagicLink() {
    await sleep();
    return { user: state.user, resumeTo: '/export/upload' };
  },

  async sendExportSteps() {
    await sleep();
  },

  async deleteAccount() {
    resetMockState();
  },

  async listLibraries() {
    return state.libraries;
  },

  async getLibrary(id) {
    return lib(id);
  },

  async listPhotos(libraryId) {
    lib(libraryId);
    return mockFlags.emptyLibrary ? [] : (state.photosByLibrary[libraryId] ?? []);
  },

  async deleteLibrary(id) {
    await sleep();
    state.libraries = state.libraries.filter((l) => l.id !== id);
    delete state.photosByLibrary[id];
    state.books = state.books.filter((b) => b.libraryId !== id || b.status === 'ordered');
    if (state.instagram?.libraryId === id) state.instagram = null;
    if (state.google?.libraryId === id) state.google = null;
    save();
  },

  async createExportLibrary(fileName) {
    const existing = state.libraries.find((l) => l.source === 'export');
    if (existing) {
      existing.sourceLabel = fileName;
      existing.status = 'importing';
      save();
      return existing;
    }
    const l: LibrarySummary = {
      id: uid('lib'),
      source: 'export',
      status: 'importing',
      photoCount: 0,
      sourceLabel: fileName,
      importedAt: nowIso(),
      lastImportAt: nowIso(),
      newestMediaAt: null,
      keptUntil: addMonths(new Date(), 3).toISOString(),
      hasLikes: false,
      instagramConnected: false,
    };
    state.libraries = [l, ...state.libraries];
    state.photosByLibrary[l.id] = [];
    save();
    return l;
  },

  async registerPhotos(libraryId, items, incremental) {
    const l = lib(libraryId);
    const photos = state.photosByLibrary[libraryId] ?? (state.photosByLibrary[libraryId] = []);
    const results: RegisterResult[] = [];
    for (const it of items) {
      const photoId = it.key;
      const existing = photos.find((p) => p.id === photoId);
      const tooOld = incremental && l.newestMediaAt && it.takenAt <= l.newestMediaAt;
      if ((existing && existing.status === 'ready') || tooOld) {
        results.push({ key: it.key, photoId, skipped: true, origPutUrl: null, thumbPutUrl: null });
        continue;
      }
      const d = new Date(it.takenAt);
      const row: Photo = {
        id: photoId,
        postId: it.postKey,
        source: 'export',
        takenAt: it.takenAt,
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        caption: it.caption,
        likes: null,
        isVideo: it.isVideo,
        carouselIdx: it.carouselIdx,
        carouselCount: it.carouselCount,
        width: it.width,
        height: it.height,
        mime: it.mime,
        origUrl: '',
        thumbUrl: '',
        status: it.isVideo ? 'ready' : 'pending',
      };
      if (existing) Object.assign(existing, row);
      else photos.push(row);
      results.push({
        key: it.key,
        photoId,
        skipped: false,
        origPutUrl: 'mock:orig',
        thumbPutUrl: 'mock:thumb',
      });
    }
    return results;
  },

  async uploadPhotoBlobs(libraryId, target, orig, thumb) {
    const photos = state.photosByLibrary[libraryId] ?? [];
    const p = photos.find((x) => x.id === target.photoId);
    if (!p) return;
    p.origUrl = URL.createObjectURL(orig);
    p.thumbUrl = URL.createObjectURL(thumb);
  },

  async confirmPhotos(libraryId, refs) {
    const photos = state.photosByLibrary[libraryId] ?? [];
    const set = new Set(refs.map((r) => r.photoId));
    for (const p of photos) if (set.has(p.id)) p.status = 'ready';
  },

  async completeImport(libraryId, fileName) {
    const l = lib(libraryId);
    const photos = (state.photosByLibrary[libraryId] ?? []).filter((p) => p.status === 'ready');
    state.photosByLibrary[libraryId] = photos.sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1));
    l.status = 'ready';
    l.photoCount = photos.filter((p) => !p.isVideo).length;
    l.lastImportAt = nowIso();
    l.newestMediaAt = photos.reduce<string | null>(
      (acc, p) => (!acc || p.takenAt > acc ? p.takenAt : acc),
      null,
    );
    if (fileName) l.sourceLabel = fileName;
    extendKeptUntil(l);
    save();
    return l;
  },

  async instagramStartUrl() {
    if (mockFlags.connectMode !== 'live')
      throw new ApiClientError('CONNECT_DISABLED', 'Connect is not available yet.', 503);
    return 'mock://instagram-oauth';
  },

  async instagramStatus(): Promise<InstagramStatus> {
    return state.instagram
      ? {
          connected: true,
          username: state.instagram.username,
          libraryId: state.instagram.libraryId,
          tokenExpiresAt: state.instagram.expiresAt,
        }
      : { connected: false, username: null, libraryId: null, tokenExpiresAt: null };
  },

  async googleStartUrl() {
    if (mockFlags.googleMode !== 'live')
      throw new ApiClientError('GOOGLE_DISABLED', 'Google Photos is not available yet.', 503);
    return 'mock://google-oauth';
  },

  async googleStatus(): Promise<GoogleStatus> {
    return state.google
      ? {
          connected: true,
          libraryId: state.google.libraryId,
          tokenExpiresAt: state.google.expiresAt,
          sessionId: state.google.sessionId,
        }
      : { connected: false, libraryId: null, tokenExpiresAt: null, sessionId: null };
  },

  async createGoogleSession(): Promise<GoogleSession> {
    await sleep();
    // In mock mode the "OAuth" completed on the client; the library appears with the session.
    if (!state.google) {
      const l = createDemoLibrary('googlephotos', 'Google Photos');
      state.google = {
        libraryId: l.id,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        sessionId: null,
        polls: 0,
      };
    }
    state.google.sessionId = uid('picker');
    state.google.polls = 0;
    save();
    return {
      sessionId: state.google.sessionId,
      pickerUri: 'mock://google-photos-picker',
      pollIntervalMs: 20,
      libraryId: state.google.libraryId,
    };
  },

  async getGoogleSession() {
    await sleep(20);
    if (!state.google?.sessionId)
      throw new ApiClientError('NO_SESSION', 'Open the picker first.', 409);
    state.google.polls++;
    return {
      sessionId: state.google.sessionId,
      mediaItemsSet: state.google.polls >= 2,
      pollIntervalMs: 20,
    };
  },

  async disconnectGoogle() {
    await sleep();
    state.google = null;
    save();
  },

  async startImport(libraryId) {
    // In mock mode the "OAuth" completed on the client; create/refresh the Instagram library here.
    let l = state.libraries.find((x) => x.id === libraryId);
    if (!l) {
      l = createDemoLibrary('instagram', `@${DEMO_USERNAME}`);
      state.instagram = {
        username: DEMO_USERNAME,
        libraryId: l.id,
        expiresAt: addMonths(new Date(), 2).toISOString(),
      };
    }
    const jobId = uid('job');
    state.importJobs[jobId] = { libraryId: l.id, total: Math.max(1, l.photoCount), processed: 0 };
    save();
    return { jobId, libraryId: l.id };
  },

  async runImport(jobId): Promise<ImportProgress> {
    await sleep(170);
    const job = state.importJobs[jobId];
    if (!job) throw new ApiClientError('NOT_FOUND', 'Import job not found', 404);
    job.processed = Math.min(
      job.total,
      job.processed + Math.max(1, Math.round(job.total * (0.03 + Math.random() * 0.09))),
    );
    const done = job.processed >= job.total;
    if (done) {
      const l = lib(job.libraryId);
      l.lastImportAt = nowIso();
      extendKeptUntil(l);
      save();
    }
    return {
      status: done ? 'done' : 'running',
      processed: job.processed,
      skipped: 0,
      failed: 0,
      total: job.total,
      more: !done,
    };
  },

  async disconnectInstagram() {
    await sleep();
    state.instagram = null;
    for (const l of state.libraries) if (l.source === 'instagram') l.instagramConnected = false;
    save();
  },

  async listBooks() {
    return state.books.map((b) => ({ ...b }));
  },

  async saveDraft({ id, libraryId, settings, pages: content, manualLayout }) {
    let book = id ? state.books.find((b) => b.id === id) : undefined;
    if (book && book.status === 'ordered') book = undefined;
    const photoIds = flattenPhotoIds(content);
    const pages = totalPages(content);
    if (!book) {
      book = {
        id: uid('book'),
        libraryId,
        status: 'draft',
        ...settings,
        pages: content,
        manualLayout,
        photoIds,
        pageCount: pages,
        version: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        orderId: null,
      };
      state.books = [book, ...state.books];
    } else {
      Object.assign(book, settings, {
        pages: content,
        manualLayout,
        photoIds,
        pageCount: pages,
        version: book.version + 1,
        updatedAt: nowIso(),
        libraryId,
      });
    }
    save();
    return { ...book } as Book;
  },

  async getBook(id) {
    const b = state.books.find((x) => x.id === id);
    if (!b) throw new ApiClientError('NOT_FOUND', 'Book not found', 404);
    return { ...b };
  },

  async duplicateBook(id) {
    const src = await this.getBook(id);
    const copy: Book = {
      ...src,
      id: uid('book'),
      title: `${src.title} ${bookText(src.lang).copySuffix}`,
      status: 'draft',
      orderId: null,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.books = [copy, ...state.books];
    save();
    return copy;
  },

  async deleteBook(id) {
    state.books = state.books.filter((b) => b.id !== id || b.status === 'ordered');
    save();
  },

  async createOrder(bookId): Promise<OrderCreateResult> {
    await sleep();
    const book = await this.getBook(bookId);
    const currency = currencyForLang(useLang.getState().lang);
    const open = state.orders.find(
      (o) =>
        o.bookId === bookId &&
        o.currency === currency &&
        (o.status === 'created' || o.status === 'failed'),
    );
    if (open) return { order: toOrderView(open), clientSecret: null, provider: 'fake' };
    const pages = totalPages(book.pages);
    const subtotal = pdfPriceCents(DEFAULT_PRICING, currency);
    const order: Order = {
      id: uid('ord'),
      bookId,
      libraryId: book.libraryId,
      status: 'created',
      title: book.title,
      format: book.format,
      pageCount: pages,
      photoCount: book.photoIds.length,
      subtotalCents: subtotal,
      discountCents: 0,
      promoCode: null,
      amountCents: subtotal,
      currency,
      paymentProvider: 'fake',
      failureReason: null,
      createdAt: nowIso(),
      paidAt: null,
      readyAt: null,
      pdfVersion: 0,
      pdfBytes: null,
      shareToken: null,
      coverThumbUrl: coverThumbFor(book),
    };
    state.orders = [order, ...state.orders];
    save();
    return { order: toOrderView(order), clientSecret: null, provider: 'fake' };
  },

  async getOrder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) throw new ApiClientError('NOT_FOUND', 'Order not found', 404);
    return toOrderView(o);
  },

  async syncOrder(id) {
    return this.getOrder(id);
  },

  async payTest(id, card) {
    await sleep(300);
    const o = state.orders.find((x) => x.id === id);
    if (!o) throw new ApiClientError('NOT_FOUND', 'Order not found', 404);
    const outcome = TEST_CARDS.find((c) => c.number === card)?.outcome;
    if (!outcome) throw new ApiClientError('UNKNOWN_TEST_CARD', 'Use one of the test cards.', 400);
    if (outcome !== 'succeeded' || mockFlags.payFails) {
      o.status = 'failed';
      o.failureReason = 'Your card was declined. Try another card.';
      throw new ApiClientError('CARD_DECLINED', o.failureReason, 402);
    }
    return markMockPaid(o);
  },

  async applyPromo(id, code) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) throw new ApiClientError('NOT_FOUND', 'Order not found', 404);
    const c = normalizePromoCode(code);
    if (!c) {
      Object.assign(o, { promoCode: null, discountCents: 0, amountCents: o.subtotalCents });
      return { order: toOrderView(o), clientSecret: null };
    }
    const def = MOCK_PROMOS[c];
    if (!def) {
      return {
        order: toOrderView(o),
        clientSecret: null,
        rejected: { code: 'not_found', reason: PROMO_MESSAGES.not_found },
      };
    }
    const discount = discountCents(o.subtotalCents, def);
    Object.assign(o, {
      promoCode: c,
      discountCents: discount,
      amountCents: o.subtotalCents - discount,
    });
    save();
    return { order: toOrderView(o), clientSecret: null };
  },

  async confirmFree(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) throw new ApiClientError('NOT_FOUND', 'Order not found', 404);
    if (o.amountCents !== 0)
      throw new ApiClientError('NOT_FREE', 'This order needs a payment.', 409);
    return markMockPaid(o);
  },

  async listOrders() {
    return state.orders.map(toOrderView);
  },

  async getPdfUploadTarget(orderId, regenerate = false): Promise<PdfUploadTarget> {
    const o = await this.getOrder(orderId);
    if (o.status !== 'paid' && !(o.status === 'ready' && regenerate)) {
      throw new ApiClientError('NOT_PAID', 'This order has not been paid yet.', 403);
    }
    const book = await this.getBook(o.bookId);
    const all = state.photosByLibrary[book.libraryId] ?? [];
    const byId = new Map(all.map((p) => [p.id, p]));
    const photos = book.photoIds.map((id) => byId.get(id)).filter((p): p is Photo => !!p);
    return {
      version: o.pdfVersion + 1,
      putUrl: `mock:pdf:${orderId}`,
      photos,
      book: {
        title: book.title,
        format: book.format,
        showMeta: book.showMeta,
        coverPhotoId: book.coverPhotoId,
        lang: book.lang ?? 'en',
        layout: book.layout ?? DEFAULT_LAYOUT,
        pages: book.pages,
        photoCount: photos.length,
        pageCount: o.pageCount,
      },
      bleedMm: 4,
    };
  },

  async uploadPdf(target, pdf, onProgress) {
    const orderId = target.putUrl.replace('mock:pdf:', '');
    for (let i = 1; i <= 4; i++) {
      await sleep(120);
      onProgress?.(i * 25);
    }
    const blob = new Blob([pdf as BlobPart], { type: 'application/pdf' });
    state.pdfs[orderId] = URL.createObjectURL(blob);
  },

  async completePdf(orderId, version, bytes, pages) {
    const o = state.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiClientError('NOT_FOUND', 'Order not found', 404);
    o.status = 'ready';
    o.readyAt = nowIso();
    o.pdfVersion = version;
    o.pdfBytes = bytes;
    o.pageCount = pages;
    if (!o.shareToken) {
      o.shareToken = uid('share');
      state.shares[o.shareToken] = o.id;
    }
    save();
    return toOrderView(o);
  },

  async downloadUrl(orderId) {
    const url = state.pdfs[orderId];
    if (!url)
      throw new ApiClientError(
        'PDF_MISSING',
        'The PDF for this order needs to be generated again on this device.',
        404,
      );
    return url;
  },

  async getShare(token): Promise<ShareInfo> {
    const orderId = state.shares[token];
    const o = orderId ? state.orders.find((x) => x.id === orderId) : undefined;
    if (!o) throw new ApiClientError('NOT_FOUND', 'This link is not valid.', 404);
    return {
      title: o.title,
      pages: o.pageCount,
      bytes: o.pdfBytes,
      format: o.format,
      downloadUrl: state.pdfs[o.id] ?? '',
    };
  },

  async rotateShare(orderId) {
    const o = state.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiClientError('NOT_FOUND', 'Order not found', 404);
    for (const [t, id] of Object.entries(state.shares)) if (id === orderId) delete state.shares[t];
    const token = uid('share');
    state.shares[token] = orderId;
    o.shareToken = token;
    save();
    return token;
  },
};
