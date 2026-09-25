import { createHash } from 'node:crypto';
import { config } from './config.js';
import { mailer, templates } from './email.js';
import { nowIso } from './ids.js';
import { extendedExpiry } from './libraryService.js';
import {
  books,
  libraries,
  lookups,
  orders,
  promos,
  users,
  type BookRow,
  type OrderRow,
} from './tables.js';

/**
 * Hash of everything that affects the price and the printed result. An open order is reused only
 * while this is unchanged, so revisiting Checkout never creates duplicate orders or payments.
 */
export function bookContentHash(
  b: Pick<BookRow, 'photoIds' | 'format' | 'showMeta' | 'title' | 'coverPhotoId'> & {
    pages?: unknown;
    layout?: unknown;
  },
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        p: b.photoIds,
        f: b.format,
        m: b.showMeta,
        t: b.title,
        c: b.coverPhotoId,
        pg: b.pages ?? null,
        l: b.layout ?? null,
      }),
    )
    .digest('base64url')
    .slice(0, 22);
}

/** Single place where an order becomes paid: fake provider, Stripe webhook, /sync or a 0-total order. */
export async function markPaid(o: OrderRow, paymentRef: string | null): Promise<OrderRow> {
  if (o.status === 'paid' || o.status === 'ready') return o;
  const paidAt = nowIso();
  if (o.promoCode) await redeemPromo(o);
  const patch: Partial<OrderRow> = {
    status: 'paid',
    paidAt,
    failureReason: null,
    stripePaymentIntentId: paymentRef ?? o.stripePaymentIntentId,
  };
  await orders.merge(o.userId, o.orderId, patch);
  const book = await books.get(o.userId, o.bookId);
  if (book) await books.merge(o.userId, o.bookId, { status: 'ordered', orderId: o.orderId });
  const lib = await libraries.get(o.userId, o.libraryId);
  if (lib && lib.status === 'ready')
    await libraries.merge(o.userId, o.libraryId, {
      expiresAt: extendedExpiry(lib),
      reminderSentAt: null,
    });
  return { ...o, ...patch } as OrderRow;
}

/**
 * Records a failed attempt. Not terminal: the customer can retry and the order moves to paid.
 * "refunded"/"expired" are terminal.
 */
export async function markFailed(
  o: OrderRow,
  status: 'failed' | 'expired' | 'refunded',
  reason: string | null = null,
): Promise<OrderRow> {
  if (o.status === 'ready' && status !== 'refunded') return o;
  if (o.status === 'paid' && status === 'failed') return o;
  const patch: Partial<OrderRow> = { status, failureReason: reason };
  await orders.merge(o.userId, o.orderId, patch);
  return { ...o, ...patch } as OrderRow;
}

async function redeemPromo(o: OrderRow): Promise<void> {
  const code = o.promoCode!;
  // Per-user single use is recorded first (insert-if-absent), then the global counter.
  await lookups.insert('promo_use', `${code}:${o.userId}`, { userId: o.userId, value: o.orderId });
  const ok = await promos.redeem(code);
  if (!ok) console.warn(`promo ${code} exceeded its redemption limit on order ${o.orderId}`);
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
