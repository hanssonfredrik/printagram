import { lookups } from '../core.js';

/** Admin-editable settings, stored in Lookups (kind admin_setting). */

export const DEFAULT_VAT_RATE_PCT = 25;

export async function getVatRatePct(): Promise<number> {
  const row = await lookups.get('admin_setting', 'vatRatePct');
  const n = Number(row?.value);
  return row?.value && Number.isFinite(n) ? n : DEFAULT_VAT_RATE_PCT;
}

export async function setVatRatePct(pct: number): Promise<void> {
  await lookups.upsert('admin_setting', 'vatRatePct', { value: String(pct) });
}
