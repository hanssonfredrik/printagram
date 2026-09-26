import { config } from './config.js';

/**
 * Thin client for Google OAuth 2.0 and the Google Photos Picker API. The Picker is the only
 * way a third party can read a user's Google Photos library since March 2025: the user picks
 * photos inside Google Photos, and the app can list and download exactly that selection.
 * Docs: https://developers.google.com/photos/picker/guides/get-started-picker
 */

const OAUTH_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const OAUTH_REVOKE = 'https://oauth2.googleapis.com/revoke';
const PICKER = 'https://photospicker.googleapis.com/v1';
export const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';

export class GoogleApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

export interface PickerSession {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
  expireTime?: string;
}

export interface PickedMediaItem {
  id: string;
  createTime: string;
  type: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename?: string;
    mediaFileMetadata?: { width?: number; height?: number };
  };
}

export function authorizeUrl(state: string): string {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('client_id', config.google.clientId);
  u.searchParams.set('redirect_uri', config.google.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPE);
  u.searchParams.set('state', state);
  // Online access only: the token lives an hour, long enough to pick and copy. Nothing is kept.
  u.searchParams.set('access_type', 'online');
  u.searchParams.set('prompt', 'select_account');
  return u.toString();
}

export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; expires_in: number }> {
  const form = new URLSearchParams({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.google.redirectUri,
    code,
  });
  const res = await fetch(OAUTH_TOKEN, { method: 'POST', body: form });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token)
    throw new GoogleApiError(
      res.status,
      `google token: ${body.error_description ?? body.error ?? res.status}`,
    );
  return { access_token: body.access_token, expires_in: body.expires_in ?? 3600 };
}

/** Best effort: Google forgets the grant, so the token stops working before it expires. */
export async function revoke(token: string): Promise<void> {
  await fetch(`${OAUTH_REVOKE}?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(
    () => undefined,
  );
}

async function picker<T>(
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const u = new URL(`${PICKER}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  const res = await fetch(u, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  const text = await res.text();
  let body = {} as T & { error?: { message?: string } };
  try {
    if (text) body = JSON.parse(text);
  } catch {
    // non-JSON error page: reported by status below
  }
  if (!res.ok)
    throw new GoogleApiError(
      res.status,
      `google picker ${path}: ${body.error?.message ?? res.status}`,
    );
  return body;
}

export const createSession = (token: string) => picker<PickerSession>(token, 'POST', 'sessions');

export const getSession = (token: string, id: string) =>
  picker<PickerSession>(token, 'GET', `sessions/${encodeURIComponent(id)}`);

export const deleteSession = (token: string, id: string) =>
  picker<unknown>(token, 'DELETE', `sessions/${encodeURIComponent(id)}`).catch(() => undefined);

export async function mediaPage(
  token: string,
  sessionId: string,
  pageToken: string | null,
): Promise<{ items: PickedMediaItem[]; next: string | null }> {
  const body = await picker<{ mediaItems?: PickedMediaItem[]; nextPageToken?: string }>(
    token,
    'GET',
    'mediaItems',
    { sessionId, pageSize: '100', pageToken: pageToken ?? '' },
  );
  return { items: body.mediaItems ?? [], next: body.nextPageToken ?? null };
}

/** Google's polling hint ("5s") as milliseconds, kept within sane bounds. */
export function pollIntervalMs(s: PickerSession): number {
  const secs = Number.parseFloat(s.pollingConfig?.pollInterval ?? '');
  const ms = Number.isFinite(secs) ? secs * 1000 : 3000;
  return Math.min(15_000, Math.max(1500, ms));
}

/** Downloads the original bytes. Base URLs need the bearer token and a `=d` (download) suffix. */
export async function fetchBytes(token: string, baseUrl: string): Promise<Buffer> {
  const res = await fetch(`${baseUrl}=d`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new GoogleApiError(res.status, `media download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
