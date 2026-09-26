import type { PromoType, TestCard } from './types.js';
import { DEFAULT_LANG, type Lang } from './i18n.js';

/** A discount code as stored by the API (Lookups table, kind "promo"). */
export interface PromoDefinition {
  code: string;
  type: PromoType;
  /** Percent (1–100) for "percent", cents for "fixed". */
  value: number;
  validFrom: string | null;
  validUntil: string | null;
  maxRedemptions: number | null;
  redemptions: number;
  perUserOnce: boolean;
  active: boolean;
}

export type PromoRejection =
  'not_found' | 'inactive' | 'not_started' | 'expired' | 'used_up' | 'already_used';

export const PROMO_MESSAGES: Record<PromoRejection, string> = {
  not_found: "That code doesn't exist. Check the spelling and try again.",
  inactive: 'That code is no longer active.',
  not_started: "That code isn't valid yet.",
  expired: 'That code has expired.',
  used_up: 'That code has been used the maximum number of times.',
  already_used: "You've already used that code.",
};

const PROMO_MESSAGES_SV: Record<PromoRejection, string> = {
  not_found: 'Koden finns inte. Kontrollera stavningen och försök igen.',
  inactive: 'Koden är inte längre aktiv.',
  not_started: 'Koden gäller inte än.',
  expired: 'Koden har gått ut.',
  used_up: 'Koden har redan använts det högsta antalet gånger.',
  already_used: 'Du har redan använt den koden.',
};

export function promoMessage(code: PromoRejection, lang: Lang = DEFAULT_LANG): string {
  return (lang === 'sv' ? PROMO_MESSAGES_SV : PROMO_MESSAGES)[code];
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/** Checks a code's own rules (not per-user usage). Returns null when it can be applied. */
export function promoRejection(p: PromoDefinition | null, now = new Date()): PromoRejection | null {
  if (!p) return 'not_found';
  if (!p.active) return 'inactive';
  if (p.validFrom && new Date(p.validFrom) > now) return 'not_started';
  if (p.validUntil && new Date(p.validUntil) < now) return 'expired';
  if (p.maxRedemptions !== null && p.redemptions >= p.maxRedemptions) return 'used_up';
  return null;
}

/** Discount in cents for a subtotal, clamped to [0, subtotal] and rounded to whole cents. */
export function discountCents(
  subtotalCents: number,
  p: Pick<PromoDefinition, 'type' | 'value'>,
): number {
  const raw =
    p.type === 'percent'
      ? Math.round((subtotalCents * Math.min(100, Math.max(0, p.value))) / 100)
      : Math.round(Math.max(0, p.value));
  return Math.min(subtotalCents, raw);
}

/** Test cards for the fake payment provider (numbers mirror Stripe's test mode). */
export const TEST_CARDS: TestCard[] = [
  { number: '4242 4242 4242 4242', label: 'Payment succeeds', outcome: 'succeeded' },
  { number: '4000 0000 0000 0002', label: 'Card is declined', outcome: 'card_declined' },
  { number: '4000 0000 0000 9995', label: 'Insufficient funds', outcome: 'insufficient_funds' },
];
