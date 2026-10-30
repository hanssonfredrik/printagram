import { describe, expect, it } from 'vitest';
import { sourceLabel, statusLabel, stripePaymentUrls } from './format';

describe('order status labels', () => {
  it('explains the raw statuses and passes unknown ones through', () => {
    expect(statusLabel('created')).toBe('Not paid');
    expect(statusLabel('paid')).toBe('Paid, PDF pending');
    expect(statusLabel('ready')).toBe('Paid, PDF ready');
    expect(statusLabel('refunded')).toBe('Refunded');
    expect(statusLabel('something-new')).toBe('something-new');
  });
});

describe('photo source labels', () => {
  it('names the three sources and says Unknown otherwise', () => {
    expect(sourceLabel('instagram')).toBe('Instagram connect');
    expect(sourceLabel('export')).toBe('Export ZIP');
    expect(sourceLabel('googlephotos')).toBe('Google Photos');
    expect(sourceLabel(null)).toBe('Unknown');
    expect(sourceLabel(undefined)).toBe('Unknown');
  });
});

describe('stripePaymentUrls', () => {
  it('links to the live dashboard for live payments', () => {
    expect(stripePaymentUrls('pi_1', true)).toEqual([
      { label: 'Open in Stripe', href: 'https://dashboard.stripe.com/payments/pi_1' },
    ]);
  });

  it('links to the test dashboard for test payments', () => {
    expect(stripePaymentUrls('pi_1', false).map((l) => l.href)).toEqual([
      'https://dashboard.stripe.com/test/payments/pi_1',
    ]);
  });

  it('offers both links when livemode was never recorded, and escapes the id', () => {
    const links = stripePaymentUrls('pi/odd id', null);
    expect(links).toHaveLength(2);
    expect(links[0]!.href).toBe('https://dashboard.stripe.com/payments/pi%2Fodd%20id');
    expect(links[1]!.href).toBe('https://dashboard.stripe.com/test/payments/pi%2Fodd%20id');
  });
});
