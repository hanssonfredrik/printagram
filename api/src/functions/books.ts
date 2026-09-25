import type { BookFormat } from '@printagram/shared';
import { pageCount } from '@printagram/shared';
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
import { books, libraries, type BookRow } from '../lib/tables.js';
import { bookView } from '../lib/views.js';
import { bookContentHash } from '../lib/orderService.js';

interface BookInput {
  libraryId?: unknown;
  title?: unknown;
  format?: unknown;
  showMeta?: unknown;
  coverPhotoId?: unknown;
  photoIds?: unknown;
}

function parseFormat(v: unknown, fallback: BookFormat): BookFormat {
  if (v === undefined) return fallback;
  if (v === 'square' || v === 'portrait') return v;
  throw badRequest('INVALID_FIELD', 'format must be square or portrait.');
}

function parsePhotoIds(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw badRequest('INVALID_FIELD', 'photoIds must be an array.');
  const ids = [...new Set(v.map((x) => String(x).slice(0, 64)))];
  if (ids.length > config.maxPhotosPerBook)
    throw badRequest(
      'TOO_MANY_PHOTOS',
      `A book can have at most ${config.maxPhotosPerBook} photos.`,
    );
  return ids;
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
    const photoIds = parsePhotoIds(body.photoIds) ?? [];
    const now = nowIso();
    const row: BookRow = {
      bookId: newId(),
      userId: user.userId,
      libraryId,
      title: str(body.title, 'title', { optional: true, max: 120 }) || 'Our years',
      format,
      showMeta: body.showMeta !== false,
      coverPhotoId: body.coverPhotoId ? String(body.coverPhotoId).slice(0, 64) : null,
      photoIds,
      pageCount: pageCount(photoIds.length, format),
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
    const photoIds = parsePhotoIds(body.photoIds) ?? b.photoIds;
    const patch: Partial<BookRow> = {
      title: body.title !== undefined ? str(body.title, 'title', { max: 120 }) || b.title : b.title,
      format,
      showMeta: body.showMeta === undefined ? b.showMeta : body.showMeta !== false,
      coverPhotoId:
        body.coverPhotoId === undefined
          ? b.coverPhotoId
          : body.coverPhotoId
            ? String(body.coverPhotoId).slice(0, 64)
            : null,
      photoIds,
      pageCount: pageCount(photoIds.length, format),
      updatedAt: nowIso(),
    };
    // Only real content changes bump the version (an unchanged save must not invalidate open orders).
    const changed = bookContentHash({ ...b, ...patch } as BookRow) !== bookContentHash(b);
    patch.version = changed ? b.version + 1 : b.version;
    await books.merge(user.userId, b.bookId, patch);
    return json(bookView({ ...b, ...patch }));
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
