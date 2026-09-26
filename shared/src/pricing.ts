import type { PricingConfig } from './types.js';
import { DEFAULT_LANG, type Lang } from './i18n.js';

export const DEFAULT_PRICING: PricingConfig = {
  baseCents: 900,
  currency: 'eur',
  printedFrom: { softcoverCents: 2900, hardcoverCents: 4900 },
};

export const MAX_PHOTOS_PER_BOOK = 999;
export const MAX_PHOTOS_PER_LIBRARY = 10_000;
export const MAX_EXPORT_BYTES = 8 * 1024 * 1024 * 1024;

/** A PDF costs the same whatever its size: the page and photo count don't change the price. */
export function pdfPriceCents(cfg: PricingConfig = DEFAULT_PRICING): number {
  return cfg.baseCents;
}

/** Formats cents the way the design does: "€9", "€9,15", "€0,15" (en); "9 €", "9,15 €" (sv). */
export function fmtEuro(cents: number, lang: Lang = DEFAULT_LANG): string {
  const whole = Math.floor(cents / 100);
  const rest = Math.round(cents % 100);
  const num = rest === 0 ? `${whole}` : `${whole},${String(rest).padStart(2, '0')}`;
  return lang === 'sv' ? `${num}\u{a0}€` : `€${num}`;
}
