import {
  hashPassword,
  HttpError,
  json,
  lookups,
  parseEmail,
  readJson,
  str,
  unauthorized,
  users,
  verifyPassword,
  conflict,
} from '../core.js';
import { adminRoute, record } from '../lib/route.js';
import {
  clearedCookie,
  decryptSecret,
  issueChallenge,
  issueSession,
  readChallenge,
  sessionCookie,
} from '../lib/session.js';
import { generateSecret, otpauthUri, verifyTotp } from '../lib/totp.js';

/**
 * Sign-in in two steps: email + password (must be an active user with isAdmin), then a TOTP
 * code. The first sign-in enrolls the authenticator: the response carries a fresh secret and
 * the session is only issued once a code from it verifies.
 */

const SAME_ERROR = 'Wrong email or password, or no admin access.';

let dummyHash: Promise<string> | null = null;
/** Keeps a wrong email as slow as a wrong password, so timing does not reveal accounts. */
const dummy = () => (dummyHash ??= hashPassword('not-a-real-password-just-for-timing'));

async function limit(scope: string, id: string, max: number) {
  if (!(await lookups.rateLimit(scope, id, max, 15)))
    throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Wait 15 minutes and try again.');
}

adminRoute(
  'adminLogin',
  { methods: ['POST'], route: 'auth/login', auth: 'public' },
  async ({ req, ip }) => {
    const body = await readJson<{ email?: unknown; password?: unknown }>(req);
    const email = parseEmail(body.email);
    const password = str(body.password, 'password', { max: 200 });
    await limit('admin-ip', ip, 10);
    await limit('admin-email', email, 5);

    const lookup = await lookups.get('email', email);
    const user = lookup?.userId ? await users.get(lookup.userId) : null;
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? (await dummy()));
    const reason = !user
      ? 'unknown email'
      : !passwordOk
        ? 'wrong password'
        : user.status !== 'active'
          ? 'inactive account'
          : user.isAdmin !== true
            ? 'not an admin'
            : null;
    if (reason || !user) {
      await record({
        actor: null,
        actorEmail: email,
        action: 'adminLogin',
        detail: reason,
        ip,
        ok: false,
      });
      throw unauthorized(SAME_ERROR);
    }

    const pending = user.adminTotpSecret ? null : generateSecret();
    const challenge = await issueChallenge(user, pending);
    await record({
      actor: user,
      action: 'adminLogin',
      detail: pending ? 'password ok, enrolling authenticator' : 'password ok',
      ip,
      ok: true,
    });
    return json({
      challenge,
      enroll: pending ? { secret: pending, uri: otpauthUri(pending, email) } : null,
    });
  },
);

async function userForChallenge(token: unknown) {
  const ch = await readChallenge(str(token, 'challenge', { max: 4000 }));
  if (!ch) throw unauthorized('The sign-in has expired. Start again.');
  const user = await users.get(ch.userId);
  if (!user || user.status !== 'active' || user.isAdmin !== true || user.sessionVersion !== ch.sv)
    throw unauthorized('The sign-in has expired. Start again.');
  return { ch, user };
}

adminRoute(
  'adminTotp',
  { methods: ['POST'], route: 'auth/totp', auth: 'public' },
  async ({ req, ip }) => {
    const body = await readJson<{ challenge?: unknown; code?: unknown }>(req);
    const { ch, user } = await userForChallenge(body.challenge);
    if (ch.pending || !user.adminTotpSecret)
      throw unauthorized('The sign-in has expired. Start again.');
    await limit('admin-totp', user.userId, 5);
    const step = verifyTotp(
      decryptSecret(user.adminTotpSecret),
      str(body.code, 'code', { max: 10 }).replace(/\s/g, ''),
      user.adminTotpLastStep ?? 0,
    );
    if (step === null) {
      await record({
        actor: user,
        action: 'adminTotp',
        detail: 'wrong or reused code',
        ip,
        ok: false,
      });
      throw unauthorized('Wrong code. Use the newest code from your authenticator app.');
    }
    await users.merge(user.userId, { adminTotpLastStep: step });
    await record({ actor: user, action: 'adminTotp', detail: 'signed in', ip, ok: true });
    return json({ email: user.email }, 200, { cookies: [sessionCookie(await issueSession(user))] });
  },
);

adminRoute(
  'adminEnroll',
  { methods: ['POST'], route: 'auth/enroll', auth: 'public' },
  async ({ req, ip }) => {
    const body = await readJson<{ challenge?: unknown; code?: unknown }>(req);
    const { ch, user } = await userForChallenge(body.challenge);
    if (!ch.pending) throw unauthorized('The sign-in has expired. Start again.');
    // Never overwrite an existing authenticator: resetting it is a deliberate admin action.
    if (user.adminTotpSecret)
      throw conflict('ALREADY_ENROLLED', 'An authenticator is already set up.');
    await limit('admin-totp', user.userId, 5);
    const step = verifyTotp(
      decryptSecret(ch.pending),
      str(body.code, 'code', { max: 10 }).replace(/\s/g, ''),
    );
    if (step === null) {
      await record({ actor: user, action: 'adminEnroll', detail: 'wrong code', ip, ok: false });
      throw unauthorized(
        'Wrong code. Check that the app shows "Inbunden Admin" and try the newest code.',
      );
    }
    const adminSessionVersion = (user.adminSessionVersion ?? 0) + 1;
    await users.merge(user.userId, {
      adminTotpSecret: ch.pending,
      adminTotpLastStep: step,
      adminSessionVersion,
    });
    await record({
      actor: user,
      action: 'adminEnroll',
      detail: 'authenticator enrolled',
      ip,
      ok: true,
    });
    const token = await issueSession({ ...user, adminSessionVersion });
    return json({ email: user.email }, 200, { cookies: [sessionCookie(token)] });
  },
);

adminRoute('adminMe', { methods: ['GET'], route: 'auth/me' }, async ({ admin }) =>
  json({ id: admin.userId, email: admin.email }),
);

adminRoute('adminLogout', { methods: ['POST'], route: 'auth/logout' }, async () =>
  json({ ok: true }, 200, { cookies: [clearedCookie()] }),
);

/** Signs out every admin session of the caller (all browsers). */
adminRoute('adminLogoutAll', { methods: ['POST'], route: 'auth/logout-all' }, async ({ admin }) => {
  await users.merge(admin.userId, { adminSessionVersion: (admin.adminSessionVersion ?? 0) + 1 });
  return json({ ok: true }, 200, { cookies: [clearedCookie()] });
});
