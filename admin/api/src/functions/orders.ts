import {
  badRequest,
  deleteOrder,
  json,
  notFound,
  orders,
  PDF_CONTAINER,
  readJson,
  readSasUrl,
  users,
} from '../core.js';
import { adminRoute } from '../lib/route.js';
import { getVatRatePct } from '../lib/settings.js';
import { addTo, emptyTotals, splitVat, type VatTotals } from '../lib/vat.js';
import { orderView, type OrderLike } from '../lib/views.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** [from, to] as yyyy-mm-dd (inclusive), validated; defaults to the last 30 days. */
export function range(q: URLSearchParams): { from: string; to: string } {
  const to = q.get('to') || new Date().toISOString().slice(0, 10);
  const from = q.get('from') || new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  if (!DAY.test(from) || !DAY.test(to) || from > to)
    throw badRequest('INVALID_RANGE', 'from and to must be yyyy-mm-dd with from ≤ to.');
  if (Date.parse(to) - Date.parse(from) > 3 * 366 * 86_400_000)
    throw badRequest('INVALID_RANGE', 'The range can be at most three years.');
  return { from, to };
}

const inRange = (iso: string | null, from: string, to: string) =>
  !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;

async function emails(): Promise<Map<string, string | null>> {
  const m = new Map<string, string | null>();
  for await (const u of users.scanAll()) m.set(u.userId, u.email);
  return m;
}

/** GET orders?status=&provider=&from=&to=&q=&limit=&offset= (dates filter on createdAt). */
adminRoute('ordersList', { methods: ['GET'], route: 'orders' }, async ({ req }) => {
  const status = req.query.get('status') ?? '';
  const provider = req.query.get('provider') ?? '';
  const q = (req.query.get('q') ?? '').trim().toLowerCase();
  const { from, to } = range(req.query);
  const byUser = await emails();
  const all: OrderLike[] = [];
  for await (const o of orders.scanAll()) {
    if (status && o.status !== status) continue;
    if (provider && o.paymentProvider !== provider) continue;
    if (!inRange(o.createdAt, from, to)) continue;
    if (
      q &&
      !o.orderId.includes(q) &&
      !(byUser.get(o.userId) ?? '').includes(q) &&
      !(o.promoCode ?? '').toLowerCase().includes(q) &&
      !(o.stripePaymentIntentId ?? '').toLowerCase().includes(q)
    )
      continue;
    all.push(o);
  }
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const limit = Math.min(500, Math.max(1, Number(req.query.get('limit') ?? 100) || 100));
  const offset = Math.max(0, Number(req.query.get('offset') ?? 0) || 0);
  const totals = { count: all.length, amountCents: 0, paidCount: 0, paidCents: 0 };
  for (const o of all) {
    totals.amountCents += o.amountCents;
    if (o.status === 'paid' || o.status === 'ready') {
      totals.paidCount++;
      totals.paidCents += o.amountCents;
    }
  }
  return json({
    total: all.length,
    offset,
    limit,
    totals,
    items: all.slice(offset, offset + limit).map((o) => orderView(o, byUser.get(o.userId))),
  });
});

adminRoute(
  'ordersGet',
  { methods: ['GET'], route: 'orders/{userId}/{orderId}' },
  async ({ req }) => {
    const o = await orders.get(req.params.userId ?? '', req.params.orderId ?? '');
    if (!o) throw notFound('Order');
    const u = await users.get(o.userId);
    return json({ order: orderView(o, u?.email), bookId: o.bookId, libraryId: o.libraryId });
  },
);

/** A 10-minute download link for the order's PDF. Audited: it opens customer content. */
adminRoute(
  'ordersPdfUrl',
  { methods: ['GET'], route: 'orders/{userId}/{orderId}/pdf-url', auditRead: true },
  async ({ req, note }) => {
    const o = await orders.get(req.params.userId ?? '', req.params.orderId ?? '');
    if (!o?.pdfBlob) throw notFound('PDF');
    note('PDF link issued', `${o.userId}/${o.orderId}`);
    return json({ url: readSasUrl(PDF_CONTAINER, o.pdfBlob, `inbunden-${o.orderId}.pdf`, 10) });
  },
);

/**
 * Deletes an order, for removing test orders. Body: { confirm: orderId, stripeTest?: true }.
 * A Stripe order that was paid is real bookkeeping unless it was a test-mode payment, so the
 * admin has to say so explicitly (the admin API has no Stripe key to check it).
 */
adminRoute(
  'ordersDelete',
  { methods: ['DELETE'], route: 'orders/{userId}/{orderId}' },
  async ({ req, note }) => {
    const o = await orders.get(req.params.userId ?? '', req.params.orderId ?? '');
    if (!o) throw notFound('Order');
    const body = await readJson<{ confirm?: unknown; stripeTest?: unknown }>(req);
    if (body.confirm !== o.orderId) throw badRequest('CONFIRM', 'Type the order id to confirm.');
    const paid = o.status === 'paid' || o.status === 'ready' || o.status === 'refunded';
    if (o.paymentProvider === 'stripe' && paid && body.stripeTest !== true)
      throw badRequest(
        'PAID_ORDER',
        'This Stripe order was paid. Only delete it if it was a Stripe test-mode payment, and tick the box to say so.',
      );
    note(`deleted ${o.paymentProvider} order (${o.status})`, `${o.userId}/${o.orderId}`);
    await deleteOrder(o);
    return json({ deleted: true });
  },
);

/**
 * GET reports/vat?from=&to=&provider=stripe|fake|all
 * Sales = orders paid (paidAt) in the period with status paid/ready. Refunded orders paid in the
 * period are listed apart: refunds are not dated in our data, so check them against Stripe.
 */
adminRoute('reportsVat', { methods: ['GET'], route: 'reports/vat' }, async ({ req }) => {
  const { from, to } = range(req.query);
  const provider = req.query.get('provider') ?? 'stripe';
  const rate = await getVatRatePct();
  const byUser = await emails();
  const sales = emptyTotals();
  const refunded = emptyTotals();
  const months = new Map<string, VatTotals>();
  const rows: {
    paidAt: string;
    orderId: string;
    email: string | null;
    status: string;
    provider: string;
    promoCode: string | null;
    subtotalCents: number;
    discountCents: number;
    grossCents: number;
    vatCents: number;
    netCents: number;
    stripePaymentIntentId: string | null;
  }[] = [];

  for await (const o of orders.scanAll()) {
    if (provider !== 'all' && o.paymentProvider !== provider) continue;
    if (!inRange(o.paidAt, from, to)) continue;
    if (o.status !== 'paid' && o.status !== 'ready' && o.status !== 'refunded') continue;
    const s = splitVat(o.amountCents, rate);
    if (o.status === 'refunded') addTo(refunded, s);
    else {
      addTo(sales, s);
      const m = o.paidAt!.slice(0, 7);
      const t = months.get(m) ?? emptyTotals();
      addTo(t, s);
      months.set(m, t);
    }
    rows.push({
      paidAt: o.paidAt!,
      orderId: o.orderId,
      email: byUser.get(o.userId) ?? null,
      status: o.status,
      provider: o.paymentProvider,
      promoCode: o.promoCode,
      subtotalCents: o.subtotalCents,
      discountCents: o.discountCents,
      ...s,
      stripePaymentIntentId: o.stripePaymentIntentId,
    });
  }
  rows.sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  return json({
    from,
    to,
    provider,
    ratePct: rate,
    currency: 'eur',
    sales,
    refunded,
    byMonth: [...months]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, t]) => ({ month, ...t })),
    rows,
  });
});
