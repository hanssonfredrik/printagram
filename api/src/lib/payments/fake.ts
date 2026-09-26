import { TEST_CARDS, type Lang, type TestCard } from '@printagram/shared';
import type { PaymentProvider } from './provider.js';

/**
 * Takes no money. The browser picks one of the published test cards; the outcome is decided here
 * on the server, so the client cannot mark an order paid by itself.
 */
export const fakeProvider: PaymentProvider = {
  name: 'fake',
  async prepare(order) {
    return { ref: `fake_${order.orderId}`, clientSecret: null };
  },
  async status(order) {
    if (order.status === 'paid' || order.status === 'ready')
      return { status: 'succeeded', reason: null };
    if (order.status === 'failed') return { status: 'failed', reason: order.failureReason };
    return { status: 'pending', reason: null };
  },
};

export function testCardOutcome(cardNumber: string): TestCard | null {
  const digits = cardNumber.replace(/\D/g, '');
  return TEST_CARDS.find((c) => c.number.replace(/\D/g, '') === digits) ?? null;
}

export const DECLINE_MESSAGES: Record<
  Lang,
  Record<Exclude<TestCard['outcome'], 'succeeded'>, string>
> = {
  en: {
    card_declined: 'Your card was declined. Try another card.',
    insufficient_funds: 'Your card has insufficient funds. Try another card.',
  },
  sv: {
    card_declined: 'Kortet nekades. Prova ett annat kort.',
    insufficient_funds: 'Det finns inte tillräckligt med pengar på kortet. Prova ett annat kort.',
  },
};
