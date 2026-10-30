import { config } from './config.js';

/**
 * Thin client for "Instagram API with Unified Login": Facebook Login for Business with a login
 * configuration (`config_id`) that hands out a business integration system-user token for the
 * Instagram account(s) the person picks. Meta gives new apps only this or the Page-linked
 * Facebook Login; the older Instagram Login (graph.instagram.com) is closed to them.
 * Docs: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login
 */

/** Pinned: unversioned calls go to the oldest live version, which Meta retires without notice. */
export const API_VERSION = 'v26.0';
const DIALOG = `https://www.facebook.com/${API_VERSION}/dialog/oauth`;
const GRAPH = 'https://graph.facebook.com';
/** Read access to the shared account's profile and media. The only permission we ask for. */
export const PERMISSION = 'instagram_basic';
/** We never keep access longer than this, whatever expiry the configuration gives the token. */
export const TOKEN_MAX_DAYS = 60;

export interface IgMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  caption?: string;
  like_count?: number;
  permalink?: string;
  children?: {
    data: { id: string; media_type: 'IMAGE' | 'VIDEO'; media_url?: string; timestamp?: string }[];
  };
}

export interface IgAccount {
  id: string;
  username: string;
}

export function authorizeUrl(state: string): string {
  const u = new URL(DIALOG);
  u.searchParams.set('client_id', config.instagram.appId);
  u.searchParams.set('config_id', config.instagram.configId);
  u.searchParams.set('redirect_uri', config.instagram.redirectUri);
  // System-user tokens need the authorization code flow.
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('override_default_response_type', 'true');
  u.searchParams.set('state', state);
  return u.toString();
}

/** Meta's error code 190 means the token is gone: expired, revoked or the app was removed. */
export function isTokenError(message: string): boolean {
  return /\(#190\)|OAuthException|Invalid OAuth|access token/i.test(message);
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const u = new URL(`${GRAPH}/${API_VERSION}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u);
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string; code?: number; type?: string };
  };
  if (!res.ok || body.error) {
    const e = body.error;
    throw new Error(
      `meta ${path}: ${e?.code ? `(#${e.code}) ` : ''}${e?.type ? `${e.type} ` : ''}${e?.message ?? res.status}`,
    );
  }
  return body;
}

/** Trades the dialog's code for the system-user token. `expires_in` is absent for tokens that never expire. */
export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; expires_in: number | null }> {
  const body = await graph<{ access_token?: string; expires_in?: number }>('oauth/access_token', {
    client_id: config.instagram.appId,
    client_secret: config.instagram.appSecret,
    redirect_uri: config.instagram.redirectUri,
    code,
  });
  if (!body.access_token) throw new Error('meta oauth/access_token: no token in the answer');
  return { access_token: body.access_token, expires_in: body.expires_in ?? null };
}

/** The system user behind the token (not the person), and the portfolio it belongs to. */
export async function systemUser(
  token: string,
): Promise<{ id: string; client_business_id?: string }> {
  return graph('me', { fields: 'id,client_business_id', access_token: token });
}

/** The Instagram accounts the person shared in the dialog. Usually exactly one. */
export async function instagramAccounts(token: string): Promise<IgAccount[]> {
  const body = await graph<{ data?: IgAccount[] }>('me/assigned_instagram_accounts', {
    fields: 'id,username',
    access_token: token,
  });
  return body.data ?? [];
}

export async function mediaPage(
  token: string,
  igUserId: string,
  after: string | null,
  since: string | null,
): Promise<{ data: IgMedia[]; next: string | null }> {
  const params: Record<string, string> = {
    fields:
      'id,media_type,media_url,thumbnail_url,timestamp,caption,like_count,permalink,children{id,media_type,media_url,timestamp}',
    limit: '50',
    access_token: token,
  };
  if (after) params.after = after;
  if (since) params.since = String(Math.floor(new Date(since).getTime() / 1000));
  const body = await graph<{
    data: IgMedia[];
    paging?: { cursors?: { after?: string }; next?: string };
  }>(`${igUserId}/media`, params);
  return {
    data: body.data ?? [],
    next: body.paging?.next ? (body.paging.cursors?.after ?? null) : null,
  };
}

export async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`media download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
