import {
  clearedCookie,
  createAnonymousUser,
  hashPassword,
  issueSession,
  sessionCookie,
  toUserInfo,
  verifyPassword,
} from '../lib/auth.js';
import { config } from '../lib/config.js';
import { mailer, templates } from '../lib/email.js';
import {
  badRequest,
  conflict,
  email as parseEmail,
  forbidden,
  HttpError,
  json,
  noContent,
  readJson,
  route,
  str,
  unauthorized,
} from '../lib/http.js';
import { addDays, newId, nowIso, randomToken, sha256 } from '../lib/ids.js';
import { lookups, reparentRows, users, type UserRow } from '../lib/tables.js';

const RETURN_LINK_DAYS = 30;
const RESET_LINK_HOURS = 1;
const TOKEN_REUSE_MINUTES = 15;

function clientIp(headers: { get(name: string): string | null }): string {
  return (headers.get('x-forwarded-for') ?? headers.get('x-client-ip') ?? 'unknown')
    .split(',')[0]!
    .trim();
}

async function ensureRate(scope: string, id: string, limit: number) {
  if (!(await lookups.rateLimit(scope, id, limit)))
    throw new HttpError(
      429,
      'RATE_LIMITED',
      'Too many attempts. Please wait a minute and try again.',
    );
}

/** Register: upgrades the current (anonymous) user or creates a fresh account. */
route(
  'authRegister',
  { methods: ['POST'], route: 'auth/register', auth: 'optional' },
  async ({ req, user }) => {
    const body = await readJson<{ email?: unknown; password?: unknown }>(req);
    const email = parseEmail(body.email);
    const password = str(body.password, 'password', { min: 8, max: 200 });
    await ensureRate('register', clientIp(req.headers), 10);

    let target: UserRow | null = user;
    if (target && target.authLevel === 'password' && target.email !== email) {
      // Already signed in with another account; do not silently switch.
      throw conflict('ALREADY_SIGNED_IN', 'You are signed in with a different account.');
    }
    if (!target) target = await createAnonymousUser();

    if (target.passwordHash) {
      // Already registered: idempotent only when the same password is presented.
      if (await verifyPassword(password, target.passwordHash)) return json(toUserInfo(target));
      throw conflict('EMAIL_TAKEN', 'That email already has an account. Sign in to continue.');
    }

    // Claim the email atomically.
    const claimed = await lookups.insert('email', email, { userId: target.userId });
    if (!claimed) {
      const existing = await lookups.get('email', email);
      if (existing?.userId !== target.userId)
        throw conflict('EMAIL_TAKEN', 'That email already has an account. Sign in to continue.');
    }
    target.email = email;
    target.passwordHash = await hashPassword(password);
    target.authLevel = 'password';
    target.sessionVersion += 1;
    target.lastSeenAt = nowIso();
    await users.upsert(target);
    const token = await issueSession(target);
    return json(toUserInfo(target), 200, { cookies: [sessionCookie(token)] });
  },
);

/** Login, optionally merging the anonymous session's library/drafts into the account. */
route(
  'authLogin',
  { methods: ['POST'], route: 'auth/login', auth: 'optional' },
  async ({ req, user }) => {
    const body = await readJson<{ email?: unknown; password?: unknown; mergeFrom?: unknown }>(req);
    const email = parseEmail(body.email);
    const password = str(body.password, 'password', { max: 200 });
    await ensureRate('login-ip', clientIp(req.headers), 15);
    await ensureRate('login-email', email, 6);

    const lookup = await lookups.get('email', email);
    const target = lookup?.userId ? await users.get(lookup.userId) : null;
    if (!target || !(await verifyPassword(password, target.passwordHash))) {
      throw unauthorized('Wrong email or password.');
    }
    if (target.status !== 'active')
      throw forbidden('ACCOUNT_DELETING', 'This account is being deleted.');

    if (
      body.mergeFrom === true &&
      user &&
      user.userId !== target.userId &&
      user.authLevel === 'anonymous'
    ) {
      await reparentRows(user.userId, target.userId);
    }
    target.lastSeenAt = nowIso();
    await users.merge(target.userId, { lastSeenAt: target.lastSeenAt });
    const token = await issueSession(target);
    return json(toUserInfo(target), 200, { cookies: [sessionCookie(token)] });
  },
);

route('authLogout', { methods: ['POST'], route: 'auth/logout', auth: 'optional' }, async () =>
  noContent({ cookies: [clearedCookie()] }),
);

route(
  'authPassword',
  { methods: ['POST'], route: 'auth/password', auth: 'required' },
  async ({ req, user }) => {
    const body = await readJson<{ currentPassword?: unknown; newPassword?: unknown }>(req);
    const next = str(body.newPassword, 'newPassword', { min: 8, max: 200 });
    if (user.passwordHash) {
      const cur = str(body.currentPassword, 'currentPassword', { max: 200 });
      if (!(await verifyPassword(cur, user.passwordHash)))
        throw unauthorized('Wrong current password.');
    }
    user.passwordHash = await hashPassword(next);
    user.authLevel = 'password';
    user.sessionVersion += 1;
    await users.upsert(user);
    const token = await issueSession(user);
    return json(toUserInfo(user), 200, { cookies: [sessionCookie(token)] });
  },
);

/* ---------------- One-time tokens: return links & password reset ---------------- */

async function createToken(
  userId: string,
  purpose: 'return' | 'reset',
  expiresAt: Date,
  value?: string,
): Promise<string> {
  const raw = randomToken(32);
  await lookups.insert('token', sha256(raw), {
    userId,
    purpose,
    expiresAt: expiresAt.toISOString(),
    value: value ?? null,
  });
  return raw;
}

async function consumeToken(
  raw: string,
  purpose: 'return' | 'reset',
): Promise<{ userId: string; value: string | null }> {
  const key = sha256(str(raw, 'token', { max: 200 }));
  const row = await lookups.get('token', key);
  if (!row || row.purpose !== purpose || !row.userId)
    throw badRequest('INVALID_TOKEN', 'This link is not valid.');
  if (row.expiresAt && new Date(row.expiresAt) < new Date())
    throw badRequest('EXPIRED_TOKEN', 'This link has expired.');
  if (row.usedAt) {
    // Reusable briefly after first use (double click, two devices).
    if (Date.now() - new Date(row.usedAt).getTime() > TOKEN_REUSE_MINUTES * 60_000)
      throw badRequest('USED_TOKEN', 'This link was already used.');
  } else {
    await lookups.merge('token', key, { usedAt: nowIso() });
  }
  return { userId: row.userId, value: row.value };
}

/** Return link: emails a magic link that resumes the export flow on any device. */
route(
  'authReturnLink',
  { methods: ['POST'], route: 'auth/return-link', auth: 'optional' },
  async ({ req, user }) => {
    const body = await readJson<{ email?: unknown; resumeTo?: unknown }>(req);
    const email = parseEmail(body.email);
    const resumeTo =
      str(body.resumeTo, 'resumeTo', { optional: true, max: 200 }) || '/export/upload';
    if (!resumeTo.startsWith('/'))
      throw badRequest('INVALID_FIELD', 'resumeTo must be a relative path.');
    await ensureRate('return-link', email, 3);

    // Prefer an existing account with that email; otherwise attach the email to the current user.
    const existing = await lookups.get('email', email);
    let target: UserRow | null = existing?.userId ? await users.get(existing.userId) : null;
    if (!target) {
      target = user ?? (await createAnonymousUser());
      if (target.authLevel === 'anonymous' || target.email === email) {
        const claimed = await lookups.insert('email', email, { userId: target.userId });
        if (claimed) {
          target.email = email;
          target.authLevel = target.authLevel === 'anonymous' ? 'email' : target.authLevel;
          await users.merge(target.userId, { email, authLevel: target.authLevel });
        }
      }
    }
    const raw = await createToken(
      target.userId,
      'return',
      addDays(new Date(), RETURN_LINK_DAYS),
      resumeTo,
    );
    const url = `${config.appBaseUrl}/r/${raw}`;
    await mailer().send(templates.returnLink(email, url));
    const masked = email.replace(/^(.).*(@.*)$/, '$1…$2');
    return json({ maskedEmail: masked }, 202, {
      cookies: user ? undefined : [sessionCookie(await issueSession(target))],
    });
  },
);

route(
  'authMagic',
  { methods: ['POST'], route: 'auth/magic', auth: 'optional' },
  async ({ req }) => {
    const body = await readJson<{ token?: unknown }>(req);
    await ensureRate('magic', clientIp(req.headers), 10);
    const { userId, value } = await consumeToken(String(body.token ?? ''), 'return');
    const target = await users.get(userId);
    if (!target || target.status !== 'active')
      throw badRequest('INVALID_TOKEN', 'This link is not valid.');
    const token = await issueSession(target);
    return json({ user: toUserInfo(target), resumeTo: value ?? '/export/upload' }, 200, {
      cookies: [sessionCookie(token)],
    });
  },
);

route(
  'authExportSteps',
  { methods: ['POST'], route: 'auth/export-steps', auth: 'optional' },
  async ({ req }) => {
    const body = await readJson<{ email?: unknown }>(req);
    const email = parseEmail(body.email);
    await ensureRate('export-steps', email, 3);
    await mailer().send(templates.exportSteps(email, `${config.appBaseUrl}/export/upload`));
    return json({}, 202);
  },
);

route('authForgot', { methods: ['POST'], route: 'auth/forgot', auth: 'none' }, async ({ req }) => {
  const body = await readJson<{ email?: unknown }>(req);
  const email = parseEmail(body.email);
  await ensureRate('forgot', email, 3);
  const existing = await lookups.get('email', email);
  if (existing?.userId) {
    const raw = await createToken(
      existing.userId,
      'reset',
      new Date(Date.now() + RESET_LINK_HOURS * 3600_000),
    );
    await mailer().send(templates.passwordReset(email, `${config.appBaseUrl}/reset/${raw}`));
  }
  return json({}, 202); // always 202: do not reveal whether the account exists
});

route('authReset', { methods: ['POST'], route: 'auth/reset', auth: 'none' }, async ({ req }) => {
  const body = await readJson<{ token?: unknown; password?: unknown }>(req);
  const password = str(body.password, 'password', { min: 8, max: 200 });
  const { userId } = await consumeToken(String(body.token ?? ''), 'reset');
  const target = await users.get(userId);
  if (!target || target.status !== 'active')
    throw badRequest('INVALID_TOKEN', 'This link is not valid.');
  target.passwordHash = await hashPassword(password);
  target.authLevel = 'password';
  target.sessionVersion += 1;
  await users.upsert(target);
  const token = await issueSession(target);
  return json(toUserInfo(target), 200, { cookies: [sessionCookie(token)] });
});

export { newId };
