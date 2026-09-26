import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import { normalizeLang, type UserInfo } from '@printagram/shared';
import { config } from './config.js';
import { users, type UserRow } from './tables.js';
import { newId, nowIso } from './ids.js';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/* ------------------------------------------------------------------ */
/* Passwords (scrypt, OWASP parameters, no native modules)              */
/* ------------------------------------------------------------------ */

const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 32, SCRYPT);
  return `scrypt$17$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [algo, logN, r, p, saltB64, keyB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !keyB64) return false;
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), 32, {
    N: 2 ** Number(logN),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  const expected = Buffer.from(keyB64, 'base64');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/* ------------------------------------------------------------------ */
/* Session cookie (jose HS256)                                           */
/* ------------------------------------------------------------------ */

export const COOKIE = 'pg_session';
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  return createHash('sha256').update(config.jwtSecret).digest();
}

export async function issueSession(user: UserRow): Promise<string> {
  return new SignJWT({ sv: user.sessionVersion, al: user.authLevel })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export function sessionCookie(token: string): NonNullable<HttpResponseInit['cookies']>[number] {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  };
}

export function clearedCookie(): NonNullable<HttpResponseInit['cookies']>[number] {
  return {
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  };
}

export interface AuthResult {
  user: UserRow | null;
  expired: boolean;
}

function readCookie(req: HttpRequest, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function authenticate(req: HttpRequest): Promise<AuthResult> {
  const token = readCookie(req, COOKIE);
  if (!token) return { user: null, expired: false };
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const userId = payload.sub;
    if (!userId) return { user: null, expired: false };
    const user = await users.get(userId);
    if (!user || user.status !== 'active' || user.sessionVersion !== payload.sv)
      return { user: null, expired: true };
    // Touch lastSeenAt at most once per hour to keep table writes negligible.
    if (Date.now() - new Date(user.lastSeenAt).getTime() > 3600_000) {
      user.lastSeenAt = nowIso();
      users.merge(userId, { lastSeenAt: user.lastSeenAt }).catch(() => undefined);
    }
    return { user, expired: false };
  } catch {
    return { user: null, expired: true };
  }
}

/** Creates a fresh anonymous user row. */
export async function createAnonymousUser(): Promise<UserRow> {
  const row: UserRow = {
    userId: newId(),
    email: null,
    authLevel: 'anonymous',
    passwordHash: null,
    sessionVersion: 1,
    createdAt: nowIso(),
    lastSeenAt: nowIso(),
    status: 'active',
  };
  await users.upsert(row);
  return row;
}

export function toUserInfo(u: UserRow): UserInfo {
  return { id: u.userId, email: u.email, authLevel: u.authLevel, lang: normalizeLang(u.lang) };
}

/* ------------------------------------------------------------------ */
/* Symmetric encryption for Instagram tokens at rest (AES-256-GCM)       */
/* ------------------------------------------------------------------ */

function encKey(): Buffer {
  return createHash('sha256').update(config.tokenEncKey).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decrypt(blob: string): string {
  const [ivB, tagB, dataB] = blob.split('.');
  if (!ivB || !tagB || !dataB) throw new Error('bad ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/* ------------------------------------------------------------------ */
/* Signed state for OAuth round-trips                                    */
/* ------------------------------------------------------------------ */

export async function signState(payload: Record<string, unknown>, minutes = 10): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(secret());
}

export async function verifyState<T extends Record<string, unknown>>(
  token: string,
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload as T;
  } catch {
    return null;
  }
}
