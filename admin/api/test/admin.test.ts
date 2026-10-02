/**
 * Admin API tests: the real handlers, called in-process against Azurite (like api/test/routes).
 * Without Azurite the integration block is skipped (CI sets REQUIRE_AZURITE).
 */
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as AzureFunctions from '@azure/functions';
import type * as RouteModule from '../src/lib/route.js';
import {
  HttpRequest,
  type HttpHandler,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { SignJWT } from 'jose';
import { base32Decode, hotp, stepAt, verifyTotp, base32Encode } from '../src/lib/totp.js';
import { splitVat } from '../src/lib/vat.js';

process.env.STORAGE_CONNECTION_STRING ??= 'UseDevelopmentStorage=true';
process.env.COOKIE_SECURE = 'false';
process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-0123456789abcdef';
process.env.ADMIN_TOTP_ENC_KEY = 'test-admin-totp-key-0123456789abcdef';

const handlers = new Map<string, HttpHandler>();
vi.mock('@azure/functions', async (orig) => {
  const mod = await orig<typeof AzureFunctions>();
  return {
    ...mod,
    app: {
      ...mod.app,
      http: (name: string, o: { handler: HttpHandler }) => handlers.set(name, o.handler),
    },
  };
});

/* ---------------- Pure functions ---------------- */

describe('TOTP (RFC 6238 SHA-1 vectors)', () => {
  const key = Buffer.from('12345678901234567890');
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('T=%i → %s', (t, code) => {
    expect(hotp(key, Math.floor(t / 30))).toBe(code);
  });

  it('accepts ±1 step, refuses replays and malformed codes', () => {
    const secret = base32Encode(key);
    expect(base32Decode(secret).equals(key)).toBe(true);
    const now = 1_700_000_000_000;
    const step = stepAt(now);
    const code = hotp(key, step);
    expect(verifyTotp(secret, code, 0, now)).toBe(step);
    expect(verifyTotp(secret, hotp(key, step - 1), 0, now)).toBe(step - 1);
    expect(verifyTotp(secret, hotp(key, step + 2), 0, now)).toBeNull();
    expect(verifyTotp(secret, code, step, now)).toBeNull(); // replay
    expect(verifyTotp(secret, '12345', 0, now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', 0, now)).toBeNull();
  });
});

describe('VAT split', () => {
  it('splits VAT-inclusive prices per order', () => {
    expect(splitVat(900, 25)).toEqual({ grossCents: 900, vatCents: 180, netCents: 720 });
    expect(splitVat(900, 6)).toEqual({ grossCents: 900, vatCents: 51, netCents: 849 });
    expect(splitVat(0, 25)).toEqual({ grossCents: 0, vatCents: 0, netCents: 0 });
    expect(splitVat(720, 25)).toEqual({ grossCents: 720, vatCents: 144, netCents: 576 });
  });
});

/* ---------------- Integration ---------------- */

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
const HOST = 'admin.test';

interface Res<T> {
  status: number;
  body: T;
  cookies: HttpResponseInit['cookies'];
}

function client(extra: Record<string, string> = {}) {
  const jar = new Map<string, string>();
  const ip = `10.${rnd()}.${rnd()}.${rnd()}`;
  return async function call<T = Record<string, unknown>>(
    name: string,
    method: string,
    path: string,
    body?: unknown,
    params: Record<string, string> = {},
    headers: Record<string, string> = {},
  ): Promise<Res<T>> {
    const h = handlers.get(name);
    if (!h) throw new Error(`no handler ${name}`);
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const req = new HttpRequest({
      method,
      url: `https://${HOST}/api/${path}`,
      headers: {
        host: HOST,
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        'x-requested-with': 'inbunden-admin',
        'sec-fetch-site': 'same-origin',
        ...extra,
        ...headers,
        ...(cookie ? { cookie } : {}),
      },
      params,
      ...(body !== undefined ? { body: { string: JSON.stringify(body) } } : {}),
    });
    const res = (await h(req, ctx)) as HttpResponseInit;
    for (const c of res.cookies ?? []) {
      if (c.maxAge === 0) jar.delete(c.name);
      else jar.set(c.name, c.value);
    }
    return { status: res.status ?? 200, body: res.jsonBody as T, cookies: res.cookies };
  };
}
type Call = ReturnType<typeof client>;

const PASSWORD = 'correct horse battery staple';

async function makeUser(opts: { isAdmin: boolean; email?: string }) {
  const { users, lookups } = await import('../../../api/src/lib/tables.js');
  const { hashPassword } = await import('../../../api/src/lib/auth.js');
  const userId = randomUUID().replace(/-/g, '').slice(0, 26);
  const email = opts.email ?? `admin-test+${randomUUID()}@example.com`;
  await users.upsert({
    userId,
    email,
    authLevel: 'password',
    passwordHash: await hashPassword(PASSWORD),
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    status: 'active',
    isAdmin: opts.isAdmin,
  });
  await lookups.insert('email', email, { userId });
  return { userId, email };
}

/** Logs in an admin and enrolls (or uses) the authenticator. Returns the secret. */
async function signIn(call: Call, email: string, secret?: string) {
  const login = await call<{ challenge: string; enroll: { secret: string } | null }>(
    'adminLogin',
    'POST',
    'auth/login',
    { email, password: PASSWORD },
  );
  expect(login.status).toBe(200);
  const s = secret ?? login.body.enroll!.secret;
  const code = hotp(base32Decode(s), stepAt());
  const done = await call(
    login.body.enroll ? 'adminEnroll' : 'adminTotp',
    'POST',
    login.body.enroll ? 'auth/enroll' : 'auth/totp',
    {
      challenge: login.body.challenge,
      code,
    },
  );
  return { status: done.status, secret: s, login };
}

describe.skipIf(!up)('admin API against Azurite', () => {
  let route: typeof RouteModule;

  beforeAll(async () => {
    const { ensureTables } = await import('../../../api/src/lib/tables.js');
    await ensureTables();
    await import('../src/index.js');
    route = await import('../src/lib/route.js');
  });

  it('only the three login steps are public; every other route needs a session', async () => {
    const pub = route.registeredRoutes
      .filter((r) => r.auth === 'public')
      .map((r) => r.name)
      .sort();
    expect(pub).toEqual(['adminEnroll', 'adminLogin', 'adminTotp']);
    expect([...route.PUBLIC_ROUTES].sort()).toEqual(pub);
    const call = client();
    for (const r of route.registeredRoutes.filter((x) => x.auth === 'admin')) {
      const params = Object.fromEntries(
        [...r.route.matchAll(/\{(\w+)\}/g)].map((m) => [m[1]!, 'x']),
      );
      const res = await call(
        r.name,
        r.methods[0]!,
        r.route,
        r.methods[0] === 'GET' ? undefined : {},
        params,
      );
      expect(res.status, `${r.name} without a session`).toBe(401);
    }
  });

  it('refuses requests without the anti-CSRF header or from another origin', async () => {
    const { email } = await makeUser({ isAdmin: true });
    const call = client();
    const noHeader = await call(
      'adminLogin',
      'POST',
      'auth/login',
      { email, password: PASSWORD },
      {},
      {
        'x-requested-with': '',
      },
    );
    expect(noHeader.status).toBe(403);
    const crossSite = await call(
      'adminLogin',
      'POST',
      'auth/login',
      { email, password: PASSWORD },
      {},
      {
        'sec-fetch-site': 'cross-site',
      },
    );
    expect(crossSite.status).toBe(403);
    const otherOrigin = await call(
      'adminLogin',
      'POST',
      'auth/login',
      { email, password: PASSWORD },
      {},
      {
        origin: 'https://evil.example',
        'sec-fetch-site': '', // a browser without Fetch Metadata: Origin decides
      },
    );
    expect(otherOrigin.status).toBe(403);
    // Behind Static Web Apps the function sees an internal Host while the browser's Origin is
    // the public hostname; Sec-Fetch-Site: same-origin must still let the sign-in through.
    const behindProxy = await call(
      'adminLogin',
      'POST',
      'auth/login',
      { email, password: 'wrong password' },
      {},
      { origin: 'https://admin.public.example', host: 'internal-functions-host' },
    );
    expect(behindProxy.status).toBe(401);
  });

  it('wrong password, unknown email and non-admin all get the same 401', async () => {
    const plain = await makeUser({ isAdmin: false });
    const admin = await makeUser({ isAdmin: true });
    const call = client();
    const a = await call<{ error: { message: string } }>('adminLogin', 'POST', 'auth/login', {
      email: plain.email,
      password: PASSWORD,
    });
    const b = await call<{ error: { message: string } }>('adminLogin', 'POST', 'auth/login', {
      email: admin.email,
      password: 'wrong password',
    });
    const c = await call<{ error: { message: string } }>('adminLogin', 'POST', 'auth/login', {
      email: `nobody+${randomUUID()}@example.com`,
      password: PASSWORD,
    });
    expect([a.status, b.status, c.status]).toEqual([401, 401, 401]);
    expect(new Set([a.body.error.message, b.body.error.message, c.body.error.message]).size).toBe(
      1,
    );
  });

  it('password alone gives no session; enrollment, TOTP, replay refusal and revocation work', async () => {
    const { users } = await import('../../../api/src/lib/tables.js');
    const { userId, email } = await makeUser({ isAdmin: true });
    const call = client();

    const login = await call<{ challenge: string; enroll: { secret: string; uri: string } }>(
      'adminLogin',
      'POST',
      'auth/login',
      { email, password: PASSWORD },
    );
    expect(login.body.enroll.uri).toMatch(/^otpauth:\/\/totp\/Inbunden%20Admin/);
    expect((await call('adminMe', 'GET', 'auth/me')).status).toBe(401);
    const bad = await call('adminEnroll', 'POST', 'auth/enroll', {
      challenge: login.body.challenge,
      code: '000000',
    });
    expect(bad.status).toBe(401);
    // A challenge is not a session token.
    const forged = await call(
      'adminMe',
      'GET',
      'auth/me',
      undefined,
      {},
      { cookie: `inb_admin=${login.body.challenge}` },
    );
    expect(forged.status).toBe(401);

    const secret = login.body.enroll.secret;
    const code = hotp(base32Decode(secret), stepAt());
    const ok = await call('adminEnroll', 'POST', 'auth/enroll', {
      challenge: login.body.challenge,
      code,
    });
    expect(ok.status).toBe(200);
    const cookie = ok.cookies?.find((c) => c.name === 'inb_admin');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' });
    expect((await call<{ email: string }>('adminMe', 'GET', 'auth/me')).body.email).toBe(email);
    const row = await users.get(userId);
    expect(row?.adminTotpSecret).toBeTruthy();
    expect(row?.adminTotpSecret).not.toContain(secret);

    // Second sign-in: the same code (same time step) is a replay.
    await call('adminLogout', 'POST', 'auth/logout', {});
    const login2 = await call<{ challenge: string; enroll: null }>(
      'adminLogin',
      'POST',
      'auth/login',
      { email, password: PASSWORD },
    );
    expect(login2.body.enroll).toBeNull();
    expect(
      (await call('adminTotp', 'POST', 'auth/totp', { challenge: login2.body.challenge, code }))
        .status,
    ).toBe(401);
    const next = hotp(base32Decode(secret), stepAt() + 1);
    expect(
      (
        await call('adminTotp', 'POST', 'auth/totp', {
          challenge: login2.body.challenge,
          code: next,
        })
      ).status,
    ).toBe(200);
    expect((await call('adminMe', 'GET', 'auth/me')).status).toBe(200);

    // Revoking isAdmin ends the session on the next request.
    await users.merge(userId, { isAdmin: false });
    expect((await call('adminMe', 'GET', 'auth/me')).status).toBe(401);
  });

  it('a password reset on the main site (sessionVersion) ends admin sessions', async () => {
    const { users } = await import('../../../api/src/lib/tables.js');
    const { userId, email } = await makeUser({ isAdmin: true });
    const call = client();
    expect((await signIn(call, email)).status).toBe(200);
    await users.merge(userId, { sessionVersion: 2 });
    expect((await call('adminMe', 'GET', 'auth/me')).status).toBe(401);
  });

  it('rejects session tokens signed with another key (e.g. the customer secret)', async () => {
    const { userId } = await makeUser({ isAdmin: true });
    const token = await new SignJWT({ sv: 1, asv: 0, mfa: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('inbunden-admin')
      .setAudience('inbunden-admin/session')
      .setSubject(userId)
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('dev-only-insecure-jwt-secret-change-me'));
    const call = client();
    const res = await call(
      'adminMe',
      'GET',
      'auth/me',
      undefined,
      {},
      { cookie: `inb_admin=${token}` },
    );
    expect(res.status).toBe(401);
  });

  it('users: edit, self-protection, delete, and every change is audited', async () => {
    const { users, lookups, audit } = await import('../../../api/src/lib/tables.js');
    const me = await makeUser({ isAdmin: true });
    const other = await makeUser({ isAdmin: false });
    const call = client();
    expect((await signIn(call, me.email)).status).toBe(200);

    const list = await call<{ items: { id: string }[] }>(
      'usersList',
      'GET',
      `users?q=${encodeURIComponent(other.email)}`,
    );
    expect(list.body.items.map((u) => u.id)).toEqual([other.userId]);
    const detail = await call<{ user: Record<string, unknown> }>(
      'usersGet',
      'GET',
      `users/${other.userId}`,
      undefined,
      { id: other.userId },
    );
    expect(JSON.stringify(detail.body)).not.toMatch(/passwordHash|scrypt|adminTotpSecret/);

    expect(
      (
        await call(
          'usersUpdate',
          'PATCH',
          `users/${me.userId}`,
          { isAdmin: false },
          { id: me.userId },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          'usersDelete',
          'DELETE',
          `users/${me.userId}`,
          { confirm: me.email },
          { id: me.userId },
        )
      ).status,
    ).toBe(403);

    const newEmail = `renamed+${randomUUID()}@example.com`;
    const upd = await call(
      'usersUpdate',
      'PATCH',
      `users/${other.userId}`,
      { email: newEmail, lang: 'sv', isAdmin: true },
      { id: other.userId },
    );
    expect(upd.status).toBe(200);
    expect(await users.get(other.userId)).toMatchObject({
      email: newEmail,
      lang: 'sv',
      isAdmin: true,
    });
    expect((await lookups.get('email', newEmail))?.userId).toBe(other.userId);
    expect(await lookups.get('email', other.email)).toBeNull();

    const taken = await call(
      'usersUpdate',
      'PATCH',
      `users/${other.userId}`,
      { email: me.email },
      { id: other.userId },
    );
    expect(taken.status).toBe(409);

    expect(
      (
        await call(
          'usersDelete',
          'DELETE',
          `users/${other.userId}`,
          { confirm: 'wrong' },
          { id: other.userId },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          'usersDelete',
          'DELETE',
          `users/${other.userId}`,
          { confirm: newEmail },
          { id: other.userId },
        )
      ).status,
    ).toBe(200);
    expect(await users.get(other.userId)).toBeNull();
    expect(await lookups.get('email', newEmail)).toBeNull();

    const log = await audit.listMonth(new Date().toISOString().slice(0, 7), 5000);
    const mine = log.filter((r) => r.actorId === me.userId);
    expect(
      mine.some(
        (r) => r.action === 'usersUpdate' && r.ok && r.detail?.includes('isAdmin false → true'),
      ),
    ).toBe(true);
    expect(mine.some((r) => r.action === 'usersDelete' && r.ok && r.target === other.userId)).toBe(
      true,
    );
    expect(mine.some((r) => r.action === 'usersUpdate' && !r.ok)).toBe(true);
  });

  it('VAT report counts paid orders by payment date, refunds apart', async () => {
    const { orders } = await import('../../../api/src/lib/tables.js');
    const me = await makeUser({ isAdmin: true });
    const buyer = await makeUser({ isAdmin: false });
    const call = client();
    expect((await signIn(call, me.email)).status).toBe(200);
    expect((await call('settingsUpdate', 'PUT', 'settings', { vatRatePct: 25 })).status).toBe(200);

    const day = `20${String(10 + (rnd() % 15)).padStart(2, '0')}-0${1 + (rnd() % 9)}-1${rnd() % 10}`;
    const base = {
      userId: buyer.userId,
      bookId: 'b',
      bookVersion: 1,
      libraryId: 'l',
      title: 'T',
      format: 'pdf',
      showMeta: true,
      coverPhotoId: null,
      layout: {},
      pages: [],
      photoIds: [],
      pageCount: 24,
      photoCount: 40,
      contentHash: 'h',
      subtotalCents: 900,
      discountCents: 0,
      promoCode: null,
      amountCents: 900,
      currency: 'eur',
      paymentProvider: 'stripe',
      failureReason: null,
      stripePaymentIntentId: 'pi_test',
      paidAt: `${day}T10:00:00.000Z`,
      pdfBlob: null,
      pdfVersion: 0,
      pdfBytes: null,
      pdfPages: null,
      readyAt: null,
      shareToken: null,
      createdAt: `${day}T09:00:00.000Z`,
    } as const;
    const ids: string[] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await orders.upsert({ ...base, orderId: ids[0]!, status: 'ready' } as never);
    await orders.upsert({
      ...base,
      orderId: ids[1]!,
      status: 'paid',
      amountCents: 720,
      discountCents: 180,
      promoCode: 'TEST20',
    } as never);
    await orders.upsert({ ...base, orderId: ids[2]!, status: 'refunded' } as never);
    await orders.upsert({
      ...base,
      orderId: ids[3]!,
      status: 'ready',
      paymentProvider: 'fake',
    } as never);

    type Report = {
      ratePct: number;
      rows: { orderId: string; status: string; vatCents: number; grossCents: number }[];
    };
    const r = await call<Report>(
      'reportsVat',
      'GET',
      `reports/vat?from=${day}&to=${day}&provider=stripe`,
    );
    expect(r.status).toBe(200);
    expect(r.body.ratePct).toBe(25);
    const mine = r.body.rows.filter((x) => ids.includes(x.orderId));
    expect(mine.map((x) => [x.status, x.grossCents, x.vatCents]).sort()).toEqual(
      [
        ['paid', 720, 144],
        ['ready', 900, 180],
        ['refunded', 900, 180],
      ].sort(),
    );
  });

  it('orders: delete needs the id, paid Stripe orders need the test-mode box, and is audited', async () => {
    const { orders, books, lookups, libraries, audit } =
      await import('../../../api/src/lib/tables.js');
    const me = await makeUser({ isAdmin: true });
    const buyer = await makeUser({ isAdmin: false });
    const call = client();
    expect((await signIn(call, me.email)).status).toBe(200);

    const libraryId = randomUUID();
    await libraries.upsert({ userId: buyer.userId, libraryId, status: 'ready' } as never);
    const bookId = randomUUID();
    const fakeId = randomUUID();
    const stripeId = randomUUID();
    await books.upsert({
      userId: buyer.userId,
      bookId,
      libraryId,
      title: 'T',
      format: 'square',
      showMeta: true,
      coverPhotoId: null,
      layout: {},
      pages: [],
      manualLayout: false,
      photoIds: [],
      pageCount: 24,
      version: 1,
      status: 'ordered',
      orderId: fakeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);
    const base = {
      userId: buyer.userId,
      bookId,
      libraryId,
      title: 'T',
      layout: {},
      pages: [],
      photoIds: [],
      amountCents: 900,
      promoCode: null,
      pdfBlob: null,
      createdAt: new Date().toISOString(),
      status: 'ready',
    };
    const share = `share-${randomUUID()}`;
    await orders.upsert({
      ...base,
      orderId: fakeId,
      paymentProvider: 'fake',
      shareToken: share,
    } as never);
    await lookups.insert('share', share, { userId: buyer.userId, value: fakeId });
    await orders.upsert({ ...base, orderId: stripeId, paymentProvider: 'stripe' } as never);

    const del = (orderId: string, body: unknown) =>
      call('ordersDelete', 'DELETE', `orders/${buyer.userId}/${orderId}`, body, {
        userId: buyer.userId,
        orderId,
      });

    expect((await del(fakeId, { confirm: 'wrong' })).status).toBe(400);
    expect((await del(fakeId, { confirm: fakeId })).status).toBe(200);
    expect(await orders.get(buyer.userId, fakeId)).toBeNull();
    expect(await lookups.get('share', share)).toBeNull();
    const book = await books.get(buyer.userId, bookId);
    expect(book?.status).toBe('draft');
    expect(book?.orderId).toBeNull();

    expect((await del(stripeId, { confirm: stripeId })).status).toBe(400);
    expect(await orders.get(buyer.userId, stripeId)).not.toBeNull();
    expect((await del(stripeId, { confirm: stripeId, stripeTest: true })).status).toBe(200);
    expect(await orders.get(buyer.userId, stripeId)).toBeNull();

    const log = await audit.listMonth(new Date().toISOString().slice(0, 7), 5000);
    expect(
      log.some(
        (r) =>
          r.actorId === me.userId &&
          r.action === 'ordersDelete' &&
          r.ok &&
          r.target === `${buyer.userId}/${fakeId}`,
      ),
    ).toBe(true);
  });
});
