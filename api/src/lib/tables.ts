import {
  odata,
  RestError,
  TableClient,
  TableServiceClient,
  TableTransaction,
  type TableEntity,
  type TableEntityResult,
} from '@azure/data-tables';
import type {
  AuthLevel,
  BookFormat,
  BookStatus,
  ImportJobStatus,
  LibraryStatus,
  OrderStatus,
  PhotoSource,
} from '@printagram/shared';
import { config } from './config.js';
import { nowIso } from './ids.js';

/* ------------------------------------------------------------------ */
/* Entity shapes                                                       */
/* ------------------------------------------------------------------ */

export interface UserRow {
  userId: string;
  email: string | null;
  authLevel: AuthLevel;
  passwordHash: string | null;
  sessionVersion: number;
  createdAt: string;
  lastSeenAt: string;
  status: 'active' | 'deleting';
}

export interface LibraryRow {
  libraryId: string;
  userId: string;
  source: PhotoSource;
  status: LibraryStatus;
  photoCount: number;
  sourceLabel: string;
  importedAt: string;
  lastImportAt: string;
  newestMediaAt: string | null;
  expiresAt: string;
  reminderSentAt: string | null;
  igUserId: string | null;
  igUsername: string | null;
  igTokenEnc: string | null;
  igTokenExpiresAt: string | null;
  igTokenInvalid: boolean;
  igConnected: boolean;
}

export interface ImportJobRow {
  jobId: string;
  userId: string;
  libraryId: string;
  status: ImportJobStatus;
  cursor: string | null;
  since: string | null;
  processed: number;
  skipped: number;
  failed: number;
  total: number | null;
  leaseUntil: string | null;
  lastError: string | null;
  /** JSON-encoded remaining media items of the current Instagram page (so a 45 s kill loses nothing). */
  pendingJson: string | null;
  createdAt: string;
}

export interface BookRow {
  bookId: string;
  userId: string;
  libraryId: string;
  title: string;
  format: BookFormat;
  showMeta: boolean;
  coverPhotoId: string | null;
  photoIds: string[];
  pageCount: number;
  version: number;
  status: BookStatus;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRow {
  orderId: string;
  userId: string;
  bookId: string;
  bookVersion: number;
  libraryId: string;
  title: string;
  format: BookFormat;
  showMeta: boolean;
  coverPhotoId: string | null;
  photoIds: string[];
  pageCount: number;
  photoCount: number;
  amountCents: number;
  currency: 'eur';
  status: OrderStatus;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  pdfBlob: string | null;
  pdfVersion: number;
  pdfBytes: number | null;
  pdfPages: number | null;
  readyAt: string | null;
  shareToken: string | null;
  createdAt: string;
}

export interface PhotoRow {
  libraryId: string;
  photoId: string;
  postId: string;
  source: PhotoSource;
  takenAt: string;
  year: number;
  month: number;
  caption: string;
  likes: number | null;
  isVideo: boolean;
  carouselIdx: number;
  carouselCount: number;
  width: number | null;
  height: number | null;
  origBlob: string;
  thumbBlob: string;
  status: 'pending' | 'ready' | 'missing';
  importedAt: string;
}

export type LookupKind = 'email' | 'token' | 'share' | 'stripe_evt' | 'ig_user' | 'rl';

export interface LookupRow {
  kind: LookupKind;
  key: string;
  userId: string | null;
  value: string | null;
  purpose: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  count: number;
}

/* ------------------------------------------------------------------ */
/* Clients                                                              */
/* ------------------------------------------------------------------ */

export const TABLE_ACCOUNTS = 'Accounts';
export const TABLE_PHOTOS = 'Photos';
export const TABLE_LOOKUPS = 'Lookups';

const isAzurite = () =>
  /UseDevelopmentStorage=true|127\.0\.0\.1|localhost/.test(config.storageConnectionString);

const clients = new Map<string, TableClient>();
function client(table: string): TableClient {
  let c = clients.get(table);
  if (!c) {
    c = TableClient.fromConnectionString(config.storageConnectionString, table, {
      allowInsecureConnection: isAzurite(),
    });
    clients.set(table, c);
  }
  return c;
}

export async function ensureTables(): Promise<void> {
  const svc = TableServiceClient.fromConnectionString(config.storageConnectionString, {
    allowInsecureConnection: isAzurite(),
  });
  for (const t of [TABLE_ACCOUNTS, TABLE_PHOTOS, TABLE_LOOKUPS])
    await svc.createTable(t).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* Serialisation helpers                                                */
/* ------------------------------------------------------------------ */

type Plain = Record<string, string | number | boolean | null | undefined | string[]>;

const CHUNK = 30_000; // chars; Table string properties max 64 KB (UTF-16)

function toEntity<T extends object>(
  pk: string,
  rk: string,
  row: T,
  arrayFields: (keyof T)[] = [],
): TableEntity<Record<string, unknown>> {
  const out: Record<string, unknown> = { partitionKey: pk, rowKey: rk };
  for (const [k, v] of Object.entries(row as Plain)) {
    if (arrayFields.includes(k as keyof T)) {
      const s = JSON.stringify(v ?? []);
      const n = Math.ceil(s.length / CHUNK);
      out[`${k}Chunks`] = n;
      for (let i = 0; i < n; i++) out[`${k}${i}`] = s.slice(i * CHUNK, (i + 1) * CHUNK);
      continue;
    }
    if (v === undefined) continue;
    out[k] = v === null ? '' : v;
  }
  return out as TableEntity<Record<string, unknown>>;
}

function fromEntity<T>(
  e: TableEntityResult<Record<string, unknown>>,
  nullable: (keyof T)[],
  arrayFields: (keyof T)[] = [],
): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) {
    if (
      k === 'partitionKey' ||
      k === 'rowKey' ||
      k === 'etag' ||
      k === 'timestamp' ||
      k.startsWith('odata')
    )
      continue;
    out[k] = v;
  }
  for (const f of arrayFields) {
    const n = Number(out[`${String(f)}Chunks`] ?? 0);
    let s = '';
    for (let i = 0; i < n; i++) s += String(out[`${String(f)}${i}`] ?? '');
    for (let i = 0; i < n; i++) delete out[`${String(f)}${i}`];
    delete out[`${String(f)}Chunks`];
    try {
      out[String(f)] = s ? JSON.parse(s) : [];
    } catch {
      out[String(f)] = [];
    }
  }
  for (const f of nullable)
    if (out[String(f)] === '' || out[String(f)] === undefined) out[String(f)] = null;
  return out as T;
}

function is404(e: unknown): boolean {
  return e instanceof RestError && e.statusCode === 404;
}

function is409(e: unknown): boolean {
  return e instanceof RestError && (e.statusCode === 409 || e.statusCode === 412);
}

/* ------------------------------------------------------------------ */
/* Accounts table (PK = userId)                                          */
/* ------------------------------------------------------------------ */

const USER_NULLABLE: (keyof UserRow)[] = ['email', 'passwordHash'];
const LIB_NULLABLE: (keyof LibraryRow)[] = [
  'newestMediaAt',
  'reminderSentAt',
  'igUserId',
  'igUsername',
  'igTokenEnc',
  'igTokenExpiresAt',
];
const JOB_NULLABLE: (keyof ImportJobRow)[] = [
  'cursor',
  'since',
  'total',
  'leaseUntil',
  'lastError',
  'pendingJson',
];
const BOOK_NULLABLE: (keyof BookRow)[] = ['coverPhotoId', 'orderId'];
const ORDER_NULLABLE: (keyof OrderRow)[] = [
  'coverPhotoId',
  'stripePaymentIntentId',
  'paidAt',
  'pdfBlob',
  'pdfBytes',
  'pdfPages',
  'readyAt',
  'shareToken',
];
const PHOTO_NULLABLE: (keyof PhotoRow)[] = ['likes', 'width', 'height'];
const LOOKUP_NULLABLE: (keyof LookupRow)[] = ['userId', 'value', 'purpose', 'expiresAt', 'usedAt'];

export const rk = {
  user: 'user',
  library: (id: string) => `library_${id}`,
  job: (id: string) => `import_${id}`,
  book: (id: string) => `book_${id}`,
  order: (id: string) => `order_${id}`,
};

async function getOrNull<T>(
  table: string,
  pk: string,
  rowKey: string,
  nullable: (keyof T)[],
  arrays: (keyof T)[] = [],
): Promise<T | null> {
  try {
    const e = await client(table).getEntity<Record<string, unknown>>(pk, rowKey);
    return fromEntity<T>(e, nullable, arrays);
  } catch (e) {
    if (is404(e)) return null;
    throw e;
  }
}

async function listPrefix<T>(
  table: string,
  pk: string,
  prefix: string,
  nullable: (keyof T)[],
  arrays: (keyof T)[] = [],
): Promise<T[]> {
  const upper = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);
  const out: T[] = [];
  const iter = client(table).listEntities<Record<string, unknown>>({
    queryOptions: {
      filter: odata`PartitionKey eq ${pk} and RowKey ge ${prefix} and RowKey lt ${upper}`,
    },
  });
  for await (const e of iter) out.push(fromEntity<T>(e, nullable, arrays));
  return out;
}

export const users = {
  get: (userId: string) => getOrNull<UserRow>(TABLE_ACCOUNTS, userId, rk.user, USER_NULLABLE),
  async upsert(row: UserRow) {
    await client(TABLE_ACCOUNTS).upsertEntity(toEntity(row.userId, rk.user, row), 'Replace');
  },
  async merge(userId: string, patch: Partial<UserRow>) {
    await client(TABLE_ACCOUNTS).updateEntity(toEntity(userId, rk.user, patch as Plain), 'Merge');
  },
  async delete(userId: string) {
    await client(TABLE_ACCOUNTS)
      .deleteEntity(userId, rk.user)
      .catch((e) => {
        if (!is404(e)) throw e;
      });
  },
};

export const libraries = {
  get: (userId: string, id: string) =>
    getOrNull<LibraryRow>(TABLE_ACCOUNTS, userId, rk.library(id), LIB_NULLABLE),
  list: (userId: string) =>
    listPrefix<LibraryRow>(TABLE_ACCOUNTS, userId, 'library_', LIB_NULLABLE),
  async upsert(row: LibraryRow) {
    await client(TABLE_ACCOUNTS).upsertEntity(
      toEntity(row.userId, rk.library(row.libraryId), row),
      'Replace',
    );
  },
  async merge(userId: string, id: string, patch: Partial<LibraryRow>) {
    await client(TABLE_ACCOUNTS).updateEntity(
      toEntity(userId, rk.library(id), patch as Plain),
      'Merge',
    );
  },
  async delete(userId: string, id: string) {
    await client(TABLE_ACCOUNTS)
      .deleteEntity(userId, rk.library(id))
      .catch((e) => {
        if (!is404(e)) throw e;
      });
  },
  /** Full scan used by cron; the table stays small enough for MVP. */
  async *scanAll(): AsyncGenerator<LibraryRow> {
    const iter = client(TABLE_ACCOUNTS).listEntities<Record<string, unknown>>({
      queryOptions: { filter: odata`RowKey ge ${'library_'} and RowKey lt ${'library`'}` },
    });
    for await (const e of iter) yield fromEntity<LibraryRow>(e, LIB_NULLABLE);
  },
};

export const importJobs = {
  get: (userId: string, id: string) =>
    getOrNull<ImportJobRow>(TABLE_ACCOUNTS, userId, rk.job(id), JOB_NULLABLE),
  list: (userId: string) =>
    listPrefix<ImportJobRow>(TABLE_ACCOUNTS, userId, 'import_', JOB_NULLABLE),
  async upsert(row: ImportJobRow) {
    await client(TABLE_ACCOUNTS).upsertEntity(
      toEntity(row.userId, rk.job(row.jobId), row),
      'Replace',
    );
  },
  async merge(userId: string, id: string, patch: Partial<ImportJobRow>) {
    await client(TABLE_ACCOUNTS).updateEntity(
      toEntity(userId, rk.job(id), patch as Plain),
      'Merge',
    );
  },
  async delete(userId: string, id: string) {
    await client(TABLE_ACCOUNTS)
      .deleteEntity(userId, rk.job(id))
      .catch((e) => {
        if (!is404(e)) throw e;
      });
  },
};

const BOOK_ARRAYS: (keyof BookRow)[] = ['photoIds'];
export const books = {
  get: (userId: string, id: string) =>
    getOrNull<BookRow>(TABLE_ACCOUNTS, userId, rk.book(id), BOOK_NULLABLE, BOOK_ARRAYS),
  list: (userId: string) =>
    listPrefix<BookRow>(TABLE_ACCOUNTS, userId, 'book_', BOOK_NULLABLE, BOOK_ARRAYS),
  async upsert(row: BookRow) {
    await client(TABLE_ACCOUNTS).upsertEntity(
      toEntity(row.userId, rk.book(row.bookId), row, BOOK_ARRAYS),
      'Replace',
    );
  },
  async merge(userId: string, id: string, patch: Partial<BookRow>) {
    await client(TABLE_ACCOUNTS).updateEntity(
      toEntity(userId, rk.book(id), patch as Plain, patch.photoIds ? BOOK_ARRAYS : []),
      'Merge',
    );
  },
  async delete(userId: string, id: string) {
    await client(TABLE_ACCOUNTS)
      .deleteEntity(userId, rk.book(id))
      .catch((e) => {
        if (!is404(e)) throw e;
      });
  },
};

const ORDER_ARRAYS: (keyof OrderRow)[] = ['photoIds'];
export const orders = {
  get: (userId: string, id: string) =>
    getOrNull<OrderRow>(TABLE_ACCOUNTS, userId, rk.order(id), ORDER_NULLABLE, ORDER_ARRAYS),
  list: (userId: string) =>
    listPrefix<OrderRow>(TABLE_ACCOUNTS, userId, 'order_', ORDER_NULLABLE, ORDER_ARRAYS),
  async upsert(row: OrderRow) {
    await client(TABLE_ACCOUNTS).upsertEntity(
      toEntity(row.userId, rk.order(row.orderId), row, ORDER_ARRAYS),
      'Replace',
    );
  },
  async merge(userId: string, id: string, patch: Partial<OrderRow>) {
    await client(TABLE_ACCOUNTS).updateEntity(
      toEntity(userId, rk.order(id), patch as Plain, patch.photoIds ? ORDER_ARRAYS : []),
      'Merge',
    );
  },
};

/** Deletes every row of a user's partition (account deletion). */
export async function deletePartition(userId: string): Promise<number> {
  const c = client(TABLE_ACCOUNTS);
  const keys: string[] = [];
  for await (const e of c.listEntities<Record<string, unknown>>({
    queryOptions: { filter: odata`PartitionKey eq ${userId}`, select: ['rowKey'] },
  })) {
    keys.push(String(e.rowKey));
  }
  for (let i = 0; i < keys.length; i += 100) {
    const tx = new TableTransaction();
    for (const k of keys.slice(i, i + 100)) tx.deleteEntity(userId, k);
    await c.submitTransaction(tx.actions);
  }
  return keys.length;
}

/** Moves library/job/book rows from one user partition to another (anonymous → account merge). */
export async function reparentRows(fromUserId: string, toUserId: string): Promise<void> {
  const c = client(TABLE_ACCOUNTS);
  const rows: TableEntityResult<Record<string, unknown>>[] = [];
  for await (const e of c.listEntities<Record<string, unknown>>({
    queryOptions: { filter: odata`PartitionKey eq ${fromUserId}` },
  })) {
    if (e.rowKey !== rk.user) rows.push(e);
  }
  for (let i = 0; i < rows.length; i += 100) {
    const tx = new TableTransaction();
    for (const e of rows.slice(i, i + 100)) {
      const { etag: _etag, timestamp: _ts, ...rest } = e;
      tx.upsertEntity(
        { ...rest, partitionKey: toUserId, userId: toUserId } as TableEntity<
          Record<string, unknown>
        >,
        'Replace',
      );
    }
    await c.submitTransaction(tx.actions);
  }
  await deletePartition(fromUserId);
}

/* ------------------------------------------------------------------ */
/* Photos table (PK = libraryId, RK = reverseMs_photoId)                */
/* ------------------------------------------------------------------ */

import { reverseMs } from './ids.js';

export const photoRowKey = (takenAt: string, photoId: string) => `${reverseMs(takenAt)}_${photoId}`;

export const photos = {
  async get(libraryId: string, takenAt: string, photoId: string) {
    return getOrNull<PhotoRow>(
      TABLE_PHOTOS,
      libraryId,
      photoRowKey(takenAt, photoId),
      PHOTO_NULLABLE,
    );
  },
  async listPage(
    libraryId: string,
    continuation?: string,
  ): Promise<{ rows: PhotoRow[]; continuation: string | null }> {
    const pages = client(TABLE_PHOTOS)
      .listEntities<Record<string, unknown>>({
        queryOptions: { filter: odata`PartitionKey eq ${libraryId}` },
      })
      .byPage({ maxPageSize: 1000, continuationToken: continuation });
    const first = await pages.next();
    if (first.done || !first.value) return { rows: [], continuation: null };
    const page = first.value;
    return {
      rows: page.map((e) => fromEntity<PhotoRow>(e, PHOTO_NULLABLE)),
      continuation: page.continuationToken ?? null,
    };
  },
  async listAll(libraryId: string): Promise<PhotoRow[]> {
    const out: PhotoRow[] = [];
    let cont: string | null | undefined = undefined;
    do {
      const page: { rows: PhotoRow[]; continuation: string | null } = await this.listPage(
        libraryId,
        cont ?? undefined,
      );
      out.push(...page.rows);
      cont = page.continuation;
    } while (cont);
    return out;
  },
  /** Upserts up to 100 rows per transaction (same partition). */
  async upsertMany(rows: PhotoRow[]) {
    const c = client(TABLE_PHOTOS);
    for (let i = 0; i < rows.length; i += 100) {
      const tx = new TableTransaction();
      for (const r of rows.slice(i, i + 100))
        tx.upsertEntity(toEntity(r.libraryId, photoRowKey(r.takenAt, r.photoId), r), 'Replace');
      await c.submitTransaction(tx.actions);
    }
  },
  async mergeMany(
    libraryId: string,
    patches: { takenAt: string; photoId: string; patch: Partial<PhotoRow> }[],
  ) {
    const c = client(TABLE_PHOTOS);
    for (let i = 0; i < patches.length; i += 100) {
      const tx = new TableTransaction();
      for (const p of patches.slice(i, i + 100))
        tx.updateEntity(
          toEntity(libraryId, photoRowKey(p.takenAt, p.photoId), p.patch as Plain),
          'Merge',
        );
      await c.submitTransaction(tx.actions);
    }
  },
  async deleteAll(libraryId: string): Promise<number> {
    const c = client(TABLE_PHOTOS);
    let n = 0;
    let cont: string | undefined;
    do {
      const page = await this.listPage(libraryId, cont);
      for (let i = 0; i < page.rows.length; i += 100) {
        const tx = new TableTransaction();
        for (const r of page.rows.slice(i, i + 100))
          tx.deleteEntity(libraryId, photoRowKey(r.takenAt, r.photoId));
        await c.submitTransaction(tx.actions);
        n += Math.min(100, page.rows.length - i);
      }
      cont = page.continuation ?? undefined;
    } while (cont);
    return n;
  },
};

/* ------------------------------------------------------------------ */
/* Lookups table (PK = kind, RK = key)                                    */
/* ------------------------------------------------------------------ */

function blankLookup(kind: LookupKind, key: string): LookupRow {
  return {
    kind,
    key,
    userId: null,
    value: null,
    purpose: null,
    expiresAt: null,
    usedAt: null,
    count: 0,
  };
}

export const lookups = {
  get: (kind: LookupKind, key: string) =>
    getOrNull<LookupRow>(TABLE_LOOKUPS, kind, key, LOOKUP_NULLABLE),
  /** Insert-if-absent; returns false when the key already exists (uniqueness / idempotency). */
  async insert(kind: LookupKind, key: string, fields: Partial<LookupRow>): Promise<boolean> {
    try {
      await client(TABLE_LOOKUPS).createEntity(
        toEntity(kind, key, { ...blankLookup(kind, key), ...fields }),
      );
      return true;
    } catch (e) {
      if (is409(e)) return false;
      throw e;
    }
  },
  async upsert(kind: LookupKind, key: string, fields: Partial<LookupRow>) {
    await client(TABLE_LOOKUPS).upsertEntity(
      toEntity(kind, key, { ...blankLookup(kind, key), ...fields }),
      'Replace',
    );
  },
  async merge(kind: LookupKind, key: string, patch: Partial<LookupRow>) {
    await client(TABLE_LOOKUPS).updateEntity(toEntity(kind, key, patch as Plain), 'Merge');
  },
  async delete(kind: LookupKind, key: string) {
    await client(TABLE_LOOKUPS)
      .deleteEntity(kind, key)
      .catch((e) => {
        if (!is404(e)) throw e;
      });
  },
  async *scan(kind: LookupKind): AsyncGenerator<LookupRow> {
    const iter = client(TABLE_LOOKUPS).listEntities<Record<string, unknown>>({
      queryOptions: { filter: odata`PartitionKey eq ${kind}` },
    });
    for await (const e of iter) yield fromEntity<LookupRow>(e, LOOKUP_NULLABLE);
  },
  /** Cheap fixed-window rate limiter. Returns true when the call is allowed. */
  async rateLimit(scope: string, id: string, limit: number, windowMinutes = 1): Promise<boolean> {
    const bucket = Math.floor(Date.now() / (windowMinutes * 60_000));
    const key = `${scope}:${id}:${bucket}`.slice(0, 250);
    const existing = await this.get('rl', key);
    const count = (existing?.count ?? 0) + 1;
    await this.upsert('rl', key, {
      count,
      expiresAt: new Date(Date.now() + windowMinutes * 120_000).toISOString(),
    });
    return count <= limit;
  },
};

export { nowIso };
