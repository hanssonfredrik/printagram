import type { InvocationContext } from '@azure/functions';
import { decrypt, encrypt, signState, verifyState } from '../lib/auth.js';
import { libContainerName, thumbBlobName, uploadBuffer } from '../lib/blobs.js';
import { config } from '../lib/config.js';
import { exifDateTaken } from '../lib/exif.js';
import * as gp from '../lib/googlePhotosApi.js';
import { conflict, HttpError, json, noContent, redirect, route } from '../lib/http.js';
import { newId, nowIso } from '../lib/ids.js';
import { createLibrary, finalizeImport } from '../lib/libraryService.js';
import {
  importJobs,
  libraries,
  photos,
  type ImportJobRow,
  type LibraryRow,
  type PhotoRow,
} from '../lib/tables.js';
import { makeThumb } from '../lib/thumbs.js';

/**
 * Google Photos as a photo source. Instagram's own "Transfer a copy of your information" can
 * send any account's posts (personal and private included) to Google Photos; from there the
 * user picks them in Google's Picker and we copy the selection. Captions and likes do not
 * survive the trip, and dates are what Google knows (EXIF when present, else the file's time).
 */

const IMPORT_BUDGET_MS = 22_000;
const DOWNLOAD_CONCURRENCY = 4;
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function requireGoogle() {
  if (!config.googlePhotosEnabled)
    throw new HttpError(
      503,
      'GOOGLE_DISABLED',
      'Importing from Google Photos is not available yet. Use the export instead.',
    );
}

export async function gpLibrary(userId: string): Promise<LibraryRow | null> {
  return (
    (await libraries.list(userId)).find(
      (l) => l.source === 'googlephotos' && l.status !== 'deleting',
    ) ?? null
  );
}

/** A usable token: present, not flagged, and not past Google's one-hour lifetime. */
export function gpToken(l: LibraryRow | null): string | null {
  if (!l?.gpTokenEnc || l.gpTokenInvalid) return null;
  if (l.gpTokenExpiresAt && new Date(l.gpTokenExpiresAt) <= new Date()) return null;
  return decrypt(l.gpTokenEnc);
}

/* ---------------- OAuth ---------------- */

route(
  'googleStart',
  { methods: ['GET'], route: 'google/start', auth: 'required' },
  async ({ user }) => {
    requireGoogle();
    const state = await signState({ sub: user.userId, n: newId() }, 10);
    return json({ url: gp.authorizeUrl(state) });
  },
);

route(
  'googleCallback',
  { methods: ['GET'], route: 'google/callback', auth: 'optional', allowCrossOrigin: true },
  async ({ req, user }) => {
    const back = (q: string) => redirect(`${config.appBaseUrl}/google?${q}`);
    if (!config.googlePhotosEnabled) return back('error=unknown');
    const error = req.query.get('error');
    const code = req.query.get('code');
    const state = await verifyState<{ sub: string }>(req.query.get('state') ?? '');
    if (!state || !user || state.sub !== user.userId) return back('error=expired');
    if (error || !code) return back('error=denied');
    try {
      const tok = await gp.exchangeCode(code);
      const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
      let lib = await gpLibrary(user.userId);
      if (!lib) lib = await createLibrary(user.userId, 'googlephotos', 'Google Photos');
      await libraries.merge(user.userId, lib.libraryId, {
        gpTokenEnc: encrypt(tok.access_token),
        gpTokenExpiresAt: expiresAt,
        gpTokenInvalid: false,
        gpSessionId: null,
      });
      return back(`connected=1&library=${lib.libraryId}`);
    } catch (e) {
      console.error('google callback failed', e);
      return back('error=unknown');
    }
  },
);

route(
  'googleStatus',
  { methods: ['GET'], route: 'google/status', auth: 'required' },
  async ({ user }) => {
    const lib = await gpLibrary(user.userId);
    return json({
      connected: !!gpToken(lib),
      libraryId: lib?.libraryId ?? null,
      tokenExpiresAt: lib?.gpTokenExpiresAt ?? null,
      sessionId: lib?.gpSessionId ?? null,
    });
  },
);

route(
  'googleDisconnect',
  { methods: ['POST'], route: 'google/disconnect', auth: 'required' },
  async ({ user }) => {
    const lib = await gpLibrary(user.userId);
    if (lib) {
      const token = gpToken(lib);
      if (token) await gp.revoke(token);
      await libraries.merge(user.userId, lib.libraryId, {
        gpTokenEnc: null,
        gpTokenExpiresAt: null,
        gpSessionId: null,
      });
    }
    return noContent();
  },
);

/* ---------------- Picker session ---------------- */

function notConnected() {
  return conflict('NOT_CONNECTED', 'Sign in with Google first.');
}

/** Opens a Picker session: the user chooses photos in Google Photos at `pickerUri`. */
route(
  'googleSessionCreate',
  { methods: ['POST'], route: 'google/session', auth: 'required' },
  async ({ user }) => {
    requireGoogle();
    const lib = await gpLibrary(user.userId);
    const token = gpToken(lib);
    if (!lib || !token) throw notConnected();
    const s = await gp.createSession(token);
    await libraries.merge(user.userId, lib.libraryId, { gpSessionId: s.id });
    return json({
      sessionId: s.id,
      pickerUri: s.pickerUri,
      pollIntervalMs: gp.pollIntervalMs(s),
      libraryId: lib.libraryId,
    });
  },
);

route(
  'googleSessionGet',
  { methods: ['GET'], route: 'google/session', auth: 'required' },
  async ({ user }) => {
    requireGoogle();
    const lib = await gpLibrary(user.userId);
    const token = gpToken(lib);
    if (!lib || !token) throw notConnected();
    if (!lib.gpSessionId) throw conflict('NO_SESSION', 'Open the picker first.');
    const s = await gp.getSession(token, lib.gpSessionId);
    return json({
      sessionId: s.id,
      mediaItemsSet: s.mediaItemsSet === true,
      pollIntervalMs: gp.pollIntervalMs(s),
    });
  },
);

/* ---------------- Import (one bounded batch; called from imports/{job}/run) ---------------- */

interface PendingItem {
  id: string;
  url: string;
  createTime: string;
  mime: string;
  isVideo: boolean;
}

function flatten(items: gp.PickedMediaItem[]): PendingItem[] {
  return items.map((m) => ({
    id: m.id,
    url: m.mediaFile?.baseUrl ?? '',
    createTime: m.createTime,
    mime: m.mediaFile?.mimeType ?? '',
    isVideo: m.type === 'VIDEO',
  }));
}

/** Google's media ids are long and not filesystem-safe; hash-free but bounded, like `ig_<id>`. */
function photoIdFor(mediaId: string): string {
  return `gp_${mediaId.replace(/[^a-z0-9_-]/gi, '')}`.slice(0, 64);
}

export function requireGoogleImport(lib: LibraryRow): string {
  requireGoogle();
  const token = gpToken(lib);
  if (!token) throw notConnected();
  if (!lib.gpSessionId) throw conflict('NO_SESSION', 'Pick your photos in Google Photos first.');
  return token;
}

/**
 * Works through the Picker selection for ≤ 22 s: list a page, download each photo (bearer
 * token, `=d`), thumbnail it, upsert the row, persist progress. Mutates `job` and saves it.
 */
export async function runGoogleImport(
  job: ImportJobRow,
  lib: LibraryRow,
  ctx: InvocationContext,
): Promise<void> {
  const token = gpToken(lib);
  if (!token || !lib.gpSessionId) {
    job.status = 'failed';
    job.lastError = 'GOOGLE_TOKEN_EXPIRED';
    await importJobs.merge(job.userId, job.jobId, {
      status: 'failed',
      lastError: job.lastError,
      leaseUntil: null,
    });
    return;
  }
  const sessionId = lib.gpSessionId;
  const started = Date.now();
  const cont = libContainerName(lib.libraryId);
  const existing = new Set(
    (await photos.listAll(lib.libraryId)).filter((p) => p.status === 'ready').map((p) => p.photoId),
  );
  let pending: PendingItem[] = job.pendingJson
    ? (JSON.parse(job.pendingJson) as PendingItem[])
    : [];
  let cursor = job.cursor;
  let pageExhausted = false;

  try {
    while (Date.now() - started < IMPORT_BUDGET_MS) {
      if (pending.length === 0) {
        if (pageExhausted) break;
        const page = await gp.mediaPage(token, sessionId, cursor);
        const items = flatten(page.items);
        job.total = (job.total ?? 0) + items.length;
        pending = items;
        cursor = page.next;
        if (!page.next) pageExhausted = true;
        if (pending.length === 0 && pageExhausted) break;
      }
      const batch = pending.splice(0, DOWNLOAD_CONCURRENCY);
      await Promise.all(
        batch.map(async (it) => {
          const photoId = photoIdFor(it.id);
          if (existing.has(photoId)) {
            job.skipped++;
            return;
          }
          const ext = MIME_EXT[it.mime];
          if (!it.isVideo && !ext) {
            // HEIC and friends cannot be printed by the PDF builder; the export path skips them too.
            job.skipped++;
            return;
          }
          const created = new Date(it.createTime);
          const base: PhotoRow = {
            libraryId: lib.libraryId,
            photoId,
            postId: photoId,
            source: 'googlephotos',
            takenAt: created.toISOString(),
            year: created.getUTCFullYear(),
            month: created.getUTCMonth(),
            caption: '',
            likes: null,
            isVideo: it.isVideo,
            carouselIdx: 0,
            carouselCount: 1,
            width: null,
            height: null,
            mime: it.isVideo ? null : it.mime,
            origBlob: it.isVideo ? '' : `orig/${photoId}.${ext}`,
            thumbBlob: it.isVideo ? '' : thumbBlobName(photoId),
            status: 'ready',
            importedAt: nowIso(),
          };
          if (it.isVideo || !it.url) {
            await photos.upsertMany([base]);
            job.processed++;
            return;
          }
          try {
            const orig = await gp.fetchBytes(token, it.url);
            // Prefer the date the camera wrote; Google's createTime is the upload time otherwise.
            const taken = it.mime === 'image/jpeg' ? exifDateTaken(orig) : null;
            const takenAt = taken ?? created;
            const { thumb, width, height } = await makeThumb(orig);
            await uploadBuffer(cont, base.origBlob, orig, it.mime);
            await uploadBuffer(cont, base.thumbBlob, thumb, 'image/jpeg');
            await photos.upsertMany([
              {
                ...base,
                takenAt: takenAt.toISOString(),
                year: takenAt.getUTCFullYear(),
                month: takenAt.getUTCMonth(),
                width,
                height,
              },
            ]);
            job.processed++;
          } catch (e) {
            if (e instanceof gp.GoogleApiError && e.status === 401) throw e;
            ctx.warn(`google import ${photoId} failed`, e);
            job.failed++;
          }
        }),
      );
      await importJobs.merge(job.userId, job.jobId, {
        processed: job.processed,
        skipped: job.skipped,
        failed: job.failed,
        total: job.total,
        cursor,
        pendingJson: pending.length ? JSON.stringify(pending) : null,
      });
    }
    const finished = pending.length === 0 && pageExhausted;
    if (finished) {
      job.status = 'done';
      await importJobs.merge(job.userId, job.jobId, {
        status: 'done',
        leaseUntil: null,
        pendingJson: null,
        cursor: null,
      });
      await gp.deleteSession(token, sessionId);
      await libraries.merge(lib.userId, lib.libraryId, { gpSessionId: null });
      await finalizeImport(lib);
    } else {
      await importJobs.merge(job.userId, job.jobId, {
        leaseUntil: null,
        cursor,
        pendingJson: pending.length ? JSON.stringify(pending) : null,
      });
    }
  } catch (e) {
    const expired = e instanceof gp.GoogleApiError && e.status === 401;
    const msg = expired ? 'GOOGLE_TOKEN_EXPIRED' : e instanceof Error ? e.message : String(e);
    job.status = 'failed';
    job.lastError = msg;
    await importJobs.merge(job.userId, job.jobId, {
      status: 'failed',
      lastError: msg,
      leaseUntil: null,
    });
    if (expired) await libraries.merge(lib.userId, lib.libraryId, { gpTokenInvalid: true });
  }
}
