import { describe, expect, it } from 'vitest';
import {
  decrypt,
  encrypt,
  hashPassword,
  issueSession,
  signState,
  verifyPassword,
  verifyState,
} from '../src/lib/auth.js';
import { reverseMs, sha256 } from '../src/lib/ids.js';
import { extendedExpiry } from '../src/lib/libraryService.js';
import type { LibraryRow, UserRow } from '../src/lib/tables.js';

describe('passwords (scrypt)', () => {
  it('hashes and verifies, rejects wrong passwords', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt$17$8$1$')).toBe(true);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    expect(await verifyPassword('anything', null)).toBe(false);
  }, 20000);
});

describe('sessions and state tokens (jose)', () => {
  it('issues a JWT carrying the session version', async () => {
    const user: UserRow = {
      userId: 'u1',
      email: null,
      authLevel: 'anonymous',
      passwordHash: null,
      sessionVersion: 3,
      createdAt: '',
      lastSeenAt: '',
      status: 'active',
    };
    const token = await issueSession(user);
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'));
    expect(payload.sub).toBe('u1');
    expect(payload.sv).toBe(3);
    expect(payload.exp - payload.iat).toBe(30 * 24 * 3600);
  });

  it('signs and verifies OAuth state, rejects tampering', async () => {
    const s = await signState({ sub: 'u1', n: 'abc' });
    expect(await verifyState<{ sub: string }>(s)).toMatchObject({ sub: 'u1' });
    const [head, payload, sig] = s.split('.');
    const bad = Buffer.from(sig!, 'base64url');
    bad[0]! ^= 1;
    expect(await verifyState(`${head}.${payload}.${bad.toString('base64url')}`)).toBeNull();
  });
});

describe('token encryption (AES-256-GCM)', () => {
  it('round-trips and detects tampering', () => {
    const enc = encrypt('IGQVJ...secret');
    expect(enc).not.toContain('secret');
    expect(decrypt(enc)).toBe('IGQVJ...secret');
    const [iv, tag, data] = enc.split('.');
    // Flip a bit in the decoded bytes: editing the last base64url character can leave the bytes
    // unchanged (its low bits are padding), which made this test fail about one run in four.
    const bytes = Buffer.from(data!, 'base64url');
    bytes[0]! ^= 1;
    expect(() => decrypt(`${iv}.${tag}.${bytes.toString('base64url')}`)).toThrow();
  });
});

describe('ids and retention', () => {
  it('reverseMs sorts newest first', () => {
    const a = reverseMs('2025-01-01T00:00:00Z');
    const b = reverseMs('2025-06-01T00:00:00Z');
    expect(b < a).toBe(true);
    expect(a).toHaveLength(13);
  });

  it('sha256 is stable base64url', () => {
    expect(sha256('x')).toBe(sha256('x'));
    expect(sha256('x')).not.toMatch(/[+/=]/);
  });

  it('extends expiry from max(now, current) by the retention window', () => {
    const future = new Date(Date.now() + 40 * 86400_000).toISOString();
    const lib = { expiresAt: future } as LibraryRow;
    const extended = new Date(extendedExpiry(lib)).getTime();
    expect(extended - new Date(future).getTime()).toBeCloseTo(90 * 86400_000, -4);
    const past = { expiresAt: '2020-01-01T00:00:00Z' } as LibraryRow;
    expect(new Date(extendedExpiry(past)).getTime() - Date.now()).toBeGreaterThan(89 * 86400_000);
  });
});
