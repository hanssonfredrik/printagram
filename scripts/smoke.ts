import { readFileSync } from 'node:fs';
/**
 * End-to-end smoke test against a running API (func host + Azurite).
 *   npx tsx scripts/smoke.ts                 # http://localhost:7071
 *   API_URL=http://localhost:4280 npx tsx scripts/smoke.ts
 */
const base = (process.env.API_URL ?? 'http://localhost:7071').replace(/\/$/, '');
let cookie = '';

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  raw?: { text: string; headers: Record<string, string> },
): Promise<{ status: number; body: T; headers: Headers }> {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(raw?.headers ?? {}),
      cookie,
      origin: 'http://localhost:7071',
    },
    body: raw ? raw.text : body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0]!;
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed as T, headers: res.headers };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

// 1x1 JPEG (smallest valid file)
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

/** Cron secret: env var, else the one start-local.ps1 generated in api/local.settings.json. */
function cronSecret(): string {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  try {
    const j = JSON.parse(
      readFileSync('api/local.settings.json', 'utf8').replace(String.fromCharCode(0xfeff), ''),
    ) as { Values: Record<string, string> };
    return j.Values.CRON_SECRET ?? '';
  } catch {
    return '';
  }
}

async function main() {
  const ok = (label: string) => console.log(`✓ ${label}`);

  const cfg = await call<{
    payment: { provider: string; testCards: { number: string }[] };
    pricing: { baseCents: number };
  }>('GET', '/config');
  assert(cfg.status === 200 && cfg.body.pricing.baseCents === 900, 'config');
  assert(
    cfg.body.payment.provider === 'fake' && cfg.body.payment.testCards.length === 3,
    'fake provider with test cards',
  );
  ok(`config (payment provider=${cfg.body.payment.provider})`);

  const anon = await call<{ user: { id: string; authLevel: string } }>(
    'POST',
    '/session/anonymous',
  );
  assert(
    anon.status === 200 && anon.body.user.authLevel === 'anonymous' && cookie,
    'anonymous session',
  );
  ok(`anonymous session ${anon.body.user.id}`);

  const lib = await call<{ id: string; status: string }>('POST', '/libraries', {
    source: 'export',
    label: 'instagram-smoke.zip',
  });
  assert(
    lib.status === 201 || lib.status === 200,
    `create library ${lib.status} ${JSON.stringify(lib.body)}`,
  );
  ok(`library ${lib.body.id}`);

  const items = Array.from({ length: 5 }).map((_, i) => ({
    key: `ex_smoke${i}`,
    postKey: `p_smoke${Math.floor(i / 2)}`,
    takenAt: new Date(Date.UTC(2025, i, 10)).toISOString(),
    caption: `Caption ${i} å`,
    isVideo: i === 4,
    carouselIdx: i % 2,
    carouselCount: i < 4 ? 2 : 1,
    width: 1080,
    height: 1080,
    mime: i === 4 ? null : 'image/jpeg',
  }));
  const reg = await call<
    {
      key: string;
      photoId: string;
      skipped: boolean;
      origPutUrl: string | null;
      thumbPutUrl: string | null;
    }[]
  >('POST', `/libraries/${lib.body.id}/photos/register`, { items, incremental: false });
  assert(
    reg.status === 200 && reg.body.length === 5,
    `register ${reg.status} ${JSON.stringify(reg.body).slice(0, 200)}`,
  );
  ok(`registered ${reg.body.length} photos`);

  for (const r of reg.body) {
    if (!r.origPutUrl) continue;
    for (const url of [r.origPutUrl, r.thumbPutUrl!]) {
      const put = await fetch(url, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': 'image/jpeg' },
        body: JPEG,
      });
      assert(put.status === 201, `blob PUT ${put.status} ${await put.text()}`);
    }
  }
  ok('uploaded originals + thumbs via SAS');

  const confirm = await call<{ readyCount: number }>(
    'POST',
    `/libraries/${lib.body.id}/photos/confirm`,
    {
      photos: reg.body.map((r) => ({
        photoId: r.photoId,
        takenAt: items.find((it) => it.key === r.key)!.takenAt,
      })),
    },
  );
  assert(
    confirm.status === 200 && confirm.body.readyCount === 4,
    `confirm ${JSON.stringify(confirm.body)}`,
  );
  const complete = await call<{ photoCount: number; status: string; keptUntil: string }>(
    'POST',
    `/libraries/${lib.body.id}/imports/complete`,
    { label: 'instagram-smoke.zip' },
  );
  assert(
    complete.status === 200 && complete.body.status === 'ready' && complete.body.photoCount === 4,
    `complete ${JSON.stringify(complete.body)}`,
  );
  ok(
    `import complete: ${complete.body.photoCount} photos, kept until ${complete.body.keptUntil.slice(0, 10)}`,
  );

  const read = await call<{ library: { id: string }; read: { baseUrl: string; sas: string } }>(
    'GET',
    `/libraries/${lib.body.id}`,
  );
  assert(read.status === 200 && read.body.read?.sas, 'read sas');
  const photos = await call<{
    photos: { id: string; thumbUrl: string; caption: string }[];
    cursor: string | null;
  }>('GET', `/libraries/${lib.body.id}/photos`);
  assert(
    photos.status === 200 && photos.body.photos.length === 5,
    `photos ${photos.body.photos.length}`,
  );
  const still = photos.body.photos.find((p) => p.thumbUrl)!;
  const thumb = await fetch(`${read.body.read.baseUrl}/${still.thumbUrl}?${read.body.read.sas}`);
  assert(thumb.status === 200, `thumb GET via container SAS ${thumb.status}`);
  ok('listed photos and fetched a thumbnail with the container read SAS');

  const stills = photos.body.photos.filter((p) => !p.caption.includes('4')).map((p) => p.id);
  const draft = await call<{ id: string; pageCount: number; version: number }>('POST', '/books', {
    libraryId: lib.body.id,
    title: 'Smoke book',
    format: 'square',
    showMeta: true,
    layout: { density: '2', fullBleed: false },
    pages: [
      { template: '2-stack', photoIds: stills.slice(0, 2) },
      { template: '2-side', photoIds: stills.slice(2, 4) },
    ],
  });
  assert(draft.status === 201 && draft.body.pageCount === 5, `draft ${JSON.stringify(draft.body)}`);
  ok(`draft book ${draft.body.id} (${draft.body.pageCount} pages)`);

  const badPages = await call<{ error: { code: string } }>('POST', '/books', {
    libraryId: lib.body.id,
    title: 'Bad book',
    format: 'square',
    showMeta: true,
    pages: [{ template: '1-margin', photoIds: ['not-in-this-library'] }],
  });
  assert(badPages.status === 400, `pages with a foreign photo rejected (${badPages.status})`);
  ok('pages with photos from outside the library are rejected');

  const anonOrder = await call<{ order: { id: string; status: string } }>('POST', '/orders', {
    bookId: draft.body.id,
  });
  assert(
    anonOrder.status === 201 && anonOrder.body.order.status === 'created',
    'anonymous session can open an order',
  );
  ok(
    'anonymous session can open an order (account required before paying, enforced by the client)',
  );

  const email = `smoke+${Date.now()}@example.com`;
  const reg2 = await call<{ authLevel: string; email: string }>('POST', '/auth/register', {
    email,
    password: 'correct horse battery',
  });
  assert(
    reg2.status === 200 && reg2.body.authLevel === 'password',
    `register ${JSON.stringify(reg2.body)}`,
  );
  const dup = await call<{ error: { code: string } }>('POST', '/auth/register', {
    email,
    password: 'another password!',
  });
  assert(dup.status === 200 || dup.status === 409, 'duplicate register handled');
  ok(`registered ${email}`);

  const order = await call<{
    order: { id: string; status: string; amountCents: number };
    provider: string;
    clientSecret: string | null;
  }>('POST', '/orders', { bookId: draft.body.id });
  assert(
    order.status === 200 &&
      order.body.order.id === anonOrder.body.order.id &&
      order.body.order.amountCents === 900,
    `order reuse ${JSON.stringify(order.body)}`,
  );
  ok(
    `order ${order.body.order.id} reused, €${order.body.order.amountCents / 100}, provider=${order.body.provider}`,
  );

  const early = await call<{ error: { code: string } }>(
    'POST',
    `/orders/${order.body.order.id}/pdf/upload-url`,
    {},
  );
  assert(early.status === 403 && early.body.error.code === 'NOT_PAID', 'pdf gated before payment');
  ok('PDF upload gated until paid');

  const oid = order.body.order.id;
  const badCode = await call<{ rejected?: { code: string } }>('POST', `/orders/${oid}/promo`, {
    code: 'NOPE',
  });
  assert(
    badCode.status === 200 && badCode.body.rejected?.code === 'not_found',
    'unknown promo rejected',
  );
  const promo = await call<{
    order: { amountCents: number; discountCents: number; promoCode: string };
  }>('POST', `/orders/${oid}/promo`, { code: 'test20' });
  assert(
    promo.status === 200 &&
      promo.body.order.promoCode === 'TEST20' &&
      promo.body.order.discountCents === 180 &&
      promo.body.order.amountCents === 720,
    `promo TEST20 ${JSON.stringify(promo.body)}`,
  );
  ok('discount code TEST20 applied: €9 → €7,20');

  const declined = await call<{ error: { code: string; message: string } }>(
    'POST',
    `/orders/${oid}/pay-test`,
    {
      card: '4000 0000 0000 0002',
    },
  );
  assert(
    declined.status === 402 && declined.body.error.code === 'CARD_DECLINED',
    `decline ${JSON.stringify(declined.body)}`,
  );
  const afterDecline = await call<{ status: string; failureReason: string }>(
    'GET',
    `/orders/${oid}`,
  );
  assert(
    afterDecline.body.status === 'failed' && afterDecline.body.failureReason,
    'failed order keeps its reason',
  );
  ok('test card 0002 is declined and the reason is stored');

  const paid = await call<{ status: string; failureReason: string | null }>(
    'POST',
    `/orders/${oid}/pay-test`,
    {
      card: '4242 4242 4242 4242',
    },
  );
  assert(
    paid.status === 200 && paid.body.status === 'paid' && paid.body.failureReason === null,
    `retry pay ${JSON.stringify(paid.body)}`,
  );
  ok('retry with test card 4242 succeeds');
  const target = await call<{
    version: number;
    putUrl: string;
    photos: unknown[];
    book: { pageCount: number };
  }>('POST', `/orders/${order.body.order.id}/pdf/upload-url`, {});
  assert(
    target.status === 200 && target.body.photos.length === 4,
    `upload target ${JSON.stringify(target.body).slice(0, 200)}`,
  );
  // Padded past the server's minimum size; pdf/complete checks the %PDF- header and size.
  const pdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(2048, 32),
    Buffer.from('\n%%EOF\n'),
  ]);
  const put = await fetch(target.body.putUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': 'application/pdf' },
    body: pdf,
  });
  assert(put.status === 201, `pdf PUT ${put.status}`);
  const done = await call<{ status: string; shareToken: string | null; pdfBytes: number }>(
    'POST',
    `/orders/${order.body.order.id}/pdf/complete`,
    { version: target.body.version, bytes: pdf.length, pages: 5 },
  );
  assert(
    done.status === 200 && done.body.status === 'ready' && done.body.shareToken,
    `complete ${JSON.stringify(done.body)}`,
  );
  ok(`PDF complete: ready, ${done.body.pdfBytes} bytes, share token issued`);

  const dl = await call<{ url: string }>('GET', `/orders/${order.body.order.id}/download-url`);
  assert(dl.status === 200 && dl.body.url.includes('.pdf'), 'download url');
  const dlRes = await fetch(dl.body.url);
  assert(
    dlRes.status === 200 && (dlRes.headers.get('content-disposition') ?? '').includes('attachment'),
    `download ${dlRes.status}`,
  );
  const share = await call<{ title: string; downloadUrl: string }>(
    'GET',
    `/share/${done.body.shareToken}`,
  );
  assert(
    share.status === 200 && share.body.title === 'Smoke book' && share.body.downloadUrl,
    'share',
  );
  ok('download + share links work');

  const rotated = await call<{ shareToken: string }>(
    'POST',
    `/orders/${order.body.order.id}/share/rotate`,
    {},
  );
  assert(rotated.status === 200 && rotated.body.shareToken, 'rotate share link');
  const oldLink = await call('GET', `/share/${done.body.shareToken}`);
  const newLink = await call('GET', `/share/${rotated.body.shareToken}`);
  assert(oldLink.status === 404 && newLink.status === 200, 'old share link revoked');
  ok('new share link issued, the old one stops working');

  const books = await call<{ id: string; status: string }[]>('GET', '/books');
  assert(
    books.body.find((b) => b.id === draft.body.id)?.status === 'ordered',
    'book marked ordered',
  );
  const libs = await call<{ keptUntil: string }[]>('GET', '/libraries');
  assert(
    new Date(libs.body[0]!.keptUntil) > new Date(complete.body.keptUntil),
    'retention extended by the order',
  );
  ok('book marked ordered, retention extended');

  const me = await call<{ user: { email: string } }>('GET', '/me');
  assert(me.body.user.email === email, 'me');
  const logout = await call('POST', '/auth/logout');
  assert(logout.status === 204, 'logout');
  cookie = '';
  const login = await call<{ email: string }>('POST', '/auth/login', {
    email,
    password: 'correct horse battery',
  });
  assert(login.status === 200 && login.body.email === email, `login ${JSON.stringify(login.body)}`);
  const bad = await call('POST', '/auth/login', { email, password: 'wrong password!' });
  assert(bad.status === 401, 'bad password rejected');
  ok('logout / login / wrong password');

  const cron = await fetch(`${base}/api/cron/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-key': cronSecret(),
    },
    body: JSON.stringify({ task: 'cleanupTokens' }),
  });
  assert(cron.status === 200, `cron ${cron.status} ${await cron.text()}`);
  const cronBad = await fetch(`${base}/api/cron/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-key': 'nope' },
    body: JSON.stringify({ task: 'cleanupTokens' }),
  });
  assert(cronBad.status === 403, 'cron rejects bad key');
  ok('cron endpoint secured');

  const del = await call<{ deleted: boolean }>('DELETE', '/account');
  assert(del.status === 202 && del.body.deleted, `delete account ${del.status}`);
  const after = await call<{ user: unknown }>('GET', '/me');
  assert(after.status === 200 && after.body.user === null, 'session invalid after deletion');
  ok('account deleted');

  console.log('\nAll smoke checks passed.');
}

main().catch((e) => {
  console.error('\n✗', e.message);
  process.exit(1);
});
