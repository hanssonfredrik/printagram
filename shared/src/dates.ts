export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "2025-03" style key used for grouping and range filters. */
export function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-');
  return { year: Number(y), month: Number(m) - 1 };
}

/** "17 Sep 2026" */
export function fmtDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function addDays(iso: string | Date, days: number): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addMonths(iso: string | Date, months: number): Date {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** "Mar – Sep 2025" or "Jan 2023 – Dec 2025" */
export function fmtSpan(firstIso: string, lastIso: string): string {
  const a = new Date(firstIso);
  const b = new Date(lastIso);
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  if (lo.getUTCFullYear() === hi.getUTCFullYear()) {
    return `${MONTHS_SHORT[lo.getUTCMonth()]} – ${MONTHS_SHORT[hi.getUTCMonth()]} ${hi.getUTCFullYear()}`;
  }
  return `${MONTHS_SHORT[lo.getUTCMonth()]} ${lo.getUTCFullYear()} – ${MONTHS_SHORT[hi.getUTCMonth()]} ${hi.getUTCFullYear()}`;
}
