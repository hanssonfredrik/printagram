import Stripe from 'stripe';
import { config } from './config.js';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!config.stripe.enabled) throw new Error('Stripe is not configured');
  if (!client)
    client = new Stripe(config.stripe.secretKey, {
      apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion,
      typescript: true,
    });
  return client;
}

export function stripeEnabled(): boolean {
  return config.stripe.enabled;
}
