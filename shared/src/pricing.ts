import type { Currency, PriceList, PricingConfig } from './types.js';
import { DEFAULT_LANG, type Lang } from './i18n.js';

export const DEFAULT_PRICING: PricingConfig = {
  eur: { baseCents: 900, printedFrom: { softcoverCents: 2900, hardcoverCents: 4900 } },
  sek: { baseCents: 8900, printedFrom: { softcoverCents: 29900, hardcoverCents: 49900 } },
};

export const MAX_PHOTOS_PER_BOOK = 999;
export const MAX_PHOTOS_PER_LIBRARY = 10_000;
export const MAX_EXPORT_BYTES = 8 * 1024 * 1024 * 1024;

/**
 * The config's prices, or the defaults when they are missing or in the old single-currency shape
 * (an API or cached /api/config from before kronor existed).
 */
export function normalizePricing(p: unknown): PricingConfig {
  const ok = (l: unknown) =>
    typeof (l as PriceList | undefined)?.baseCents === 'number' &&
    typeof (l as PriceList).printedFrom?.softcoverCents === 'number';
  const c = p as Partial<PricingConfig> | undefined;
  return c && ok(c.eur) && ok(c.sek) ? (c as PricingConfig) : DEFAULT_PRICING;
}

/** The site language decides the currency: Swedish pays in kronor, everyone else in euros. */
export function currencyForLang(lang: Lang): Currency {
  return lang === 'sv' ? 'sek' : 'eur';
}

export function priceList(
  cfg: PricingConfig = DEFAULT_PRICING,
  currency: Currency = 'eur',
): PriceList {
  return cfg[currency];
}

/** A PDF costs the same whatever its size: the page and photo count don't change the price. */
export function pdfPriceCents(
  cfg: PricingConfig = DEFAULT_PRICING,
  currency: Currency = 'eur',
): number {
  return priceList(cfg, currency).baseCents;
}

/**
 * Formats cents the way the design does. Euros: "€9", "€9,15" (en); "9 €", "9,15 €" (sv).
 * Kronor: "89 kr" (sv); "SEK 89" (en).
 */
export function fmtMoney(cents: number, currency: Currency, lang: Lang = DEFAULT_LANG): string {
  const whole = Math.floor(cents / 100);
  const rest = Math.round(cents % 100);
  const num = rest === 0 ? `${whole}` : `${whole},${String(rest).padStart(2, '0')}`;
  if (currency === 'sek') return lang === 'sv' ? `${num}\u{a0}kr` : `SEK\u{a0}${num}`;
  return lang === 'sv' ? `${num}\u{a0}€` : `€${num}`;
}
