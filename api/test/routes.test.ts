/**
 * Route tests: the real Functions handlers, called in-process against Azurite.
 * Start Azurite first (`npm run local:azurite`, or CI's background step); without it these
 * tests are skipped.
 */
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as AzureFunctions from '@azure/functions';
import {
  HttpRequest,
  type HttpHandler,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';

process.env.STORAGE_CONNECTION_STRING ??= 'UseDevelopmentStorage=true';
process.env.PAYMENT_PROVIDER = 'fake';
process.env.EMAIL_PROVIDER = 'console';
process.env.COOKIE_SECURE = 'false';

const handlers = new Map<string, HttpHandler>();
vi.mock('@azure/functions', async (orig) => {
  const mod = await orig<typeof AzureFunctions>();
  return {
    ...mod,
    app: {
      ...mod.app,
      http: (name: string, o: { handler: HttpHandler }) => handlers.set(name, o.handler),
      timer: () => undefined,
    },
  };
});

function azuriteUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port: 10002 });
    s.setTimeout(500);
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('error', () => resolve(false));
    s.once('timeout', () => (s.destroy(), resolve(false)));
  });
}
const up = await azuriteUp();
// CI sets REQUIRE_AZURITE so a missing emulator fails the build instead of skipping silently.
if (!up && process.env.REQUIRE_AZURITE) throw new Error('Azurite is not reachable on :10002');

const ctx = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
} as unknown as InvocationContext;

const rnd = () => Math.floor(Math.random() * 250) + 1;

/** A client with its own cookie jar (one user). */
function client() {
  const jar = new Map<string, string>();
  // Each client looks like its own visitor to the per-IP rate limits.
  const ip = `10.${rnd()}.${rnd()}.${rnd()}`;
  return async function call<T = Record<string, unknown>>(
    name: string,
    method: string,
    path: string,
    body?: unknown,
    params: Record<string, string> = {},
  ): Promise<{ status: number; body: T }> {
    const h = handlers.get(name);
    if (!h) throw new Error(`no handler ${name}`);
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const req = new HttpRequest({
      method,
      url: `http://localhost:7071/api/${path}`,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        ...(cookie ? { cookie } : {}),
      },
      params,
      ...(body !== undefined ? { body: { string: JSON.stringify(body) } } : {}),
    });
    const res = (await h(req, ctx)) as HttpResponseInit;
    for (const c of res.cookies ?? []) jar.set(c.name, c.value);
    return { status: res.status ?? 200, body: res.jsonBody as T };
  };
}

type Call = ReturnType<typeof client>;

/** An account with a library of `n` ready photos; returns their ids. */
async function userWithPhotos(call: Call, n: number) {
  await call('sessionAnonymous', 'POST', 'session/anonymous');
  const email = `route+${randomUUID()}@example.com`;
  const reg = await call('authRegister', 'POST', 'auth/register', {
    email,
    password: 'correct horse battery',
  });
  expect(reg.status).toBe(200);
  const lib = await call<{ id: string }>('librariesCreate', 'POST', 'libraries', {
    source: 'export',
    label: 'routes.zip',
  });
  const items = Array.from({ length: n }, (_, i) => ({
    key: `ex_route${i}`,
    postKey: `p_route${i}`,
    takenAt: new Date(Date.UTC(2025, 0, i + 1)).toISOString(),
    caption: `Photo ${i}`,
    isVideo: false,
    carouselIdx: 0,
    carouselCount: 1,
    width: 1080,
    height: 1080,
    mime: 'image/jpeg',
  }));
  const res = await call<
    {
      key: string;
      photoId: string;
      skipped: boolean;
      origPutUrl: string | null;
      thumbPutUrl: string | null;
    }[]
  >(
    'librariesRegister',
    'POST',
    `libraries/${lib.body.id}/photos/register`,
    { items, incremental: false },
    { id: lib.body.id },
  );
  expect(res.status).toBe(200);
  const refs = res.body.map((r) => ({
    photoId: r.photoId,
    takenAt: items.find((it) => it.key === r.key)!.takenAt,
  }));
  const confirmed = await call<{ readyCount: number }>(
    'librariesConfirm',
    'POST',
    `libraries/${lib.body.id}/photos/confirm`,
    { photos: refs },
    { id: lib.body.id },
  );
  expect(confirmed.body.readyCount).toBe(n);
  const complete = await call(
    'librariesImportComplete',
    'POST',
    `libraries/${lib.body.id}/imports/complete`,
    { label: 'routes.zip' },
    { id: lib.body.id },
  );
  expect(complete.status).toBe(200);
  return {
    libraryId: lib.body.id,
    photoIds: refs.map((r) => r.photoId),
    items,
    putUrls: res.body.flatMap((r) => [r.origPutUrl, r.thumbPutUrl]).filter((u): u is string => !!u),
  };
}

async function bookWith(call: Call, libraryId: string, photoIds: string[]) {
  const book = await call<{ id: string; version: number; pageCount: number }>(
    'booksCreate',
    'POST',
    'books',
    {
      libraryId,
      title: 'Route book',
      format: 'square',
      showMeta: true,
      layout: { density: '1', fullBleed: false },
      pages: photoIds.map((id) => ({ template: '1-margin', photoIds: [id] })),
    },
  );
  expect(book.status).toBe(201);
  return book.body;
}

type OrderBody = {
  order: { id: string; status: string; amountCents: number; discountCents: number };
};

describe.skipIf(!up)('API routes against Azurite', () => {
  beforeAll(async () => {
    const { ensureTables } = await import('../src/lib/tables.js');
    const { ensureContainer, PDF_CONTAINER } = await import('../src/lib/blobs.js');
    await ensureTables();
    await ensureContainer(PDF_CONTAINER);
    await import('../src/index.js');
  });

  it('register is idempotent: ready photos are skipped the second time', async () => {
    const call = client();
    const { libraryId, items } = await userWithPhotos(call, 2);
    const again = await call<{ skipped: boolean }[]>(
      'librariesRegister',
      'POST',
      `libraries/${libraryId}/photos/register`,
      { items, incremental: false },
      { id: libraryId },
    );
    expect(again.body.every((r) => r.skipped)).toBe(true);
  });

  it('books: pages are validated and unchanged content keeps the version', async () => {
    const call = client();
    const { libraryId, photoIds } = await userWithPhotos(call, 3);
    const book = await bookWith(call, libraryId, photoIds);
    expect(book.pageCount).toBe(3 + 3);

    const bad = await call('booksCreate', 'POST', 'books', {
      libraryId,
      title: 'Bad',
      format: 'square',
      showMeta: true,
      pages: [{ template: '4-grid', photoIds: [photoIds[0], 'someone-elses-photo'] }],
    });
    expect(bad.status).toBe(400);

    const same = await call<{ version: number }>(
      'booksPatch',
      'PATCH',
      `books/${book.id}`,
      { title: 'Route book' },
      { id: book.id },
    );
    expect(same.body.version).toBe(book.version);
    const changed = await call<{ version: number }>(
      'booksPatch',
      'PATCH',
      `books/${book.id}`,
      { title: 'New title' },
      { id: book.id },
    );
    expect(changed.body.version).toBe(book.version + 1);
  });

  it('orders: reused for the same content; decline then retry succeeds', async () => {
    const call = client();
    const { libraryId, photoIds } = await userWithPhotos(call, 2);
    const book = await bookWith(call, libraryId, photoIds);
    const first = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book.id });
    const second = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book.id });
    expect(first.status).toBe(201);
    expect(second.body.order.id).toBe(first.body.order.id);
    const id = first.body.order.id;

    const declined = await call<{ error: { code: string } }>(
      'ordersPayTest',
      'POST',
      `orders/${id}/pay-test`,
      { card: '4000 0000 0000 0002' },
      { id },
    );
    expect(declined.status).toBe(402);
    const failed = await call<{ status: string; failureReason: string }>(
      'ordersGet',
      'GET',
      `orders/${id}`,
      undefined,
      { id },
    );
    expect(failed.body.status).toBe('failed');
    expect(failed.body.failureReason).toBeTruthy();

    // A failed order is reopened for the same book content rather than duplicated.
    const reopened = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book.id });
    expect(reopened.body.order.id).toBe(id);

    const paid = await call<{ status: string; failureReason: string | null }>(
      'ordersPayTest',
      'POST',
      `orders/${id}/pay-test`,
      { card: '4242424242424242' },
      { id },
    );
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe('paid');
    expect(paid.body.failureReason).toBeNull();
  });

  it('orders: test payment needs an account, PDF is gated until paid', async () => {
    const call = client();
    const { libraryId, photoIds } = await userWithPhotos(call, 1);
    const book = await bookWith(call, libraryId, photoIds);
    const o = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book.id });
    const id = o.body.order.id;
    const gated = await call(
      'ordersPdfUploadUrl',
      'POST',
      `orders/${id}/pdf/upload-url`,
      {},
      { id },
    );
    expect(gated.status).toBe(403);

    // A fresh anonymous session cannot pay (someone else's order is also not found).
    const anon = client();
    await anon('sessionAnonymous', 'POST', 'session/anonymous');
    const res = await anon(
      'ordersPayTest',
      'POST',
      `orders/${id}/pay-test`,
      { card: '4242424242424242' },
      { id },
    );
    expect(res.status).toBe(403);
  });

  it('promo codes: percent discount, 100 % confirms free, once per user', async () => {
    const { promos } = await import('../src/lib/tables.js');
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const base = { validFrom: null, validUntil: null, redemptions: 0, active: true };
    await promos.upsert({
      code: `PCT${suffix}`,
      type: 'percent',
      value: 20,
      maxRedemptions: null,
      perUserOnce: false,
      ...base,
    });
    await promos.upsert({
      code: `FREE${suffix}`,
      type: 'percent',
      value: 100,
      maxRedemptions: 5,
      perUserOnce: true,
      ...base,
    });

    const call = client();
    const { libraryId, photoIds } = await userWithPhotos(call, 1);
    const book = await bookWith(call, libraryId, photoIds);
    const o = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book.id });
    const id = o.body.order.id;
    const full = o.body.order.amountCents;

    const unknown = await call<{ rejected?: { code: string } }>(
      'ordersPromo',
      'POST',
      `orders/${id}/promo`,
      { code: 'NOPE' },
      { id },
    );
    expect(unknown.body.rejected?.code).toBe('not_found');

    const pct = await call<OrderBody>(
      'ordersPromo',
      'POST',
      `orders/${id}/promo`,
      { code: `pct${suffix}` },
      { id },
    );
    expect(pct.body.order.amountCents).toBe(Math.round(full * 0.8));

    const notFree = await call(
      'ordersConfirmFree',
      'POST',
      `orders/${id}/confirm-free`,
      {},
      { id },
    );
    expect(notFree.status).toBe(409);

    const free = await call<OrderBody>(
      'ordersPromo',
      'POST',
      `orders/${id}/promo`,
      { code: `FREE${suffix}` },
      { id },
    );
    expect(free.body.order.amountCents).toBe(0);
    const paid = await call<{ status: string }>(
      'ordersConfirmFree',
      'POST',
      `orders/${id}/confirm-free`,
      {},
      { id },
    );
    expect(paid.body.status).toBe('paid');
    expect((await promos.get(`FREE${suffix}`))?.redemptions).toBe(1);

    // Same user, next book: the once-per-user code is refused.
    const book2 = await bookWith(call, libraryId, photoIds.slice(0, 1));
    await call('booksPatch', 'PATCH', `books/${book2.id}`, { title: 'Second' }, { id: book2.id });
    const o2 = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book2.id });
    const again = await call<{ rejected?: { code: string } }>(
      'ordersPromo',
      'POST',
      `orders/${o2.body.order.id}/promo`,
      { code: `FREE${suffix}` },
      { id: o2.body.order.id },
    );
    expect(again.body.rejected?.code).toBe('already_used');
  });

  it('pdf/complete refuses an upload that is not a PDF', async () => {
    const call = client();
    const { libraryId, photoIds, putUrls } = await userWithPhotos(call, 1);
    // Like a real import: the originals are in storage before the book is ordered.
    for (const url of putUrls) {
      const r = await fetch(url, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'content-type': 'image/jpeg' },
        body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      });
      expect(r.status).toBe(201);
    }
    const book = await bookWith(call, libraryId, photoIds);
    const o = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: book.id });
    const id = o.body.order.id;
    await call(
      'ordersPayTest',
      'POST',
      `orders/${id}/pay-test`,
      { card: '4242424242424242' },
      { id },
    );
    const target = await call<{ version: number; putUrl: string }>(
      'ordersPdfUploadUrl',
      'POST',
      `orders/${id}/pdf/upload-url`,
      {},
      { id },
    );
    expect(target.status).toBe(200);
    const junk = Buffer.alloc(4096, 65);
    const put = await fetch(target.body.putUrl, {
      method: 'PUT',
      headers: { 'x-ms-blob-type': 'BlockBlob', 'content-type': 'application/pdf' },
      body: junk,
    });
    expect(put.status).toBe(201);
    const done = await call<{ error: { code: string } }>(
      'ordersPdfComplete',
      'POST',
      `orders/${id}/pdf/complete`,
      { version: target.body.version, bytes: junk.length, pages: 4 },
      { id },
    );
    expect(done.status).toBe(409);
    expect(done.body.error.code).toBe('PDF_INVALID');
  });
});
