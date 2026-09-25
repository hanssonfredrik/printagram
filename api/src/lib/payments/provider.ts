import type { PaymentProviderName } from '@printagram/shared';
import { config } from '../config.js';
import type { OrderRow } from '../tables.js';
import { fakeProvider } from './fake.js';
import { stripeProvider } from './stripe.js';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

export interface PaymentStartResult {
  /** Provider reference stored on the order (PaymentIntent id, or a fake reference). */
  ref: string | null;
  /** Client secret for the browser (Stripe only). */
  clientSecret: string | null;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Creates or updates the provider-side payment for an order's current amount. */
  prepare(order: OrderRow, email: string | null): Promise<PaymentStartResult>;
  /** Asks the provider what happened (used by /sync and as a webhook fallback). */
  status(order: OrderRow): Promise<{ status: PaymentStatus; reason: string | null }>;
}

/** The configured provider. Throws (loudly) on misconfiguration instead of silently falling back. */
export function paymentProvider(): PaymentProvider {
  const name = config.paymentProvider;
  if (name === 'stripe') {
    const s = config.stripe;
    const missing = [
      !s.secretKey && 'STRIPE_SECRET_KEY',
      !s.publishableKey && 'STRIPE_PUBLISHABLE_KEY',
      !s.webhookSecret && 'STRIPE_WEBHOOK_SECRET',
    ].filter(Boolean);
    if (missing.length) {
      throw new Error(`PAYMENT_PROVIDER=stripe but ${missing.join(', ')} is not set`);
    }
    return stripeProvider;
  }
  return fakeProvider;
}
