import type Stripe from 'stripe';
import { stripe } from '../stripe.js';
import type { OrderRow } from '../tables.js';
import type { PaymentProvider } from './provider.js';

/**
 * The order's PaymentIntent, or null when this Stripe key can't see it. That happens after
 * switching from test to live keys: an unpaid order still points at a test-mode PaymentIntent.
 */
async function retrieveIntent(id: string): Promise<Stripe.PaymentIntent | null> {
  try {
    return await stripe().paymentIntents.retrieve(id);
  } catch (e) {
    if ((e as { code?: string }).code === 'resource_missing') return null;
    throw e;
  }
}

/**
 * Stripe PaymentIntents. Dormant until PAYMENT_PROVIDER=stripe. One PaymentIntent per order;
 * its amount is updated when a discount code changes the order total.
 */
export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  async prepare(order: OrderRow, email) {
    const s = stripe();
    let pi = order.stripePaymentIntentId ? await retrieveIntent(order.stripePaymentIntentId) : null;
    if (pi) {
      if (
        pi.status !== 'succeeded' &&
        pi.status !== 'canceled' &&
        pi.amount !== order.amountCents
      ) {
        pi = await s.paymentIntents.update(pi.id, { amount: order.amountCents });
      }
      if (pi.status !== 'canceled') return { ref: pi.id, clientSecret: pi.client_secret };
    }
    pi = await s.paymentIntents.create(
      {
        amount: order.amountCents,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        description: `Inbunden PDF photo book - ${order.pageCount} pages`,
        receipt_email: email ?? undefined,
        metadata: { orderId: order.orderId, userId: order.userId, bookId: order.bookId },
      },
      { idempotencyKey: `order:${order.orderId}:${order.amountCents}` },
    );
    return { ref: pi.id, clientSecret: pi.client_secret };
  },
  async status(order) {
    if (!order.stripePaymentIntentId) return { status: 'pending', reason: null };
    const pi = await retrieveIntent(order.stripePaymentIntentId);
    if (!pi) return { status: 'pending', reason: null };
    if (pi.status === 'succeeded') return { status: 'succeeded', reason: null };
    if (pi.status === 'canceled')
      return { status: 'canceled', reason: 'The payment was cancelled.' };
    if (pi.status === 'requires_payment_method' && pi.last_payment_error) {
      return { status: 'failed', reason: pi.last_payment_error.message ?? 'The payment failed.' };
    }
    return { status: 'pending', reason: null };
  },
};
