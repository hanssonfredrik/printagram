import { pageCount, price } from '@printagram/shared';
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
import { markFailed, markPaid, notifyOrderReady } from '../lib/orderService.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';
import { books, libraries, lookups, orders, photos, type OrderRow } from '../lib/tables.js';
import { orderView, photoView } from '../lib/views.js';

const ORDER_REUSE_MINUTES = 55;

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

/** Creates an order for a draft: server-side price, frozen snapshot, Stripe PaymentIntent (or mock). */
route(
  'ordersCreate',
  { methods: ['POST'], route: 'orders', auth: 'required' },
  async ({ req, user }) => {
    // Anonymous sessions may open an order (the Payment Element needs a PaymentIntent before the
    // account form is submitted); registering later upgrades the same user row in place.
    const body = await readJson<{ bookId?: unknown }>(req);
    const bookId = String(body.bookId ?? '');
    const book = await books.get(user.userId, bookId);
    if (!book) throw notFound('Book');
    if (book.photoIds.length === 0) throw badRequest('EMPTY_BOOK', 'Choose at least one photo.');

    // Reuse an open order for the same book version so refreshes do not create duplicates.
    const open = (await orders.list(user.userId)).find(
      (o) =>
        o.bookId === bookId &&
        o.status === 'created' &&
        o.bookVersion === book.version &&
        Date.now() - new Date(o.createdAt).getTime() < ORDER_REUSE_MINUTES * 60_000,
    );
    if (open) {
      let clientSecret: string | null = null;
      if (stripeEnabled() && open.stripePaymentIntentId) {
        const pi = await stripe().paymentIntents.retrieve(open.stripePaymentIntentId);
        clientSecret = pi.client_secret;
      }
      return json({
        order: orderView(open, await coverThumb(open)),
        clientSecret,
        mock: !stripeEnabled(),
      });
    }

    const pages = pageCount(book.photoIds.length, book.format);
    const amountCents = price(pages, config.pricing).totalCents;
    const row: OrderRow = {
      orderId: newId(),
      userId: user.userId,
      bookId,
      bookVersion: book.version,
      libraryId: book.libraryId,
      title: book.title,
      format: book.format,
      showMeta: book.showMeta,
      coverPhotoId: book.coverPhotoId,
      photoIds: book.photoIds,
      pageCount: pages,
      photoCount: book.photoIds.length,
      amountCents,
      currency: 'eur',
      status: 'created',
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

    let clientSecret: string | null = null;
    if (stripeEnabled()) {
      const pi = await stripe().paymentIntents.create(
        {
          amount: amountCents,
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          description: `Printagram PDF photo book — ${pages} pages`,
          receipt_email: user.email ?? undefined,
          metadata: { orderId: row.orderId, userId: user.userId, bookId },
        },
        { idempotencyKey: `order:${row.orderId}` },
      );
      row.stripePaymentIntentId = pi.id;
      clientSecret = pi.client_secret;
    }
    await orders.upsert(row);
    return json(
      { order: orderView(row, await coverThumb(row)), clientSecret, mock: !stripeEnabled() },
      201,
    );
  },
);

route('ordersList', { methods: ['GET'], route: 'orders', auth: 'required' }, async ({ user }) => {
  const rows = (await orders.list(user.userId)).filter(
    (o) => o.status !== 'created' || Date.now() - new Date(o.createdAt).getTime() < 3600_000,
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

/** Webhook fallback: ask Stripe directly whether the PaymentIntent succeeded. */
route(
  'ordersSync',
  { methods: ['POST'], route: 'orders/{id}/sync', auth: 'required' },
  async ({ req, user }) => {
    let o = await ownedOrder(user.userId, req.params.id ?? '');
    if (o.status === 'created' && stripeEnabled() && o.stripePaymentIntentId) {
      const pi = await stripe().paymentIntents.retrieve(o.stripePaymentIntentId);
      if (pi.status === 'succeeded') o = await markPaid(o, pi.id);
      else if (pi.status === 'canceled') {
        await markFailed(o, 'failed');
        o = { ...o, status: 'failed' };
      }
    }
    return json(orderView(o, await coverThumb(o)));
  },
);

/** Development/mock payments: only available when Stripe is not configured. */
route(
  'ordersMockPay',
  { methods: ['POST'], route: 'orders/{id}/mock-pay', auth: 'required' },
  async ({ req, user }) => {
    if (stripeEnabled())
      throw forbidden('MOCK_DISABLED', 'Mock payments are disabled when Stripe is configured.');
    const o = await ownedOrder(user.userId, req.params.id ?? '');
    const body = await readJson<{ outcome?: unknown }>(req);
    if (body.outcome === 'fail') {
      await markFailed(o, 'failed');
      throw new HttpError(
        402,
        'CARD_DECLINED',
        'Your card was declined. Try another card or Apple Pay / Google Pay.',
      );
    }
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
