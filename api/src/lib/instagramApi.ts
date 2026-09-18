import { config } from './config.js';

/**
 * Thin client for "Instagram API with Instagram Login" (Business Login for Instagram).
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */

const OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
const OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';
export const SCOPE = 'instagram_business_basic';

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

export function authorizeUrl(state: string): string {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('client_id', config.instagram.appId);
  u.searchParams.set('redirect_uri', config.instagram.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPE);
  u.searchParams.set('state', state);
  u.searchParams.set('enable_fb_login', '0');
  return u.toString();
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const u = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u);
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string; code?: number };
  };
  if (!res.ok || body.error)
    throw new Error(`instagram ${path}: ${body.error?.message ?? res.status}`);
  return body;
}

export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; user_id: string }> {
  const form = new URLSearchParams({
    client_id: config.instagram.appId,
    client_secret: config.instagram.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.instagram.redirectUri,
    code,
  });
  const res = await fetch(OAUTH_TOKEN, { method: 'POST', body: form });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    user_id?: string | number;
    error_message?: string;
    error_type?: string;
  };
  if (!res.ok || !body.access_token)
    throw new Error(`instagram token: ${body.error_message ?? body.error_type ?? res.status}`);
  return { access_token: body.access_token, user_id: String(body.user_id) };
}

export async function longLivedToken(
  shortToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  return graph('access_token', {
    grant_type: 'ig_exchange_token',
    client_secret: config.instagram.appSecret,
    access_token: shortToken,
  });
}

export async function refreshToken(
  longToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  return graph('refresh_access_token', { grant_type: 'ig_refresh_token', access_token: longToken });
}

export async function me(
  token: string,
): Promise<{ user_id: string; username: string; media_count?: number; account_type?: string }> {
  return graph('me', { fields: 'user_id,username,media_count,account_type', access_token: token });
}

export async function mediaPage(
  token: string,
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
  }>('me/media', params);
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
