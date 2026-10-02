import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import { SignJWT, jwtVerify } from 'jose';
import { adminConfig } from '../config.js';
import { users, type UserRow } from '../core.js';

/**
 * Admin session: an HS256 JWT in a host-only, HttpOnly, Secure, SameSite=Strict cookie, signed
 * with ADMIN_JWT_SECRET (never the customer AUTH_JWT_SECRET). Every request re-reads the user
 * row, so revoking isAdmin, a password reset on the main site (sessionVersion) or "sign out all
 * admin sessions" (adminSessionVersion) takes effect on the next call.
 */

export const SESSION_HOURS = 8;
const CHALLENGE_MINUTES = 5;
const ISSUER = 'inbunden-admin';
const AUD_SESSION = 'inbunden-admin/session';
const AUD_CHALLENGE = 'inbunden-admin/challenge';

type Cookie = NonNullable<HttpResponseInit['cookies']>[number];

/** Domain-separated so the key never equals a raw secret used anywhere else. */
function key(purpose: string, secret: string): Buffer {
  return createHash('sha256').update(`inbunden-admin|${purpose}|${secret}`).digest();
}
const jwtKey = () => key('jwt', adminConfig.jwtSecret);
const encKey = () => key('totp', adminConfig.totpEncKey);

/** __Host- prefix: Secure, Path=/ and no Domain, so it is bound to the admin host only. */
export const cookieName = () => (adminConfig.cookieSecure ? '__Host-inb_admin' : 'inb_admin');

export function sessionCookie(token: string): Cookie {
  return {
    name: cookieName(),
    value: token,
    httpOnly: true,
    secure: adminConfig.cookieSecure,
    sameSite: 'Strict',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  };
}

export function clearedCookie(): Cookie {
  return { ...sessionCookie(''), maxAge: 0 };
}

export function readCookie(req: HttpRequest, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function issueSession(user: UserRow): Promise<string> {
  return new SignJWT({
    sv: user.sessionVersion,
    asv: user.adminSessionVersion ?? 0,
    mfa: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUD_SESSION)
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(jwtKey());
}

/** Returns the admin user for a valid session cookie, or null. Fails closed on any doubt. */
export async function resolveSession(req: HttpRequest): Promise<UserRow | null> {
  const token = readCookie(req, cookieName());
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUD_SESSION,
    });
    if (!payload.sub || payload.mfa !== true) return null;
    const user = await users.get(payload.sub);
    if (
      !user ||
      user.status !== 'active' ||
      user.isAdmin !== true ||
      !user.adminTotpSecret ||
      user.sessionVersion !== payload.sv ||
      (user.adminSessionVersion ?? 0) !== payload.asv
    )
      return null;
    return user;
  } catch {
    return null;
  }
}

/* ---------------- Login challenge (password OK, waiting for the TOTP code) ---------------- */

export interface Challenge {
  userId: string;
  sv: number;
  /** Set on first login: the encrypted secret being enrolled. */
  pending: string | null;
}

export async function issueChallenge(user: UserRow, pendingSecret: string | null) {
  return new SignJWT({
    sv: user.sessionVersion,
    pending: pendingSecret ? encryptSecret(pendingSecret) : null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUD_CHALLENGE)
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_MINUTES}m`)
    .sign(jwtKey());
}

export async function readChallenge(token: string): Promise<Challenge | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUD_CHALLENGE,
    });
    if (!payload.sub || typeof payload.sv !== 'number') return null;
    return {
      userId: payload.sub,
      sv: payload.sv,
      pending: typeof payload.pending === 'string' ? payload.pending : null,
    };
  } catch {
    return null;
  }
}

/* ---------------- TOTP secret at rest (AES-256-GCM, ADMIN_TOTP_ENC_KEY) ---------------- */

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(blob: string): string {
  const [ivB, tagB, dataB] = blob.split('.');
  if (!ivB || !tagB || !dataB) throw new Error('bad ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
