import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30 s), the variant every authenticator app supports.
 * Implemented on node:crypto so the admin has no extra dependency in its login path.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const PERIOD = 30;
const DIGITS = 6;
/** Accept the previous and next step too (clock drift). */
const WINDOW = 1;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('invalid base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160-bit random secret, base32 (what the QR code / manual entry carries). */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function hotp(key: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1]! & 0x0f;
  const bin =
    ((h[offset]! & 0x7f) << 24) | (h[offset + 1]! << 16) | (h[offset + 2]! << 8) | h[offset + 3]!;
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export const stepAt = (ms = Date.now()) => Math.floor(ms / 1000 / PERIOD);

/**
 * Returns the matched time step, or null. Steps at or below `lastStep` are refused, so a code
 * that was already used (or an older one) cannot be replayed.
 */
export function verifyTotp(
  secretB32: string,
  code: string,
  lastStep = 0,
  now = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secretB32);
  const current = stepAt(now);
  let matched: number | null = null;
  for (let s = current - WINDOW; s <= current + WINDOW; s++) {
    const ok = timingSafeEqual(Buffer.from(hotp(key, s)), Buffer.from(code));
    if (ok && s > lastStep && matched === null) matched = s;
  }
  return matched;
}

export function otpauthUri(secretB32: string, account: string): string {
  const issuer = 'Inbunden Admin';
  const label = encodeURIComponent(`${issuer}:${account}`);
  const q = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}
