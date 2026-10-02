import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isStripeTestKey, paymentsAreTest, STRIPE_TEST_CARDS } from '@printagram/shared';
import { useLang } from '@/i18n';
import { StripeTestCards } from './StripeTestCards';

afterEach(() => cleanup());

describe('Stripe test mode', () => {
  it('counts the fake provider and Stripe test keys as test payments, live keys not', () => {
    expect(paymentsAreTest({ provider: 'fake', stripePublishableKey: null })).toBe(true);
    expect(paymentsAreTest({ provider: 'stripe', stripePublishableKey: 'pk_test_abc' })).toBe(true);
    expect(paymentsAreTest({ provider: 'stripe', stripePublishableKey: 'pk_live_abc' })).toBe(
      false,
    );
    expect(isStripeTestKey(null)).toBe(false);
  });

  it('lists the Stripe test cards and copies a number without spaces', async () => {
    useLang.getState().setLang('en');
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(<StripeTestCards />);
    expect(screen.getByText('Stripe test mode - no money is taken')).toBeTruthy();
    for (const c of STRIPE_TEST_CARDS) expect(screen.getByText(c.number)).toBeTruthy();
    expect(screen.getByText('Asks for 3-D Secure, then succeeds')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copy card number 4242 4242 4242 4242' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('4242424242424242'));
    expect(await screen.findByText('Copied')).toBeTruthy();
  });
});
