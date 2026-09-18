import { config } from './config.js';
import { mailer, templates } from './email.js';
import { nowIso } from './ids.js';
import { extendedExpiry } from './libraryService.js';
import { books, libraries, orders, users, type OrderRow } from './tables.js';

/** Single place where an order becomes paid: from the webhook, from /sync, or from mock-pay. */
export async function markPaid(o: OrderRow, paymentIntentId: string | null): Promise<OrderRow> {
  if (o.status === 'paid' || o.status === 'ready') return o;
  const paidAt = nowIso();
  await orders.merge(o.userId, o.orderId, {
    status: 'paid',
    paidAt,
    stripePaymentIntentId: paymentIntentId ?? o.stripePaymentIntentId,
  });
  const book = await books.get(o.userId, o.bookId);
  if (book) await books.merge(o.userId, o.bookId, { status: 'ordered', orderId: o.orderId });
  const lib = await libraries.get(o.userId, o.libraryId);
  if (lib && lib.status === 'ready')
    await libraries.merge(o.userId, o.libraryId, {
      expiresAt: extendedExpiry(lib),
      reminderSentAt: null,
    });
  return {
    ...o,
    status: 'paid',
    paidAt,
    stripePaymentIntentId: paymentIntentId ?? o.stripePaymentIntentId,
  };
}

export async function markFailed(
  o: OrderRow,
  status: 'failed' | 'expired' | 'refunded',
): Promise<void> {
  if (o.status === 'ready' && status !== 'refunded') return;
  await orders.merge(o.userId, o.orderId, { status });
}

export async function notifyOrderReady(o: OrderRow): Promise<void> {
  const u = await users.get(o.userId);
  if (!u?.email) return;
  try {
    await mailer().send(templates.orderReady(u.email, o.title, `${config.appBaseUrl}/books`));
  } catch (e) {
    console.warn('order-ready email failed', e);
  }
}
