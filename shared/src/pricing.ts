import type { PricingConfig } from './types.js';

export const DEFAULT_PRICING: PricingConfig = {
  baseCents: 900,
  includedPages: 40,
  extraPageCents: 15,
  currency: 'eur',
  printedFrom: { softcoverCents: 2900, hardcoverCents: 4900 },
};

export const MAX_PHOTOS_PER_BOOK = 600;
export const MAX_PHOTOS_PER_LIBRARY = 10_000;
export const MAX_EXPORT_BYTES = 8 * 1024 * 1024 * 1024;

export interface PriceBreakdown {
  includedPages: number;
  extraPages: number;
  extraPageCents: number;
  extraCents: number;
  baseCents: number;
  totalCents: number;
}

export function price(pages: number, cfg: PricingConfig = DEFAULT_PRICING): PriceBreakdown {
  const extraPages = Math.max(0, pages - cfg.includedPages);
  const extraCents = extraPages * cfg.extraPageCents;
  return {
    includedPages: cfg.includedPages,
    extraPages,
    extraPageCents: cfg.extraPageCents,
    extraCents,
    baseCents: cfg.baseCents,
    totalCents: cfg.baseCents + extraCents,
  };
}

/** Formats cents the way the design does: "€9", "€9,15", "€0,15". */
export function fmtEuro(cents: number): string {
  const whole = Math.floor(cents / 100);
  const rest = Math.round(cents % 100);
  return rest === 0 ? `€${whole}` : `€${whole},${String(rest).padStart(2, '0')}`;
}
