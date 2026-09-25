import type { BookFormat, BookLayout, PageSpec } from '@printagram/shared';
import { flattenPhotoIds, totalPages, validatePages } from '@printagram/shared';
import { config } from '../lib/config.js';
import {
  badRequest,
  conflict,
  json,
  noContent,
  notFound,
  readJson,
  route,
  str,
} from '../lib/http.js';
import { newId, nowIso } from '../lib/ids.js';
import { bookContentHash } from '../lib/orderService.js';
import { books, libraries, photos, type BookRow } from '../lib/tables.js';
import { bookPages, bookView, normalizeLayout } from '../lib/views.js';

interface BookInput {
  libraryId?: unknown;
  title?: unknown;
  format?: unknown;
  showMeta?: unknown;
  coverPhotoId?: unknown;
  layout?: unknown;
  pages?: unknown;
  manualLayout?: unknown;
}

function parseFormat(v: unknown, fallback: BookFormat): BookFormat {
  if (v === undefined) return fallback;
  if (v === 'square' || v === 'portrait') return v;
  throw badRequest('INVALID_FIELD', 'format must be square or portrait.');
}

/** Checks the page list against the library's printable photos and the per-book limit. */
async function parsePages(raw: unknown, libraryId: string): Promise<PageSpec[]> {
  const rows = await photos.listAll(libraryId);
  const allowed = new Set(
    rows.filter((p) => p.status === 'ready' && !p.isVideo).map((p) => p.photoId),
  );
  const err = validatePages(raw, allowed);
  if (err) throw badRequest('INVALID_PAGES', err);
  const pages = (raw as PageSpec[]).map((p) => ({
    template: p.template,
    photoIds: [...p.photoIds],
    ...(p.template === 'text' ? { text: String(p.text ?? '').slice(0, 400) } : {}),
  }));
  const count = flattenPhotoIds(pages).length;
  if (count > config.maxPhotosPerBook)
    throw badRequest(
      'TOO_MANY_PHOTOS',
      `A book can have at most ${config.maxPhotosPerBook} photos.`,
    );
  return pages;
}

function coverFor(v: unknown, photoIds: string[], fallback: string | null): string | null {
  const wanted = v === undefined ? fallback : v ? String(v).slice(0, 64) : null;
  return wanted && photoIds.includes(wanted) ? wanted : (photoIds[0] ?? null);
}

route('booksList', { methods: ['GET'], route: 'books', auth: 'required' }, async ({ user }) => {
  const rows = await books.list(user.userId);
  rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return json(rows.map(bookView));
});

route(
  'booksCreate',
  { methods: ['POST'], route: 'books', auth: 'required' },
  async ({ req, user }) => {
    const body = await readJson<BookInput>(req);
    const libraryId = str(body.libraryId, 'libraryId', { max: 64 });
    const lib = await libraries.get(user.userId, libraryId);
    if (!lib) throw notFound('Library');
    const format = parseFormat(body.format, 'square');
    const pages = await parsePages(body.pages ?? [], libraryId);
    const photoIds = flattenPhotoIds(pages);
    const now = nowIso();
    const row: BookRow = {
      bookId: newId(),
      userId: user.userId,
      libraryId,
      title: str(body.title, 'title', { optional: true, max: 120 }) || 'Our years',
      format,
      showMeta: body.showMeta !== false,
      coverPhotoId: coverFor(body.coverPhotoId, photoIds, null),
      layout: normalizeLayout(body.layout),
      pages,
      manualLayout: body.manualLayout === true,
      photoIds,
      pageCount: totalPages(pages),
      version: 1,
      status: 'draft',
      orderId: null,
      createdAt: now,
      updatedAt: now,
    };
    await books.upsert(row);
    return json(bookView(row), 201);
  },
);

route(
  'booksGet',
  { methods: ['GET'], route: 'books/{id}', auth: 'required' },
  async ({ req, user }) => {
    const b = await books.get(user.userId, req.params.id ?? '');
    if (!b) throw notFound('Book');
    return json(bookView(b));
  },
);

route(
  'booksPatch',
  { methods: ['PATCH'], route: 'books/{id}', auth: 'required' },
  async ({ req, user }) => {
    const b = await books.get(user.userId, req.params.id ?? '');
    if (!b) throw notFound('Book');
    if (b.status === 'ordered')
      throw conflict(
        'BOOK_ORDERED',
        'This book was already ordered. Duplicate it to make changes.',
      );
    const body = await readJson<BookInput>(req);
    const format = parseFormat(body.format, b.format);
    const pages =
      body.pages === undefined ? bookPages(b) : await parsePages(body.pages, b.libraryId);
    const photoIds = flattenPhotoIds(pages);
    const layout: BookLayout =
      body.layout === undefined ? normalizeLayout(b.layout) : normalizeLayout(body.layout);
    const patch: Partial<BookRow> = {
      title: body.title !== undefined ? str(body.title, 'title', { max: 120 }) || b.title : b.title,
      format,
      showMeta: body.showMeta === undefined ? b.showMeta : body.showMeta !== false,
      coverPhotoId: coverFor(body.coverPhotoId, photoIds, b.coverPhotoId),
      layout,
      pages,
      manualLayout: body.manualLayout === undefined ? !!b.manualLayout : body.manualLayout === true,
      photoIds,
      pageCount: totalPages(pages),
      updatedAt: nowIso(),
    };
    // Only real content changes bump the version (an unchanged save must not invalidate open orders).
    const changed = bookContentHash({ ...b, ...patch } as BookRow) !== bookContentHash(b);
    patch.version = changed ? b.version + 1 : b.version;
    await books.merge(user.userId, b.bookId, patch);
    return json(bookView({ ...b, ...patch } as BookRow));
  },
);

route(
  'booksDuplicate',
  { methods: ['POST'], route: 'books/{id}/duplicate', auth: 'required' },
  async ({ req, user }) => {
    const b = await books.get(user.userId, req.params.id ?? '');
    if (!b) throw notFound('Book');
    const now = nowIso();
    const copy: BookRow = {
      ...b,
      pages: bookPages(b),
      layout: normalizeLayout(b.layout),
      bookId: newId(),
      title: `${b.title} (copy)`,
      status: 'draft',
      orderId: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    await books.upsert(copy);
    return json(bookView(copy), 201);
  },
);

route(
  'booksDelete',
  { methods: ['DELETE'], route: 'books/{id}', auth: 'required' },
  async ({ req, user }) => {
    const b = await books.get(user.userId, req.params.id ?? '');
    if (b && b.status === 'draft') await books.delete(user.userId, b.bookId);
    return noContent();
  },
);
