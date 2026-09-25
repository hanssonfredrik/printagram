import {
  discountCents,
  normalizePromoCode,
  pageCount,
  price,
  PROMO_MESSAGES,
  promoRejection,
} from '@printagram/shared';
import {
  blobProperties,
  containerReadSas,
  libContainerName,
  PDF_CONTAINER,
  pdfBlobName,
  readSasUrl,
  writeSasUrl,
} from '../lib/blobs.js';
import { config } from '../lib/config.js';
import {
  badRequest,
  conflict,
  forbidden,
  HttpError,
  json,
  notFound,
  readJson,
  route,
} from '../lib/http.js';
import { newId, nowIso, randomToken } from '../lib/ids.js';
import { bookContentHash, markFailed, markPaid, notifyOrderReady } from '../lib/orderService.js';
import { DECLINE_MESSAGES, testCardOutcome } from '../lib/payments/fake.js';
import { paymentProvider } from '../lib/payments/provider.js';
import {
  books,
  libraries,
  lookups,
  orders,
  photos,
  promos,
  type BookRow,
  type OrderRow,
} from '../lib/tables.js';
import { orderView, photoView } from '../lib/views.js';

async function ownedOrder(userId: string, id: string): Promise<OrderRow> {
  const o = await orders.get(userId, id);
  if (!o) throw notFound('Order');
  return o;
}

async function coverThumb(o: OrderRow): Promise<string | null> {
  const lib = await libraries.get(o.userId, o.libraryId);
  if (!lib || lib.status !== 'ready') return null;
  const all = await photos.listAll(o.libraryId);
  const cover =
    all.find((p) => p.photoId === o.coverPhotoId) ??
    all.find((p) => o.photoIds.includes(p.photoId));
  if (!cover?.thumbBlob) return null;
  const read = containerReadSas(libContainerName(o.libraryId));
  return `${read.baseUrl}/${cover.thumbBlob}?${read.sas}`;
}

/** Price for a book at its current content, before any discount. */
function subtotalFor(book: BookRow): { pages: number; subtotalCents: number } {
  const pages = pageCount(book.photoIds.length, book.format);
  return { pages, subtotalCents: price(pages, config.pricing).totalCents };
}

/** Recomputes the amount after a (possibly removed) discount and syncs the provider side. */
async function reprice(
  o: OrderRow,
  promoCode: string | null,
  discount: number,
  email: string | null,
): Promise<{ order: OrderRow; clientSecret: string | null }> {
  const amountCents = Math.max(0, o.subtotalCents - discount);
  let next: OrderRow = { ...o, promoCode, discountCents: discount, amountCents };
  let clientSecret: string | null = null;
  if (amountCents > 0) {
    const started = await paymentProvider().prepare(next, email);
    next = { ...next, stripePaymentIntentId: started.ref };
    clientSecret = started.clientSecret;
  }
  await orders.merge(o.userId, o.orderId, {
    promoCode,
    discountCents: discount,
    amountCents,
    stripePaymentIntentId: next.stripePaymentIntentId,
  });
  return { order: next, clientSecret };
}

/**
 * Opens (or reuses) the order for a draft. The price is computed here from the stored book, never
 * by the browser. An open order is reused while the book content is unchanged.
 */
route(
  'ordersCreate',
  { methods: ['POST'], route: 'orders', auth: 'required' },
  async ({ req, user }) => {
    const provider = paymentProvider();
    const body = await readJson<{ bookId?: unknown }>(req);
    const bookId = String(body.bookId ?? '');
    const book = await books.get(user.userId, bookId);
    if (!book) throw notFound('Book');
    if (book.photoIds.length === 0) throw badRequest('EMPTY_BOOK', 'Choose at least one photo.');
    const contentHash = bookContentHash(book);

    const open = (await orders.list(user.userId))
      .filter(
        (o) =>
          o.bookId === bookId &&
          (o.status === 'created' || o.status === 'failed') &&
          o.contentHash === contentHash &&
          (o.paymentProvider ?? 'fake') === provider.name,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    if (open) {
      const started = open.amountCents > 0 ? await provider.prepare(open, user.email) : null;
      if (started && started.ref !== open.stripePaymentIntentId)
        await orders.merge(user.userId, open.orderId, { stripePaymentIntentId: started.ref });
      return json({
        order: orderView(open, await coverThumb(open)),
        clientSecret: started?.clientSecret ?? null,
        provider: provider.name,
      });
    }

    const { pages, subtotalCents } = subtotalFor(book);
    const row: OrderRow = {
      orderId: newId(),
      userId: user.userId,
      bookId,
      bookVersion: book.version,
      contentHash,
      libraryId: book.libraryId,
      title: book.title,
      format: book.format,
      showMeta: book.showMeta,
      coverPhotoId: book.coverPhotoId,
      photoIds: book.photoIds,
      pageCount: pages,
      photoCount: book.photoIds.length,
      subtotalCents,
      discountCents: 0,
      promoCode: null,
      amountCents: subtotalCents,
      currency: 'eur',
      status: 'created',
      paymentProvider: provider.name,
      failureReason: null,
      stripePaymentIntentId: null,
      paidAt: null,
      pdfBlob: null,
      pdfVersion: 0,
      pdfBytes: null,
      pdfPages: null,
      readyAt: null,
      shareToken: null,
      createdAt: nowIso(),
    };
    const started = await provider.prepare(row, user.email);
    row.stripePaymentIntentId = started.ref;
    await orders.upsert(row);
    return json(
      {
        order: orderView(row, await coverThumb(row)),
        clientSecret: started.clientSecret,
        provider: provider.name,
      },
      201,
    );
  },
);

route('ordersList', { methods: ['GET'], route: 'orders', auth: 'required' }, async ({ user }) => {
  const rows = (await orders.list(user.userId)).filter(
    (o) => o.status === 'paid' || o.status === 'ready' || o.status === 'refunded',
  );
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const out = [];
  for (const o of rows) out.push(orderView(o, await coverThumb(o)));
  return json(out);
});

route(
  'ordersGet',
  { methods: ['GET'], route: 'orders/{id}', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    return json(orderView(o, await coverThumb(o)));
  },
);

/** Asks the payment provider directly (webhook fallback, and after a retried payment). */
route(
  'ordersSync',
  { methods: ['POST'], route: 'orders/{id}/sync', auth: 'required' },
  async ({ req, user }) => {
    let o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status === 'created' || o.status === 'failed') {
      const st = await paymentProvider().status(o);
      if (st.status === 'succeeded') o = await markPaid(o, o.stripePaymentIntentId);
      else if (st.status === 'failed' || st.status === 'canceled')
        o = await markFailed(o, 'failed', st.reason);
    }
    return json(orderView(o, await coverThumb(o)));
  },
);

/**
 * Fake provider only: "pays" with one of the published test cards. The outcome is decided here
 * on the server. Requires a real account so the download link can be emailed.
 */
route(
  'ordersPayTest',
  { methods: ['POST'], route: 'orders/{id}/pay-test', auth: 'required' },
  async ({ req, user }) => {
    if (paymentProvider().name !== 'fake') throw notFound('Route');
    if (user.authLevel !== 'password')
      throw forbidden(
        'ACCOUNT_REQUIRED',
        'Create your account first so we can send your download link.',
      );
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status === 'paid' || o.status === 'ready') return json(orderView(o, await coverThumb(o)));
    if (o.status !== 'created' && o.status !== 'failed')
      throw conflict('ORDER_CLOSED', 'This order can no longer be paid.');
    const body = await readJson<{ card?: unknown }>(req);
    const card = testCardOutcome(String(body.card ?? ''));
    if (!card)
      throw badRequest('UNKNOWN_TEST_CARD', 'Use one of the test cards shown on the page.');
    if (card.outcome !== 'succeeded') {
      const reason = DECLINE_MESSAGES[card.outcome];
      await markFailed(o, 'failed', reason);
      throw new HttpError(402, card.outcome.toUpperCase(), reason);
    }
    const paid = await markPaid(o, `fake_${o.orderId}`);
    return json(orderView(paid, await coverThumb(paid)));
  },
);

/** Applies (or removes, with an empty code) a discount code on an open order. */
route(
  'ordersPromo',
  { methods: ['POST'], route: 'orders/{id}/promo', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status !== 'created' && o.status !== 'failed')
      throw conflict('ORDER_CLOSED', 'This order can no longer be changed.');
    const body = await readJson<{ code?: unknown }>(req);
    const raw = typeof body.code === 'string' ? body.code : '';
    if (!raw.trim()) {
      const { order, clientSecret } = await reprice(o, null, 0, user.email);
      return json({ order: orderView(order, await coverThumb(order)), clientSecret });
    }
    const code = normalizePromoCode(raw).slice(0, 40);
    if (!(await lookups.rateLimit('promo', user.userId, 10)))
      throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.');
    const promo = await promos.get(code);
    let rejection = promoRejection(promo);
    if (
      !rejection &&
      promo!.perUserOnce &&
      (await lookups.get('promo_use', `${code}:${user.userId}`))
    )
      rejection = 'already_used';
    if (rejection) {
      return json({
        order: orderView(o, await coverThumb(o)),
        clientSecret: null,
        rejected: { code: rejection, reason: PROMO_MESSAGES[rejection] },
      });
    }
    const { order, clientSecret } = await reprice(
      o,
      code,
      discountCents(o.subtotalCents ?? o.amountCents, promo!),
      user.email,
    );
    return json({ order: orderView(order, await coverThumb(order)), clientSecret });
  },
);

/** A 0-total order (100 % discount) is confirmed without any payment step. */
route(
  'ordersConfirmFree',
  { methods: ['POST'], route: 'orders/{id}/confirm-free', auth: 'required' },
  async ({ req, user }) => {
    if (user.authLevel !== 'password')
      throw forbidden(
        'ACCOUNT_REQUIRED',
        'Create your account first so we can send your download link.',
      );
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status === 'paid' || o.status === 'ready') return json(orderView(o, await coverThumb(o)));
    if (o.amountCents !== 0) throw conflict('NOT_FREE', 'This order needs a payment.');
    const paid = await markPaid(o, null);
    return json(orderView(paid, await coverThumb(paid)));
  },
);

/** Payment gate: write SAS for the PDF is only issued for paid orders. */
route(
  'ordersPdfUploadUrl',
  { methods: ['POST'], route: 'orders/{id}/pdf/upload-url', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    const body = await readJson<{ regenerate?: unknown }>(req);
    const regenerate = body.regenerate === true;
    if (!(o.status === 'paid' || (o.status === 'ready' && regenerate)))
      throw forbidden('NOT_PAID', 'This order has not been paid yet.');
    const lib = await libraries.get(user.userId, o.libraryId);
    if (!lib || lib.status !== 'ready')
      throw conflict(
        'LIBRARY_EXPIRED',
        'The photos for this book are no longer stored, so the PDF cannot be rebuilt.',
      );
    const all = await photos.listAll(o.libraryId);
    const byId = new Map(all.map((p) => [p.photoId, p]));
    const selected = o.photoIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.status === 'ready');
    const version = o.status === 'ready' ? o.pdfVersion + 1 : Math.max(1, o.pdfVersion || 1);
    return json({
      version,
      putUrl: writeSasUrl(PDF_CONTAINER, pdfBlobName(o.orderId, version), 60),
      photos: selected.map(photoView),
      read: containerReadSas(libContainerName(o.libraryId)),
      book: {
        title: o.title,
        format: o.format,
        showMeta: o.showMeta,
        coverPhotoId: o.coverPhotoId,
        photoCount: selected.length,
        pageCount: o.pageCount,
      },
    });
  },
);

route(
  'ordersPdfComplete',
  { methods: ['POST'], route: 'orders/{id}/pdf/complete', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status !== 'paid' && o.status !== 'ready')
      throw forbidden('NOT_PAID', 'This order has not been paid yet.');
    const body = await readJson<{ version?: unknown; bytes?: unknown; pages?: unknown }>(req);
    const version = Number(body.version);
    const bytes = Number(body.bytes);
    const pages = Number(body.pages);
    if (!Number.isInteger(version) || version < 1)
      throw badRequest('INVALID_FIELD', 'version is required.');
    const name = pdfBlobName(o.orderId, version);
    const props = await blobProperties(PDF_CONTAINER, name);
    if (!props || props.size === 0) throw conflict('PDF_MISSING', 'The PDF upload did not arrive.');
    if (Number.isFinite(bytes) && bytes > 0 && Math.abs(props.size - bytes) > 0)
      throw conflict('PDF_SIZE_MISMATCH', 'The uploaded PDF is incomplete.');
    const wasReady = o.status === 'ready';
    let shareToken = o.shareToken;
    if (!shareToken) {
      shareToken = randomToken(18);
      await lookups.upsert('share', shareToken, { userId: o.userId, value: o.orderId });
    }
    const patch: Partial<OrderRow> = {
      status: 'ready',
      pdfBlob: name,
      pdfVersion: version,
      pdfBytes: props.size,
      pdfPages: Number.isFinite(pages) ? pages : null,
      readyAt: nowIso(),
      shareToken,
    };
    await orders.merge(user.userId, o.orderId, patch);
    const updated = { ...o, ...patch } as OrderRow;
    if (!wasReady) await notifyOrderReady(updated);
    return json(orderView(updated, await coverThumb(updated)));
  },
);

function pdfFileName(o: OrderRow): string {
  const slug =
    o.title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'book';
  return `printagram-${slug}.pdf`;
}

route(
  'ordersDownloadUrl',
  { methods: ['GET'], route: 'orders/{id}/download-url', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status !== 'ready' || !o.pdfBlob)
      throw forbidden('PDF_MISSING', 'The PDF for this order is not ready yet.');
    return json({ url: readSasUrl(PDF_CONTAINER, o.pdfBlob, pdfFileName(o)) });
  },
);

route(
  'ordersDownload',
  { methods: ['GET'], route: 'orders/{id}/download', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status !== 'ready' || !o.pdfBlob)
      throw forbidden('PDF_MISSING', 'The PDF for this order is not ready yet.');
    return {
      status: 302,
      headers: {
        Location: readSasUrl(PDF_CONTAINER, o.pdfBlob, pdfFileName(o)),
        'Cache-Control': 'no-store',
      },
    };
  },
);

route(
  'ordersShareRotate',
  { methods: ['POST'], route: 'orders/{id}/share/rotate', auth: 'required' },
  async ({ req, user }) => {
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.shareToken) await lookups.delete('share', o.shareToken);
    const shareToken = randomToken(18);
    await lookups.upsert('share', shareToken, { userId: o.userId, value: o.orderId });
    await orders.merge(user.userId, o.orderId, { shareToken });
    return json({ shareUrl: `${config.appBaseUrl}/s/${shareToken}` });
  },
);

/** Public share page data. */
route('share', { methods: ['GET'], route: 'share/{token}', auth: 'none' }, async ({ req }) => {
  const token = (req.params.token ?? '').slice(0, 64);
  const l = await lookups.get('share', token);
  if (!l?.userId || !l.value) throw notFound('Share link');
  const o = await orders.get(l.userId, l.value);
  if (!o) throw notFound('Share link');
  const downloadUrl =
    o.status === 'ready' && o.pdfBlob ? readSasUrl(PDF_CONTAINER, o.pdfBlob, pdfFileName(o)) : '';
  return json({
    title: o.title,
    pages: o.pageCount,
    bytes: o.pdfBytes,
    format: o.format,
    downloadUrl,
  });
});
