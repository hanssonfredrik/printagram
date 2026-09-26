import { DEFAULT_LANG, MONTHS_SHORT_BY_LANG, type Lang } from './i18n.js';

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

/** Short month name: "Sep" (en), "sep" (sv). */
export function monthShort(month0: number, lang: Lang = DEFAULT_LANG): string {
  return (MONTHS_SHORT_BY_LANG[lang] ?? MONTHS_SHORT)[month0] ?? '';
}

/** "17 Sep 2026" (en), "17 sep 2026" (sv) */
export function fmtDate(iso: string | Date, lang: Lang = DEFAULT_LANG): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getUTCDate()} ${monthShort(d.getUTCMonth(), lang)} ${d.getUTCFullYear()}`;
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
export function fmtSpan(firstIso: string, lastIso: string, lang: Lang = DEFAULT_LANG): string {
  const a = new Date(firstIso);
  const b = new Date(lastIso);
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const m = (d: Date) => monthShort(d.getUTCMonth(), lang);
  if (lo.getUTCFullYear() === hi.getUTCFullYear()) {
    return `${m(lo)} – ${m(hi)} ${hi.getUTCFullYear()}`;
  }
  return `${m(lo)} ${lo.getUTCFullYear()} – ${m(hi)} ${hi.getUTCFullYear()}`;
}

/** "Mar 2021 – Dec 2024" across the earliest and latest photo (order-independent). */
export function photoSpan(photos: { takenAt: string }[], lang: Lang = DEFAULT_LANG): string {
  if (photos.length === 0) return '';
  let lo = photos[0]!.takenAt;
  let hi = lo;
  for (const p of photos) {
    if (p.takenAt < lo) lo = p.takenAt;
    if (p.takenAt > hi) hi = p.takenAt;
  }
  return fmtSpan(lo, hi, lang);
}
