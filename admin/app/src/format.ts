const eurFmt = new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'EUR' });
const numFmt = new Intl.NumberFormat('sv-SE');
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export const eur = (cents: number) => eurFmt.format(cents / 100);
export const num = (n: number) => numFmt.format(n);
export const compact = (n: number) =>
  Math.abs(n) < 10_000 ? numFmt.format(n) : compactFmt.format(n);
export const pct = (n: number) => `${(n * 100).toFixed(1)} %`;

export function date(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '–';
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return '–';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 129_600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

export const bytes = (n: number | null) =>
  n === null ? '–' : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} kB`;

/** yyyy-mm-dd in UTC, `daysAgo` days before today. */
export function dayOffset(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

/** Inclusive date range (yyyy-mm-dd), as the stats and order endpoints take it. */
export interface Range {
  from: string;
  to: string;
}

/** The last `days` days, today included. */
export const defaultRange = (days = 30): Range => ({ from: dayOffset(days - 1), to: dayOffset(0) });

/** RFC 4180 CSV (semicolon-free, comma-separated, quoted when needed) with a BOM for Excel. */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    // A leading = + - @ would be run as a formula by spreadsheet apps.
    const safe = /^[=+\-@]/.test(s) && typeof v === 'string' ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export function download(fileName: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
