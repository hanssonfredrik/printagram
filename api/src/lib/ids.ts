import { ulid } from 'ulid';
import { createHash, randomBytes } from 'node:crypto';

export const newId = () => ulid().toLowerCase();

export const nowIso = () => new Date().toISOString();

export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('base64url');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Reverse-chronological sort key: newest first when sorted ascending. */
export function reverseMs(iso: string): string {
  const ms = new Date(iso).getTime();
  return String(9_999_999_999_999 - (Number.isFinite(ms) ? ms : 0)).padStart(13, '0');
}

export function addDays(iso: string | Date, days: number): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
