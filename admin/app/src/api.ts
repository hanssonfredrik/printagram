/** Fetch wrapper for the admin API. Every call carries the anti-CSRF header the API requires. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onSignedOut: () => void = () => undefined;
/** Called when a non-auth call returns 401 (session expired or revoked). */
export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: opts.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'X-Requested-With': 'inbunden-admin',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as
    (T & { error?: { code: string; message: string } }) | null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('auth/')) onSignedOut();
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'HTTP_' + res.status,
      data?.error?.message ?? `Request failed (${res.status}).`,
    );
  }
  return data as T;
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}
