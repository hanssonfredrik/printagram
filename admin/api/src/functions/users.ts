import {
  badRequest,
  books,
  conflict,
  deleteUserData,
  forbidden,
  json,
  libraries,
  lookups,
  notFound,
  orders,
  parseEmail,
  readJson,
  users,
  type UserRow,
} from '../core.js';
import { noCents, orderCurrency, type CurrencyCents } from '../lib/money.js';
import { adminRoute } from '../lib/route.js';
import { bookView, libraryView, orderView, userView } from '../lib/views.js';

const PAID = new Set(['paid', 'ready']);

function page<T>(items: T[], req: { query: URLSearchParams }) {
  const limit = Math.min(200, Math.max(1, Number(req.query.get('limit') ?? 50) || 50));
  const offset = Math.max(0, Number(req.query.get('offset') ?? 0) || 0);
  return { total: items.length, offset, limit, items: items.slice(offset, offset + limit) };
}

async function mustGet(id: string): Promise<UserRow> {
  const u = await users.get(id);
  if (!u) throw notFound('User');
  return u;
}

/** GET users?q=&type=all|registered|anonymous|admin&sort=created|seen&limit&offset */
adminRoute('usersList', { methods: ['GET'], route: 'users' }, async ({ req }) => {
  const q = (req.query.get('q') ?? '').trim().toLowerCase();
  const type = req.query.get('type') ?? 'registered';
  const sort = req.query.get('sort') === 'seen' ? 'lastSeenAt' : 'createdAt';

  const stats = new Map<string, { orders: number; paidCents: CurrencyCents }>();
  for await (const o of orders.scanAll()) {
    const s = stats.get(o.userId) ?? { orders: 0, paidCents: noCents() };
    if (PAID.has(o.status)) {
      s.orders++;
      s.paidCents[orderCurrency(o)] += o.amountCents;
    }
    stats.set(o.userId, s);
  }

  const out: (ReturnType<typeof userView> & { paidOrders: number; paidCents: CurrencyCents })[] =
    [];
  for await (const u of users.scanAll()) {
    if (type === 'registered' && !u.email) continue;
    if (type === 'anonymous' && u.email) continue;
    if (type === 'admin' && u.isAdmin !== true) continue;
    if (q && !(u.email ?? '').includes(q) && !u.userId.includes(q)) continue;
    const s = stats.get(u.userId);
    out.push({ ...userView(u), paidOrders: s?.orders ?? 0, paidCents: s?.paidCents ?? noCents() });
  }
  out.sort((a, b) => (b[sort] ?? '').localeCompare(a[sort] ?? ''));
  return json(page(out, req));
});

adminRoute('usersGet', { methods: ['GET'], route: 'users/{id}' }, async ({ req }) => {
  const u = await mustGet(req.params.id ?? '');
  const [libs, bks, ords] = await Promise.all([
    libraries.list(u.userId),
    books.list(u.userId),
    orders.list(u.userId),
  ]);
  return json({
    user: userView(u),
    libraries: libs.map(libraryView),
    books: bks.map(bookView),
    orders: ords
      .map((o) => orderView(o, u.email))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
});

/** PATCH users/{id} { email?, lang?, isAdmin? } */
adminRoute(
  'usersUpdate',
  { methods: ['PATCH'], route: 'users/{id}' },
  async ({ req, admin, note }) => {
    const u = await mustGet(req.params.id ?? '');
    const body = await readJson<{ email?: unknown; lang?: unknown; isAdmin?: unknown }>(req);
    const patch: Partial<UserRow> = {};
    const changes: string[] = [];

    if (body.lang !== undefined) {
      if (body.lang !== 'en' && body.lang !== 'sv')
        throw badRequest('INVALID_FIELD', 'lang must be en or sv.');
      if (body.lang !== u.lang) {
        patch.lang = body.lang;
        changes.push(`lang ${u.lang ?? '-'} → ${body.lang}`);
      }
    }

    if (body.isAdmin !== undefined) {
      if (typeof body.isAdmin !== 'boolean')
        throw badRequest('INVALID_FIELD', 'isAdmin must be true or false.');
      if (u.userId === admin.userId)
        throw forbidden('SELF', 'You cannot change your own admin access.');
      if (body.isAdmin && !u.passwordHash)
        throw badRequest('NO_PASSWORD', 'Only accounts with a password can be admins.');
      if (body.isAdmin !== (u.isAdmin === true)) {
        patch.isAdmin = body.isAdmin;
        // Any change ends that user's admin sessions; removal also forgets the authenticator.
        patch.adminSessionVersion = (u.adminSessionVersion ?? 0) + 1;
        if (!body.isAdmin) patch.adminTotpSecret = null;
        changes.push(`isAdmin ${u.isAdmin === true} → ${body.isAdmin}`);
      }
    }

    let oldEmail: string | null = null;
    if (body.email !== undefined) {
      const next = parseEmail(body.email);
      if (next !== u.email) {
        const claimed = await lookups.insert('email', next, { userId: u.userId });
        if (!claimed && (await lookups.get('email', next))?.userId !== u.userId)
          throw conflict('EMAIL_TAKEN', 'Another account already uses that email.');
        patch.email = next;
        if (u.authLevel === 'anonymous') patch.authLevel = 'email';
        oldEmail = u.email;
        changes.push(`email ${u.email ?? '-'} → ${next}`);
      }
    }

    if (changes.length) {
      await users.merge(u.userId, patch);
      if (oldEmail) await lookups.delete('email', oldEmail);
    }
    note(changes.join('; ') || 'no change', u.userId);
    return json({ user: userView({ ...u, ...patch }) });
  },
);

/** Signs the user out of the main site everywhere. */
adminRoute(
  'usersLogoutAll',
  { methods: ['POST'], route: 'users/{id}/logout-all' },
  async ({ req, note }) => {
    const u = await mustGet(req.params.id ?? '');
    await users.merge(u.userId, { sessionVersion: u.sessionVersion + 1 });
    note('signed out of the site everywhere', u.userId);
    return json({ ok: true });
  },
);

/** Forgets another admin's authenticator; they enroll again at next sign-in. */
adminRoute(
  'usersResetMfa',
  { methods: ['POST'], route: 'users/{id}/reset-mfa' },
  async ({ req, admin, note }) => {
    const u = await mustGet(req.params.id ?? '');
    if (u.userId === admin.userId)
      throw forbidden(
        'SELF',
        'You cannot reset your own authenticator here. Use scripts/admin.ts.',
      );
    await users.merge(u.userId, {
      adminTotpSecret: null,
      adminTotpLastStep: 0,
      adminSessionVersion: (u.adminSessionVersion ?? 0) + 1,
    });
    note('authenticator reset', u.userId);
    return json({ ok: true });
  },
);

/** DELETE users/{id} { confirm: <email, or id for anonymous users> } */
adminRoute(
  'usersDelete',
  { methods: ['DELETE'], route: 'users/{id}' },
  async ({ req, admin, note }) => {
    const u = await mustGet(req.params.id ?? '');
    if (u.userId === admin.userId)
      throw forbidden('SELF', 'You cannot delete your own account here.');
    const body = await readJson<{ confirm?: unknown }>(req);
    if (body.confirm !== (u.email ?? u.userId))
      throw badRequest('CONFIRM', 'Type the user’s email (or id) to confirm.');
    note(`deleted ${u.email ?? 'anonymous user'}`, u.userId);
    await deleteUserData(u);
    return json({ deleted: true });
  },
);
