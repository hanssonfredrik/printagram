import {
  app,
  type HttpHandler,
  type HttpMethod,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { langFromAcceptLanguage, matchLang, type Lang } from '@printagram/shared';
import { users, type UserRow } from './tables.js';
import { authenticate, type AuthResult } from './auth.js';
import { config } from './config.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
export const unauthorized = (message = 'Please sign in.') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (code: string, message: string) => new HttpError(403, code, message);
export const notFound = (what = 'Resource') =>
  new HttpError(404, 'NOT_FOUND', `${what} not found.`);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

export function json(
  body: unknown,
  status = 200,
  extra: Partial<HttpResponseInit> = {},
): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: { 'Cache-Control': 'no-store', ...(extra.headers ?? {}) },
    ...extra,
  };
}

export function noContent(extra: Partial<HttpResponseInit> = {}): HttpResponseInit {
  return { status: 204, ...extra };
}

export function redirect(
  location: string,
  extra: Partial<HttpResponseInit> = {},
): HttpResponseInit {
  return {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store', ...(extra.headers ?? {}) },
    ...extra,
  };
}

export interface Ctx {
  req: HttpRequest;
  ctx: InvocationContext;
  /** Present when the request carried a valid session cookie. */
  user: UserRow | null;
  auth: AuthResult;
  /** UI language of the caller: X-Lang (sent by the app), else Accept-Language, else English. */
  lang: Lang;
}

export interface AuthedCtx extends Ctx {
  user: UserRow;
}

type Handler<C extends Ctx> = (c: C) => Promise<HttpResponseInit>;

export interface RouteOptions {
  methods: HttpMethod[];
  route: string;
  /** 'required' rejects with 401, 'optional' passes null, 'none' skips cookie parsing. */
  auth: 'required' | 'optional' | 'none';
  /** Skip the same-origin check (webhooks, callbacks). */
  allowCrossOrigin?: boolean;
}

async function readJson<T>(req: HttpRequest): Promise<T> {
  const text = await req.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw badRequest('INVALID_JSON', 'Request body must be valid JSON.');
  }
}

function sameOrigin(req: HttpRequest): boolean {
  const origin = req.headers.get('origin');
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'none') return true;
  if (!origin) return true; // non-browser clients (curl, tests); cookies would not be sent cross-site anyway
  try {
    const o = new URL(origin);
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
    return (
      o.host === host ||
      o.origin === config.appBaseUrl ||
      (config.isDev && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(o.host))
    );
  } catch {
    return false;
  }
}

/**
 * Registers an HTTP function with cookie auth, CSRF origin check, JSON error envelope and
 * structured logging. Handlers get a typed context and throw HttpError for client errors.
 */
export function route(
  name: string,
  opts: RouteOptions & { auth: 'required' },
  handler: Handler<AuthedCtx>,
): void;
export function route(
  name: string,
  opts: RouteOptions & { auth: 'optional' | 'none' },
  handler: Handler<Ctx>,
): void;
export function route(
  name: string,
  opts: RouteOptions,
  handler: Handler<Ctx> | Handler<AuthedCtx>,
): void {
  const fn: HttpHandler = async (req, ctx) => {
    const started = Date.now();
    try {
      if (
        req.method !== 'GET' &&
        req.method !== 'HEAD' &&
        !opts.allowCrossOrigin &&
        !sameOrigin(req)
      ) {
        throw forbidden('CROSS_ORIGIN', 'Cross-origin requests are not allowed.');
      }
      const auth = opts.auth === 'none' ? { user: null, expired: false } : await authenticate(req);
      if (opts.auth === 'required' && !auth.user) throw unauthorized();
      const explicit = matchLang(req.headers.get('x-lang'));
      const lang = explicit ?? langFromAcceptLanguage(req.headers.get('accept-language'));
      // Remember the app's language on the user so emails sent later (cron) use it too.
      if (explicit && auth.user && auth.user.lang !== explicit) {
        auth.user.lang = explicit;
        await users.merge(auth.user.userId, { lang: explicit }).catch(() => undefined);
      }
      const res = await (handler as Handler<Ctx>)({ req, ctx, user: auth.user, auth, lang });
      return res;
    } catch (e) {
      if (e instanceof HttpError) {
        if (e.status >= 500) ctx.error(`${name}: ${e.code} ${e.message}`);
        return json({ error: { code: e.code, message: e.message } }, e.status);
      }
      ctx.error(`${name}: unhandled`, e);
      return json(
        { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
        500,
      );
    } finally {
      ctx.log(`${name} ${req.method} ${new URL(req.url).pathname} ${Date.now() - started}ms`);
    }
  };
  app.http(name, { methods: opts.methods, route: opts.route, authLevel: 'anonymous', handler: fn });
}

export { readJson };

/** Caller IP as forwarded by Static Web Apps (first X-Forwarded-For hop). Only for rate limits. */
export function clientIp(headers: { get(name: string): string | null }): string {
  return (headers.get('x-forwarded-for') ?? headers.get('x-client-ip') ?? 'unknown')
    .split(',')[0]!
    .trim();
}

/** Type helpers for body validation. */
export function str(
  v: unknown,
  field: string,
  opts: { max?: number; min?: number; optional?: boolean } = {},
): string {
  if (v === undefined || v === null) {
    if (opts.optional) return '';
    throw badRequest('MISSING_FIELD', `${field} is required.`);
  }
  if (typeof v !== 'string') throw badRequest('INVALID_FIELD', `${field} must be a string.`);
  if (opts.min !== undefined && v.length < opts.min)
    throw badRequest('INVALID_FIELD', `${field} is too short.`);
  if (opts.max !== undefined && v.length > opts.max)
    throw badRequest('INVALID_FIELD', `${field} is too long.`);
  return v;
}

export function email(v: unknown): string {
  const s = str(v, 'email', { max: 254 }).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    throw badRequest('INVALID_EMAIL', 'Please enter a valid email address.');
  return s;
}
