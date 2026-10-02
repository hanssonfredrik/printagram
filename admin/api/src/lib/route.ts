import {
  app,
  type HttpHandler,
  type HttpMethod,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import {
  audit,
  clientIp,
  forbidden,
  HttpError,
  json,
  newId,
  nowIso,
  type UserRow,
} from '../core.js';
import { clearedCookie, resolveSession } from './session.js';

/**
 * Every admin endpoint is registered through adminRoute(). It fails closed:
 *   1. Every request must carry X-Requested-With: inbunden-admin. Browsers cannot send a custom
 *      header cross-site without a CORS preflight, which this API never answers, so forged
 *      requests from other sites stop here. Sec-Fetch-Site / Origin, when present, must be
 *      same-origin too.
 *   2. Unless the route is one of PUBLIC_ROUTES (the login steps), a valid admin session is
 *      required: cookie → JWT → fresh user row with isAdmin, MFA enrolled and matching versions.
 *   3. Every mutating call (and GETs marked `auditRead`) is written to the AdminAudit table.
 */

/** The only routes reachable without a session. Tested in test/admin.test.ts. */
export const PUBLIC_ROUTES = new Set(['adminLogin', 'adminTotp', 'adminEnroll']);

/** Names of every registered route (for the "all routes are protected" test). */
export const registeredRoutes: {
  name: string;
  auth: 'admin' | 'public';
  methods: HttpMethod[];
  route: string;
}[] = [];

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'inbunden-admin';

interface BaseCtx {
  req: HttpRequest;
  ctx: InvocationContext;
  ip: string;
  /** Adds a target and/or a short detail to this call's audit row. */
  note(detail: string | null, target?: string | null): void;
}
export interface AdminCtx extends BaseCtx {
  admin: UserRow;
}
export type PublicCtx = BaseCtx;

interface Options {
  methods: HttpMethod[];
  route: string;
  /** Write an audit row for this GET too (e.g. handing out a PDF link). */
  auditRead?: boolean;
}

function sameOrigin(req: HttpRequest): boolean {
  if (req.headers.get(CSRF_HEADER) !== CSRF_VALUE) return false;
  // Sec-Fetch-Site is set by the browser and cannot be forged by a page: when present it decides.
  // (Behind Static Web Apps the function does not see the public Host, so Origin cannot be
  // compared against it reliably.)
  const site = req.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  // Older browsers without Fetch Metadata: compare Origin with the forwarded host.
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser client; no ambient cookies are at risk
  const hosts = [req.headers.get('x-forwarded-host'), req.headers.get('host')]
    .flatMap((h) => (h ?? '').split(','))
    .map((h) => h.trim())
    .filter(Boolean);
  try {
    return hosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
}

function withHeaders(res: HttpResponseInit): HttpResponseInit {
  return {
    ...res,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...((res.headers as Record<string, string> | undefined) ?? {}),
    },
  };
}

export async function record(row: {
  actor: UserRow | null;
  actorEmail?: string | null;
  action: string;
  target?: string | null;
  detail?: string | null;
  ip: string;
  ok: boolean;
}): Promise<void> {
  await audit.add({
    auditId: newId(),
    at: nowIso(),
    actorId: row.actor?.userId ?? null,
    actorEmail: row.actorEmail ?? row.actor?.email ?? null,
    action: row.action,
    target: row.target ?? null,
    detail: row.detail ? row.detail.slice(0, 500) : null,
    ip: row.ip,
    ok: row.ok,
  });
}

export function adminRoute(
  name: string,
  opts: Options & { auth: 'public' },
  handler: (c: PublicCtx) => Promise<HttpResponseInit>,
): void;
export function adminRoute(
  name: string,
  opts: Options & { auth?: 'admin' },
  handler: (c: AdminCtx) => Promise<HttpResponseInit>,
): void;
export function adminRoute(
  name: string,
  opts: Options & { auth?: 'admin' | 'public' },
  handler:
    ((c: AdminCtx) => Promise<HttpResponseInit>) | ((c: PublicCtx) => Promise<HttpResponseInit>),
): void {
  const auth = opts.auth ?? 'admin';
  if (auth === 'public' && !PUBLIC_ROUTES.has(name))
    throw new Error(`${name} is not allowed to be public; add it to PUBLIC_ROUTES deliberately`);
  registeredRoutes.push({ name, auth, methods: opts.methods, route: opts.route });

  const fn: HttpHandler = async (req, ctx) => {
    const started = Date.now();
    const ip = clientIp(req.headers);
    let admin: UserRow | null = null;
    let target: string | null = null;
    let detail: string | null = null;
    let status = 500;
    const note = (d: string | null, t?: string | null) => {
      if (d !== null) detail = d;
      if (t !== undefined) target = t;
    };
    try {
      if (!sameOrigin(req)) throw forbidden('CROSS_ORIGIN', 'Request refused.');
      if (auth === 'admin') {
        admin = await resolveSession(req);
        if (!admin) {
          status = 401;
          return withHeaders(
            json({ error: { code: 'UNAUTHORIZED', message: 'Please sign in.' } }, 401, {
              cookies: [clearedCookie()],
            }),
          );
        }
      }
      const res = admin
        ? await (handler as (c: AdminCtx) => Promise<HttpResponseInit>)({
            req,
            ctx,
            ip,
            note,
            admin,
          })
        : await (handler as (c: PublicCtx) => Promise<HttpResponseInit>)({ req, ctx, ip, note });
      status = res.status ?? 200;
      return withHeaders(res);
    } catch (e) {
      if (e instanceof HttpError) {
        status = e.status;
        return withHeaders(json({ error: { code: e.code, message: e.message } }, e.status));
      }
      ctx.error(`${name}: unhandled`, e);
      return withHeaders(
        json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } }, 500),
      );
    } finally {
      const mutating = req.method !== 'GET' && req.method !== 'HEAD';
      if (admin && (mutating || opts.auditRead)) {
        await record({
          actor: admin,
          action: name,
          target: target ?? (Object.values(req.params ?? {}).join('/') || null),
          detail,
          ip,
          ok: status < 400,
        }).catch((e) => ctx.error(`${name}: audit write failed`, e));
      }
      ctx.log(
        `${name} ${req.method} ${new URL(req.url).pathname} ${status} ${Date.now() - started}ms`,
      );
    }
  };
  app.http(name, { methods: opts.methods, route: opts.route, authLevel: 'anonymous', handler: fn });
}
