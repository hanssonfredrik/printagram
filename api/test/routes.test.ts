/**
 * Route tests: the real Functions handlers, called in-process against Azurite.
 * Start Azurite first (`npm run local:azurite`, or CI's background step); without it these
 * tests are skipped.
 */
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as AzureFunctions from '@azure/functions';
import type * as GooglePhotosApi from '../src/lib/googlePhotosApi.js';
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
process.env.FEATURE_GOOGLE_PHOTOS_ENABLED = 'true';
process.env.GOOGLE_CLIENT_ID = 'test-client';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

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

/** Google OAuth + Picker, stubbed: one photo, one video and one HEIC across two pages. */
vi.mock('../src/lib/googlePhotosApi.js', async (orig) => {
  const mod = await orig<typeof GooglePhotosApi>();
  let polls = 0;
  const item = (id: string, type: 'PHOTO' | 'VIDEO', mimeType: string) => ({
    id,
    type,
    createTime: '2022-03-04T10:00:00Z',
    mediaFile: { baseUrl: `https://lh3.googleusercontent.com/${id}`, mimeType, filename: id },
  });
  return {
    ...mod,
    authorizeUrl: (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
    exchangeCode: async (code: string) => {
      if (code !== 'good-code') throw new mod.GoogleApiError(400, 'bad code');
      return { access_token: 'gp-token', expires_in: 3600 };
    },
    revoke: async () => undefined,
    createSession: async () => ({
      id: 'sess-1',
      pickerUri: 'https://photos.google.com/picker/abc',
      pollingConfig: { pollInterval: '5s' },
    }),
    getSession: async (_t: string, id: string) => ({
      id,
      pickerUri: 'https://photos.google.com/picker/abc',
      mediaItemsSet: ++polls >= 2,
      pollingConfig: { pollInterval: '5s' },
    }),
    deleteSession: async () => undefined,
    mediaPage: async (_t: string, _s: string, pageToken: string | null) =>
      pageToken === null
        ? {
            items: [
              item('AbC-photo_1', 'PHOTO', 'image/jpeg'),
              item('vid-2', 'VIDEO', 'video/mp4'),
            ],
            next: 'page2',
          }
        : { items: [item('heic-3', 'PHOTO', 'image/heic')], next: null },
    fetchBytes: async () => {
      const { Jimp } = await import('jimp');
      return new Jimp({ width: 8, height: 8, color: 0x3366ffff }).getBuffer('image/jpeg');
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

/** A client with its own cookie jar (one user); `headers` go on every request (e.g. X-Lang). */
function client(headers: Record<string, string> = {}) {
  const jar = new Map<string, string>();
  // Each client looks like its own visitor to the per-IP rate limits.
  const ip = `10.${rnd()}.${rnd()}.${rnd()}`;
  return async function call<T = Record<string, unknown>>(
    name: string,
    method: string,
    path: string,
    body?: unknown,
    params: Record<string, string> = {},
  ): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const h = handlers.get(name);
    if (!h) throw new Error(`no handler ${name}`);
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const req = new HttpRequest({
      method,
      url: `http://localhost:7071/api/${path}`,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        ...headers,
        ...(cookie ? { cookie } : {}),
      },
      params,
      ...(body !== undefined ? { body: { string: JSON.stringify(body) } } : {}),
    });
    const res = (await h(req, ctx)) as HttpResponseInit;
    for (const c of res.cookies ?? []) jar.set(c.name, c.value);
    return {
      status: res.status ?? 200,
      body: res.jsonBody as T,
      headers: (res.headers ?? {}) as Record<string, string>,
    };
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

  it('languages: X-Lang is remembered, Swedish books keep their language into the PDF', async () => {
    const call = client({ 'x-lang': 'sv' });
    const { libraryId, photoIds } = await userWithPhotos(call, 1);
    const me = await call<{ user: { lang: string } }>('me', 'GET', 'me');
    expect(me.body.user.lang).toBe('sv');

    // No title and no lang: the UI language decides both.
    const created = await call<{ id: string; title: string; lang: string }>(
      'booksCreate',
      'POST',
      'books',
      {
        libraryId,
        format: 'square',
        showMeta: true,
        pages: photoIds.map((id) => ({ template: '1-margin', photoIds: [id] })),
      },
    );
    expect(created.status).toBe(201);
    expect(created.body.title).toBe('Våra år');
    expect(created.body.lang).toBe('sv');

    const copy = await call<{ id: string; title: string; lang: string }>(
      'booksDuplicate',
      'POST',
      `books/${created.body.id}/duplicate`,
      {},
      { id: created.body.id },
    );
    expect(copy.body.title).toBe('Våra år (kopia)');
    expect(copy.body.lang).toBe('sv');

    const o = await call<OrderBody>('ordersCreate', 'POST', 'orders', { bookId: created.body.id });
    const id = o.body.order.id;
    const declined = await call<{ error: { code: string; message: string } }>(
      'ordersPayTest',
      'POST',
      `orders/${id}/pay-test`,
      { card: '4000000000000002' },
      { id },
    );
    expect(declined.body.error.code).toBe('CARD_DECLINED');
    expect(declined.body.error.message).toMatch(/Kortet nekades/);
    await call(
      'ordersPayTest',
      'POST',
      `orders/${id}/pay-test`,
      { card: '4242424242424242' },
      { id },
    );
    const target = await call<{ book: { lang: string } }>(
      'ordersPdfUploadUrl',
      'POST',
      `orders/${id}/pdf/upload-url`,
      {},
      { id },
    );
    expect(target.status).toBe(200);
    expect(target.body.book.lang).toBe('sv');

    // The ordered book is locked; its draft copy validates the language.
    const bad = await call(
      'booksPatch',
      'PATCH',
      `books/${copy.body.id}`,
      { lang: 'de' },
      { id: copy.body.id },
    );
    expect(bad.status).toBe(400);
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

  it('google photos: sign in, pick in the Picker, import copies the selection', async () => {
    const call = client();
    await call('sessionAnonymous', 'POST', 'session/anonymous');
    const start = await call<{ url: string }>('googleStart', 'GET', 'google/start');
    expect(start.status).toBe(200);
    const state = new URL(start.body.url).searchParams.get('state')!;

    const bad = await call('googleCallback', 'GET', 'google/callback?error=access_denied&state=x');
    expect(bad.status).toBe(302);
    expect(new URL(bad.headers.Location!).searchParams.get('error')).toBe('expired');

    const cb = await call(
      'googleCallback',
      'GET',
      `google/callback?code=good-code&state=${encodeURIComponent(state)}`,
    );
    expect(cb.status).toBe(302);
    const loc = new URL(cb.headers.Location!);
    expect(loc.pathname).toBe('/google');
    expect(loc.searchParams.get('connected')).toBe('1');
    const libraryId = loc.searchParams.get('library')!;
    expect(libraryId).toBeTruthy();

    const status = await call<{ connected: boolean; libraryId: string }>(
      'googleStatus',
      'GET',
      'google/status',
    );
    expect(status.body).toMatchObject({ connected: true, libraryId });

    // Nothing to copy before the user has picked photos.
    const early = await call<{ error: { code: string } }>(
      'importsCreate',
      'POST',
      `libraries/${libraryId}/imports`,
      {},
      { id: libraryId },
    );
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('NO_SESSION');

    const sess = await call<{ sessionId: string; pickerUri: string; pollIntervalMs: number }>(
      'googleSessionCreate',
      'POST',
      'google/session',
    );
    expect(sess.body.pickerUri).toContain('photos.google.com');
    expect(sess.body.pollIntervalMs).toBe(5000);
    const poll1 = await call<{ mediaItemsSet: boolean }>(
      'googleSessionGet',
      'GET',
      'google/session',
    );
    expect(poll1.body.mediaItemsSet).toBe(false);
    const poll2 = await call<{ mediaItemsSet: boolean }>(
      'googleSessionGet',
      'GET',
      'google/session',
    );
    expect(poll2.body.mediaItemsSet).toBe(true);

    const job = await call<{ jobId: string }>(
      'importsCreate',
      'POST',
      `libraries/${libraryId}/imports`,
      {},
      { id: libraryId },
    );
    expect(job.status).toBe(201);
    type Run = {
      status: string;
      processed: number;
      skipped: number;
      failed: number;
      more: boolean;
    };
    let last: Run | undefined;
    for (let i = 0; i < 10 && (!last || last.more); i++) {
      const r = await call<Run>(
        'importsRun',
        'POST',
        `imports/${job.body.jobId}/run`,
        {},
        {
          jobId: job.body.jobId,
        },
      );
      expect(r.status).toBe(200);
      last = r.body;
    }
    // photo + video recorded, HEIC skipped (cannot be printed), nothing failed
    expect(last).toMatchObject({
      status: 'done',
      processed: 2,
      skipped: 1,
      failed: 0,
      more: false,
    });

    const photos = await call<{
      photos: {
        id: string;
        source: string;
        isVideo: boolean;
        caption: string;
        takenAt: string;
        mime: string | null;
        width: number | null;
        origUrl: string;
      }[];
    }>('librariesPhotos', 'GET', `libraries/${libraryId}/photos`, undefined, { id: libraryId });
    expect(photos.body.photos).toHaveLength(2);
    const still = photos.body.photos.find((p) => !p.isVideo)!;
    expect(still).toMatchObject({
      id: 'gp_AbC-photo_1',
      source: 'googlephotos',
      caption: '',
      mime: 'image/jpeg',
      width: 8,
      takenAt: '2022-03-04T10:00:00.000Z',
      origUrl: 'orig/gp_AbC-photo_1.jpg',
    });
    expect(photos.body.photos.find((p) => p.isVideo)!.id).toBe('gp_vid-2');

    const lib = await call<{ library: { photoCount: number; source: string; status: string } }>(
      'librariesGet',
      'GET',
      `libraries/${libraryId}`,
      undefined,
      { id: libraryId },
    );
    expect(lib.body.library).toMatchObject({
      photoCount: 1,
      source: 'googlephotos',
      status: 'ready',
    });

    // A second run is idempotent: the photo is already there. (A new Picker session is needed.)
    await call('googleSessionCreate', 'POST', 'google/session');
    const again = await call<{ jobId: string }>(
      'importsCreate',
      'POST',
      `libraries/${libraryId}/imports`,
      {},
      { id: libraryId },
    );
    let r2: Run | undefined;
    for (let i = 0; i < 10 && (!r2 || r2.more); i++)
      r2 = (
        await call<Run>(
          'importsRun',
          'POST',
          `imports/${again.body.jobId}/run`,
          {},
          {
            jobId: again.body.jobId,
          },
        )
      ).body;
    expect(r2).toMatchObject({ status: 'done', skipped: 3, processed: 0 });

    const dc = await call('googleDisconnect', 'POST', 'google/disconnect');
    expect(dc.status).toBe(204);
    const after = await call<{ connected: boolean }>('googleStatus', 'GET', 'google/status');
    expect(after.body.connected).toBe(false);
  }, 30000);

  it('admin fields: never exposed, never settable, and kept through password changes', async () => {
    const { users } = await import('../src/lib/tables.js');
    const call = client();
    await call('sessionAnonymous', 'POST', 'session/anonymous');
    const me0 = await call<{ user: { id: string } }>('me', 'GET', 'me');
    expect((await users.get(me0.body.user.id))?.isAdmin).toBe(false);
    const reg = await call('authRegister', 'POST', 'auth/register', {
      email: `admin+${randomUUID()}@example.com`,
      password: 'correct horse battery',
      isAdmin: true,
    });
    expect(reg.status).toBe(200);
    const id = me0.body.user.id;
    expect((await users.get(id))?.isAdmin).toBe(false);

    // Granted out of band (admin app / scripts/admin.ts), then the customer changes password.
    await users.merge(id, { isAdmin: true, adminTotpSecret: 'enc', adminSessionVersion: 3 });
    const pw = await call('authPassword', 'POST', 'auth/password', {
      currentPassword: 'correct horse battery',
      newPassword: 'another long password',
    });
    expect(pw.status).toBe(200);
    const row = await users.get(id);
    expect(row).toMatchObject({ isAdmin: true, adminTotpSecret: 'enc', adminSessionVersion: 3 });

    const me = await call<Record<string, unknown>>('me', 'GET', 'me');
    expect(JSON.stringify(me.body)).not.toMatch(/isAdmin|adminTotp|adminSession/);
    expect(JSON.stringify(reg.body)).not.toMatch(/isAdmin|adminTotp|adminSession/);
  });

  it('visit beacon: stores no IP or token, skips bots', async () => {
    const { visits } = await import('../src/lib/tables.js');
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148';
    const call = client({ 'user-agent': ua });
    const secretToken = `tok${randomUUID().replace(/-/g, '')}`;
    const res = await call('visitTrack', 'POST', 'v', {
      p: `/s/${secretToken}?utm=x`,
      r: 'https://www.google.com/search?q=inbunden',
      l: 'sv',
    });
    expect(res.status).toBe(204);
    const marker = `/guides/bot-${randomUUID()}`;
    const bot = client({ 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' });
    expect((await bot('visitTrack', 'POST', 'v', { p: marker })).status).toBe(204);

    const today = new Date().toISOString().slice(0, 10);
    const rows = [];
    for await (const r of visits.scanRange(today, today)) rows.push(r);
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain(secretToken);
    expect(dump).not.toContain(marker);
    expect(
      rows.some(
        (r) =>
          r.path === '/s/:token' &&
          r.ref === 'google.com' &&
          r.device === 'mobile' &&
          r.lang === 'sv',
      ),
    ).toBe(true);
    for (const r of rows) expect(r.visitor).toMatch(/^[\w-]{16}$/);
  });
});
