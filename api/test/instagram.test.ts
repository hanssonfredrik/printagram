/**
 * Instagram connect: the real handlers in-process against Azurite, with the Instagram API client
 * stubbed (OAuth, profile, media pages, downloads). Skipped without Azurite, like routes.test.ts.
 */
import net from 'node:net';
import { createHmac } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as AzureFunctions from '@azure/functions';
import type * as InstagramApi from '../src/lib/instagramApi.js';
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
process.env.IG_APP_ID = 'ig-app';
process.env.IG_APP_SECRET = 'ig-secret';
process.env.IG_REDIRECT_URI = 'http://localhost:7071/api/instagram/callback';
// Switched on inside the tests: the first one checks the "not available yet" answer.
delete process.env.FEATURE_CONNECT_ENABLED;

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

/** Knobs the tests turn: what kind of account logs in, and whether Instagram rejects the token. */
const knobs = vi.hoisted(() => ({ accountType: 'MEDIA_CREATOR', mediaFails: false }));

/** One image post, one carousel (image + video) and one video, over two pages. */
vi.mock('../src/lib/instagramApi.js', async (orig) => {
  const mod = await orig<typeof InstagramApi>();
  return {
    ...mod,
    authorizeUrl: (state: string) =>
      `https://www.instagram.com/oauth/authorize?client_id=ig-app&state=${encodeURIComponent(state)}`,
    exchangeCode: async (code: string) => {
      if (code !== 'good-code') throw new Error('instagram token: Invalid authorization code');
      return { access_token: 'short-token', user_id: '1789' };
    },
    longLivedToken: async () => ({ access_token: 'long-token', expires_in: 5_184_000 }),
    refreshToken: async () => ({ access_token: 'long-token-2', expires_in: 5_184_000 }),
    me: async () => ({
      user_id: '1789',
      username: 'tester',
      media_count: 3,
      account_type: knobs.accountType,
    }),
    mediaPage: async (_token: string, after: string | null) => {
      if (knobs.mediaFails) throw new Error('instagram me/media: Invalid OAuth access token.');
      if (!after)
        return {
          data: [
            {
              id: '101',
              media_type: 'IMAGE',
              media_url: 'https://cdn.example/101.jpg',
              timestamp: '2024-05-01T10:00:00.000Z',
              caption: 'First post',
              like_count: 12,
            },
            {
              id: '102',
              media_type: 'CAROUSEL_ALBUM',
              timestamp: '2024-06-01T10:00:00.000Z',
              caption: 'Trip',
              like_count: 40,
              children: {
                data: [
                  { id: '102a', media_type: 'IMAGE', media_url: 'https://cdn.example/102a.jpg' },
                  { id: '102b', media_type: 'VIDEO', media_url: 'https://cdn.example/102b.mp4' },
                ],
              },
            },
          ],
          next: 'page2',
        };
      return {
        data: [
          {
            id: '103',
            media_type: 'VIDEO',
            thumbnail_url: 'https://cdn.example/103.jpg',
            timestamp: '2024-07-01T10:00:00.000Z',
            caption: 'A reel',
          },
        ],
        next: null,
      };
    },
    fetchBytes: async () => {
      const { Jimp } = await import('jimp');
      return new Jimp({ width: 8, height: 8, color: 0xff6600ff }).getBuffer('image/jpeg');
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
if (!up && process.env.REQUIRE_AZURITE) throw new Error('Azurite is not reachable on :10002');

const ctx = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
} as unknown as InvocationContext;

const rnd = () => Math.floor(Math.random() * 250) + 1;

/** A client with its own cookie jar; `form` sends a URL-encoded body like Meta's callbacks do. */
function client() {
  const jar = new Map<string, string>();
  const ip = `10.${rnd()}.${rnd()}.${rnd()}`;
  return async function call<T = Record<string, unknown>>(
    name: string,
    method: string,
    path: string,
    body?: unknown,
    params: Record<string, string> = {},
    form = false,
  ): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const h = handlers.get(name);
    if (!h) throw new Error(`no handler ${name}`);
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const req = new HttpRequest({
      method,
      url: `http://localhost:7071/api/${path}`,
      headers: {
        'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json',
        'x-forwarded-for': ip,
        ...(cookie ? { cookie } : {}),
      },
      params,
      ...(body !== undefined
        ? { body: { string: form ? String(body) : JSON.stringify(body) } }
        : {}),
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

/** Meta's signed_request: base64url(HMAC-SHA256(payload)).base64url(payload). */
function signedRequest(payload: object, secret = 'ig-secret'): string {
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(p).digest('base64url');
  return `${sig}.${p}`;
}

type Run = {
  status: string;
  processed: number;
  skipped: number;
  failed: number;
  more: boolean;
  error?: string;
  errorCode?: string;
};

async function runImport(call: Call, libraryId: string) {
  const job = await call<{ jobId: string; error?: { code: string } }>(
    'importsCreate',
    'POST',
    `libraries/${libraryId}/imports`,
    {},
    { id: libraryId },
  );
  if (job.status >= 400) return { job, last: undefined };
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
  return { job, last };
}

describe.skipIf(!up)('Instagram connect against Azurite', () => {
  beforeAll(async () => {
    const { ensureTables } = await import('../src/lib/tables.js');
    const { ensureContainer, PDF_CONTAINER } = await import('../src/lib/blobs.js');
    await ensureTables();
    await ensureContainer(PDF_CONTAINER);
    await import('../src/index.js');
  });

  it('connect, import with likes and captions, token loss, reconnect, and the Meta callbacks', async () => {
    const call = client();
    await call('sessionAnonymous', 'POST', 'session/anonymous');

    // Off until Meta has approved the app: a clear 503, never a broken redirect.
    const off = await call<{ error: { code: string } }>('instagramStart', 'GET', 'instagram/start');
    expect(off.status).toBe(503);
    expect(off.body.error.code).toBe('CONNECT_DISABLED');
    process.env.FEATURE_CONNECT_ENABLED = 'true';

    const start = await call<{ url: string }>('instagramStart', 'GET', 'instagram/start');
    expect(start.status).toBe(200);
    const url = new URL(start.body.url);
    expect(url.origin).toBe('https://www.instagram.com');
    const state = url.searchParams.get('state')!;
    expect(state).toBeTruthy();
    const cb = (q: string) => call('instagramCallback', 'GET', `instagram/callback?${q}`);
    const errorOf = async (q: string) => {
      const r = await cb(q);
      expect(r.status).toBe(302);
      const loc = new URL(r.headers.Location!);
      expect(loc.pathname).toBe('/connect');
      return loc.searchParams.get('error') ?? `connected=${loc.searchParams.get('connected')}`;
    };
    const st = `state=${encodeURIComponent(state)}`;

    expect(await errorOf('code=good-code&state=forged')).toBe('expired');
    expect(await errorOf(`error=access_denied&error_reason=user_denied&${st}`)).toBe('denied');
    // Instagram shows personal accounts a vague access_denied without a reason.
    expect(await errorOf(`error=access_denied&${st}`)).toBe('personal');
    expect(await errorOf(`code=bad-code&${st}`)).toBe('unknown');
    knobs.accountType = 'PERSONAL';
    expect(await errorOf(`code=good-code&${st}`)).toBe('personal');
    knobs.accountType = 'MEDIA_CREATOR';

    const ok = await cb(`code=good-code&${st}`);
    expect(ok.status).toBe(302);
    const okLoc = new URL(ok.headers.Location!);
    expect(okLoc.searchParams.get('connected')).toBe('1');
    const libraryId = okLoc.searchParams.get('library')!;
    expect(libraryId).toBeTruthy();

    type Status = { connected: boolean; username: string | null; libraryId: string | null };
    const status = await call<Status>('instagramStatus', 'GET', 'instagram/status');
    expect(status.body).toMatchObject({ connected: true, username: 'tester', libraryId });

    // The import: `new` resolves to the connected library; carousels expand to their children.
    const first = await runImport(call, 'new');
    expect(first.job.status).toBe(201);
    expect(first.last).toMatchObject({
      status: 'done',
      processed: 4,
      skipped: 0,
      failed: 0,
      more: false,
    });
    type Photo = {
      id: string;
      postId: string;
      source: string;
      caption: string;
      likes: number | null;
      isVideo: boolean;
      carouselIdx: number;
      carouselCount: number;
      takenAt: string;
      origUrl: string;
    };
    const photos = await call<{ photos: Photo[] }>(
      'librariesPhotos',
      'GET',
      `libraries/${libraryId}/photos`,
      undefined,
      { id: libraryId },
    );
    const byId = new Map(photos.body.photos.map((p) => [p.id, p]));
    expect([...byId.keys()].sort()).toEqual(['ig_101', 'ig_102a', 'ig_102b', 'ig_103']);
    expect(byId.get('ig_101')).toMatchObject({
      postId: 'ig_101',
      source: 'instagram',
      caption: 'First post',
      likes: 12,
      isVideo: false,
      carouselCount: 1,
      takenAt: '2024-05-01T10:00:00.000Z',
      origUrl: 'orig/ig_101.jpg',
    });
    // Carousel children share the post's caption and likes and keep their order.
    expect(byId.get('ig_102a')).toMatchObject({
      postId: 'ig_102',
      caption: 'Trip',
      likes: 40,
      isVideo: false,
      carouselIdx: 0,
      carouselCount: 2,
    });
    expect(byId.get('ig_102b')).toMatchObject({ postId: 'ig_102', isVideo: true, carouselIdx: 1 });
    expect(byId.get('ig_103')).toMatchObject({ isVideo: true, caption: 'A reel', likes: null });

    const lib = await call<{
      library: { source: string; hasLikes: boolean; instagramConnected: boolean };
    }>('librariesGet', 'GET', `libraries/${libraryId}`, undefined, { id: libraryId });
    expect(lib.body.library).toMatchObject({
      source: 'instagram',
      hasLikes: true,
      instagramConnected: true,
    });

    // A second import only looks for posts newer than the last one: nothing to do.
    const second = await runImport(call, libraryId);
    expect(second.last).toMatchObject({ status: 'done', processed: 0, skipped: 0 });

    // Instagram rejects the token: the job fails with a reason the client can act on, and the
    // library is marked as needing a new connection.
    knobs.mediaFails = true;
    const lost = await runImport(call, libraryId);
    expect(lost.last).toMatchObject({ status: 'failed', errorCode: 'NOT_CONNECTED' });
    expect(lost.last?.error).toMatch(/OAuth/);
    knobs.mediaFails = false;
    expect((await call<Status>('instagramStatus', 'GET', 'instagram/status')).body.connected).toBe(
      false,
    );
    const refused = await runImport(call, libraryId);
    expect(refused.job.status).toBe(409);
    expect(refused.job.body.error?.code).toBe('NOT_CONNECTED');

    // Connecting again with the same Instagram account keeps the library.
    const again = await call<{ url: string }>('instagramStart', 'GET', 'instagram/start');
    const state2 = new URL(again.body.url).searchParams.get('state')!;
    const re = await cb(`code=good-code&state=${encodeURIComponent(state2)}`);
    expect(new URL(re.headers.Location!).searchParams.get('library')).toBe(libraryId);
    expect((await call<Status>('instagramStatus', 'GET', 'instagram/status')).body.connected).toBe(
      true,
    );

    // Meta's deauthorize callback: signature checked, then the token is dropped.
    const deauth = (body: string) =>
      call<{ ok?: boolean; error?: { code: string } }>(
        'instagramDeauthorize',
        'POST',
        'instagram/deauthorize',
        body,
        {},
        true,
      );
    const forged = await deauth(
      `signed_request=${encodeURIComponent(signedRequest({ user_id: '1789' }, 'wrong-secret'))}`,
    );
    expect(forged.status).toBe(400);
    expect(forged.body.error?.code).toBe('BAD_SIGNATURE');
    const okDeauth = await deauth(
      `signed_request=${encodeURIComponent(signedRequest({ user_id: '1789' }))}`,
    );
    expect(okDeauth.status).toBe(200);
    expect(okDeauth.body.ok).toBe(true);
    expect((await call<Status>('instagramStatus', 'GET', 'instagram/status')).body.connected).toBe(
      false,
    );

    // Meta's data-deletion callback: the copied photos go, and the answer points at our status page.
    const del = await call<{ url: string; confirmation_code: string }>(
      'instagramDataDeletion',
      'POST',
      'instagram/data-deletion',
      `signed_request=${encodeURIComponent(signedRequest({ user_id: '1789' }))}`,
      {},
      true,
    );
    expect(del.status).toBe(200);
    expect(del.body.confirmation_code).toBeTruthy();
    const statusUrl = new URL(del.body.url);
    expect(statusUrl.pathname).toBe('/privacy/deletion');
    expect(statusUrl.searchParams.get('code')).toBe(del.body.confirmation_code);
    const after = await call<{ photos?: Photo[] }>(
      'librariesPhotos',
      'GET',
      `libraries/${libraryId}/photos`,
      undefined,
      { id: libraryId },
    );
    expect(after.status === 404 || (after.body.photos ?? []).length === 0).toBe(true);

    delete process.env.FEATURE_CONNECT_ENABLED;
  }, 60_000);

  it('keeps the versioned Graph endpoints and the scope Meta expects', async () => {
    const real = await vi.importActual<typeof InstagramApi>('../src/lib/instagramApi.js');
    expect(real.SCOPE).toBe('instagram_business_basic');
    expect(real.API_VERSION).toMatch(/^v\d+\.\d+$/);
    const u = new URL(real.authorizeUrl('abc'));
    expect(u.origin + u.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('scope')).toBe('instagram_business_basic');
    expect(u.searchParams.get('enable_fb_login')).toBe('0');
    expect(u.searchParams.get('state')).toBe('abc');
    expect(u.searchParams.get('redirect_uri')).toBe(process.env.IG_REDIRECT_URI);
  });
});
