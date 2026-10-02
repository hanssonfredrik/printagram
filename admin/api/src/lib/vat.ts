/**
 * VAT on VAT-inclusive prices: vat = gross × r / (100 + r), rounded per order to whole cents,
 * net = gross − vat. Totals are sums of the per-order figures, so the CSV always adds up.
 */
export function splitVat(grossCents: number, ratePct: number) {
  const vatCents = Math.round((grossCents * ratePct) / (100 + ratePct));
  return { grossCents, vatCents, netCents: grossCents - vatCents };
}

export interface VatTotals {
  count: number;
  grossCents: number;
  vatCents: number;
  netCents: number;
}

export const emptyTotals = (): VatTotals => ({ count: 0, grossCents: 0, vatCents: 0, netCents: 0 });

export function addTo(t: VatTotals, s: ReturnType<typeof splitVat>): void {
  t.count++;
  t.grossCents += s.grossCents;
  t.vatCents += s.vatCents;
  t.netCents += s.netCents;
}
