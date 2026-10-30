import { timingSafeEqual } from 'node:crypto';
import { normalizeLang } from '@printagram/shared';
import {
  deleteBlob,
  deleteContainer,
  listBlobs,
  listContainers,
  PDF_CONTAINER,
} from '../lib/blobs.js';
import { config } from '../lib/config.js';
import { mailer, templates } from '../lib/email.js';
import { forbidden, json, readJson, route } from '../lib/http.js';
import { addDays, nowIso } from '../lib/ids.js';
import { destroyLibrary } from '../lib/libraryService.js';
import {
  deletePartition,
  libraries,
  lookups,
  orders,
  photos,
  users,
  visits,
} from '../lib/tables.js';

const BUDGET_MS = 25_000;

type Task =
  | 'expireLibraries'
  | 'sendReminders'
  | 'expireIgTokens'
  | 'cleanupOrphans'
  | 'cleanupAnonymous'
  | 'cleanupTokens'
  | 'cleanupVisits';

/** Days of raw page-view rows kept for the admin's visitor stats. */
const VISIT_RETENTION_DAYS = 90;

/**
 * Scheduled maintenance, driven by GitHub Actions (.github/workflows/cron.yml).
 * Each task works for ≤ 25 s and reports `more` so the caller can loop.
 */
route(
  'cronRun',
  { methods: ['POST'], route: 'cron/run', auth: 'none', allowCrossOrigin: true },
  async ({ req, ctx }) => {
    const given = Buffer.from(req.headers.get('x-cron-key') ?? '');
    const expected = Buffer.from(config.cronSecret);
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      throw forbidden('BAD_CRON_KEY', 'Invalid cron key.');
    const body = await readJson<{ task?: Task }>(req);
    const task = body.task;
    const started = Date.now();
    const budget = () => Date.now() - started < BUDGET_MS;
    let processed = 0;
    let more = false;
    const now = new Date();

    switch (task) {
      case 'expireLibraries': {
        for await (const l of libraries.scanAll()) {
          if (!budget()) {
            more = true;
            break;
          }
          if (l.status !== 'ready' || new Date(l.expiresAt) > now) continue;
          await destroyLibrary(l, true);
          const u = await users.get(l.userId);
          if (u?.email)
            await mailer()
              .send(
                templates.libraryDeleted(
                  u.email,
                  `${config.appBaseUrl}/books`,
                  normalizeLang(u.lang),
                ),
              )
              .catch(() => undefined);
          processed++;
        }
        break;
      }
      case 'sendReminders': {
        const horizon = addDays(now, config.reminderDaysBefore);
        for await (const l of libraries.scanAll()) {
          if (!budget()) {
            more = true;
            break;
          }
          if (
            l.status !== 'ready' ||
            l.reminderSentAt ||
            new Date(l.expiresAt) > horizon ||
            new Date(l.expiresAt) < now
          )
            continue;
          const u = await users.get(l.userId);
          if (u?.email) {
            await mailer().send(
              templates.libraryReminder(
                u.email,
                l.photoCount,
                l.expiresAt,
                Math.max(
                  1,
                  Math.ceil((new Date(l.expiresAt).getTime() - now.getTime()) / 86_400_000),
                ),
                `${config.appBaseUrl}/books`,
                `${config.appBaseUrl}/books?delete=1`,
                normalizeLang(u.lang),
              ),
            );
          }
          await libraries.merge(l.userId, l.libraryId, { reminderSentAt: nowIso() });
          processed++;
        }
        break;
      }
      case 'expireIgTokens': {
        // Instagram access ends after 60 days (instagramApi TOKEN_MAX_DAYS): the stored token is
        // deleted, and the person connects again if they want new posts. Nothing is refreshed.
        for await (const l of libraries.scanAll()) {
          if (!budget()) {
            more = true;
            break;
          }
          if (!l.igTokenEnc || !l.igTokenExpiresAt || new Date(l.igTokenExpiresAt) > now) continue;
          await libraries.merge(l.userId, l.libraryId, {
            igTokenEnc: null,
            igConnected: false,
            igTokenExpiresAt: null,
          });
          processed++;
        }
        break;
      }
      case 'cleanupOrphans': {
        // Containers without a live library row.
        const live = new Set<string>();
        const pending: { libraryId: string; takenAt: string; photoId: string }[] = [];
        for await (const l of libraries.scanAll()) {
          if (l.status === 'ready' || l.status === 'importing') live.add(`lib-${l.libraryId}`);
        }
        for await (const name of listContainers('lib-')) {
          if (!budget()) {
            more = true;
            break;
          }
          if (!live.has(name)) {
            await deleteContainer(name);
            await photos.deleteAll(name.replace(/^lib-/, ''));
            processed++;
          }
        }
        // Pending photo rows older than 48 h never got their upload confirmed.
        const stale = addDays(now, -2).toISOString();
        for (const name of live) {
          if (!budget()) {
            more = true;
            break;
          }
          const rows = await photos.listAll(name.replace(/^lib-/, ''));
          for (const p of rows)
            if (p.status === 'pending' && p.importedAt < stale)
              pending.push({ libraryId: p.libraryId, takenAt: p.takenAt, photoId: p.photoId });
        }
        for (const p of pending)
          await photos.mergeMany(p.libraryId, [
            { takenAt: p.takenAt, photoId: p.photoId, patch: { status: 'missing' } },
          ]);
        processed += pending.length;
        // Incomplete PDF versions older than 24 h.
        const cutoff = addDays(now, -1);
        for await (const b of listBlobs(PDF_CONTAINER)) {
          if (!budget()) {
            more = true;
            break;
          }
          if (b.lastModified > cutoff) continue;
          const [orderId] = b.name.split('/');
          const owner = await findOrderOwner(orderId ?? '');
          if (!owner || owner.pdfBlob !== b.name) {
            await deleteBlob(PDF_CONTAINER, b.name);
            processed++;
          }
        }
        break;
      }
      case 'cleanupAnonymous': {
        const cutoff = addDays(now, -30).toISOString();
        for await (const l of libraries.scanAll()) {
          if (!budget()) {
            more = true;
            break;
          }
          const u = await users.get(l.userId);
          if (!u || u.authLevel !== 'anonymous' || u.lastSeenAt > cutoff) continue;
          if (
            (await orders.list(u.userId)).some((o) => o.status === 'paid' || o.status === 'ready')
          )
            continue;
          await destroyLibrary(l, false);
          await deletePartition(u.userId);
          processed++;
        }
        break;
      }
      case 'cleanupTokens': {
        for (const kind of ['token', 'rl', 'stripe_evt', 'visit_salt'] as const) {
          for await (const row of lookups.scan(kind)) {
            if (!budget()) {
              more = true;
              break;
            }
            if (row.expiresAt && new Date(row.expiresAt) < now) {
              await lookups.delete(kind, row.key);
              processed++;
            }
          }
        }
        break;
      }
      case 'cleanupVisits': {
        const cutoff = addDays(now, -VISIT_RETENTION_DAYS).toISOString().slice(0, 10);
        const r = await visits.deleteBefore(cutoff, budget);
        processed += r.n;
        more = r.more;
        break;
      }
      default:
        return json(
          { error: { code: 'UNKNOWN_TASK', message: `Unknown task ${String(task)}` } },
          400,
        );
    }
    ctx.log(`cron ${task}: processed=${processed} more=${more} ${Date.now() - started}ms`);
    return json({ task, processed, more });
  },
);

/** Orders are keyed by user; the PDF blob path only carries the orderId, so scan owners lazily. */
async function findOrderOwner(orderId: string) {
  // Share lookups map orderId ↔ user for ready orders; for others fall back to a cheap scan of libraries' users.
  for await (const s of lookups.scan('share')) {
    if (s.value === orderId && s.userId) return orders.get(s.userId, orderId);
  }
  return null;
}
