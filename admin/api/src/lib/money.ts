import type { Currency } from '@printagram/shared';

/** Cents per currency. Swedish orders are in kronor, the rest in euros, and they are never added up. */
export type CurrencyCents = Record<Currency, number>;

export const CURRENCIES: Currency[] = ['eur', 'sek'];

export const noCents = (): CurrencyCents => ({ eur: 0, sek: 0 });

/** An order's currency (orders from before kronor existed are euros). */
export const orderCurrency = (o: { currency?: string }): Currency =>
  o.currency === 'sek' ? 'sek' : 'eur';

export function parseCurrency(v: string | null | undefined): Currency {
  return v === 'sek' ? 'sek' : 'eur';
}
