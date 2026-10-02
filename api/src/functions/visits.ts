import { clientIp, noContent, readJson, route } from '../lib/http.js';
import { addDays, newId, nowIso, randomToken, sha256 } from '../lib/ids.js';
import { lookups, visits, type VisitRow } from '../lib/tables.js';

/**
 * Cookieless page-view beacon (POST /api/v from app/src/services/visits.ts).
 *
 * Nothing identifying is stored: no cookie, no IP. Unique visitors are counted with
 * sha256(daily salt + IP + user agent); the salt is random per day and deleted afterwards
 * (cron cleanupTokens), so hashes cannot be linked across days or reversed. Rows are kept
 * 90 days (cron cleanupVisits).
 */

const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|axios|node-fetch|go-http|java\//i;

/** Per-instance limiter: a stats endpoint does not deserve a table write per check. */
const recent = new Map<string, { minute: number; n: number }>();
function allowed(ip: string): boolean {
  const minute = Math.floor(Date.now() / 60_000);
  const r = recent.get(ip);
  if (!r || r.minute !== minute) {
    if (recent.size > 5000) recent.clear();
    recent.set(ip, { minute, n: 1 });
    return true;
  }
  return ++r.n <= 60;
}

const salts = new Map<string, string>();
async function saltFor(day: string): Promise<string> {
  const cached = salts.get(day);
  if (cached) return cached;
  let row = await lookups.get('visit_salt', day);
  if (!row?.value) {
    await lookups.insert('visit_salt', day, {
      value: randomToken(),
      expiresAt: addDays(`${day}T00:00:00Z`, 2).toISOString(),
    });
    row = await lookups.get('visit_salt', day);
  }
  const salt = row?.value ?? randomToken();
  salts.clear();
  salts.set(day, salt);
  return salt;
}

export function deviceOf(ua: string): VisitRow['device'] {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Routes whose last segment is a secret or an id: stored as a placeholder, never verbatim. */
const PARAM_ROUTES: [RegExp, string][] = [
  [/^\/s\/[^/]+$/, '/s/:token'],
  [/^\/r\/[^/]+$/, '/r/:token'],
  [/^\/reset\/[^/]+$/, '/reset/:token'],
  [/^\/done\/[^/]+$/, '/done/:orderId'],
];

export function cleanPath(p: unknown): string | null {
  if (typeof p !== 'string' || !p.startsWith('/') || p.length > 200) return null;
  let path = p.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (path.startsWith('/api/')) return null;
  for (const [re, placeholder] of PARAM_ROUTES) if (re.test(path)) path = placeholder;
  return path;
}

export function refHost(r: unknown, ownHost: string): string {
  if (typeof r !== 'string' || !r) return '';
  try {
    const host = new URL(r).hostname.replace(/^www\./, '').slice(0, 100);
    return host === ownHost.replace(/^www\./, '').split(':')[0] ? '' : host;
  } catch {
    return '';
  }
}

route('visitTrack', { methods: ['POST'], route: 'v', auth: 'none' }, async ({ req }) => {
  const ua = req.headers.get('user-agent') ?? '';
  const ip = clientIp(req.headers);
  if (!ua || BOT_UA.test(ua) || !allowed(ip)) return noContent();
  type Beacon = { p?: unknown; r?: unknown; l?: unknown };
  const body: Beacon = await readJson<Beacon>(req).catch(() => ({}));
  const path = cleanPath(body.p);
  if (!path) return noContent();
  const at = nowIso();
  const day = at.slice(0, 10);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  await visits.add({
    day,
    visitId: newId(),
    at,
    path,
    ref: refHost(body.r, host),
    device: deviceOf(ua),
    lang: body.l === 'sv' || body.l === 'en' ? body.l : '',
    visitor: sha256(`${await saltFor(day)}|${ip}|${ua}`).slice(0, 16),
  });
  return noContent();
});
