import type Stripe from 'stripe';
import { config } from '../lib/config.js';
import { json, route } from '../lib/http.js';
import { markFailed, markPaid } from '../lib/orderService.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';
import { lookups, orders } from '../lib/tables.js';

/**
 * Stripe webhook. Signature-verified, idempotent on event id, always answers 200 quickly.
 * Configure the endpoint as https://<host>/api/stripe/webhook with the events below.
 */
route(
  'stripeWebhook',
  { methods: ['POST'], route: 'stripe/webhook', auth: 'none', allowCrossOrigin: true },
  async ({ req, ctx }) => {
    if (!stripeEnabled() || !config.stripe.webhookSecret)
      return json({ error: { code: 'DISABLED', message: 'Stripe is not configured.' } }, 503);
    const sig = req.headers.get('stripe-signature') ?? '';
    const raw = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(raw, sig, config.stripe.webhookSecret);
    } catch (e) {
      ctx.warn('stripe webhook signature failed', e);
      return json({ error: { code: 'BAD_SIGNATURE', message: 'Invalid signature.' } }, 400);
    }

    const fresh = await lookups.insert('stripe_evt', event.id, {
      value: event.type,
      expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    });
    if (!fresh) return json({ received: true, duplicate: true });

    const pi = event.data.object as Stripe.PaymentIntent | Stripe.Charge;
    const meta = (pi as Stripe.PaymentIntent).metadata ?? {};
    const orderId = meta.orderId;
    const userId = meta.userId;
    const paymentIntentId =
      'object' in pi && pi.object === 'charge'
        ? typeof pi.payment_intent === 'string'
          ? pi.payment_intent
          : (pi.payment_intent?.id ?? null)
        : pi.id;

    if (orderId && userId) {
      const o = await orders.get(userId, orderId);
      if (o) {
        switch (event.type) {
          case 'payment_intent.succeeded':
            await markPaid(o, paymentIntentId);
            break;
          case 'payment_intent.payment_failed':
          case 'payment_intent.canceled':
            await markFailed(o, 'failed');
            break;
          case 'charge.refunded':
            await markFailed(o, 'refunded');
            break;
          default:
            break;
        }
      } else {
        ctx.warn(`stripe webhook: order ${orderId} for user ${userId} not found`);
      }
    }
    return json({ received: true });
  },
);
