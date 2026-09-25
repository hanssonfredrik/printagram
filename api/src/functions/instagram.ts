import { createHmac, timingSafeEqual } from 'node:crypto';
import { decrypt, encrypt, signState, verifyState } from '../lib/auth.js';
import { libContainerName, origBlobName, thumbBlobName, uploadBuffer } from '../lib/blobs.js';
import { config } from '../lib/config.js';
import {
  badRequest,
  conflict,
  forbidden,
  HttpError,
  json,
  noContent,
  notFound,
  readJson,
  redirect,
  route,
} from '../lib/http.js';
import { newId, nowIso } from '../lib/ids.js';
import { createLibrary, destroyLibrary, finalizeImport } from '../lib/libraryService.js';
import * as ig from '../lib/instagramApi.js';
import {
  importJobs,
  libraries,
  lookups,
  photos,
  type ImportJobRow,
  type LibraryRow,
  type PhotoRow,
} from '../lib/tables.js';

const IMPORT_BUDGET_MS = 22_000;
const LEASE_MS = 50_000;
const DOWNLOAD_CONCURRENCY = 4;

function requireConnect() {
  if (!config.connectEnabled)
    throw new HttpError(
      503,
      'CONNECT_DISABLED',
      'Connecting Instagram is not available yet. Use the export instead.',
    );
}

async function igLibrary(userId: string): Promise<LibraryRow | null> {
  return (
    (await libraries.list(userId)).find(
      (l) => l.source === 'instagram' && l.status !== 'deleting',
    ) ?? null
  );
}

/* ---------------- OAuth ---------------- */

route(
  'instagramStart',
  { methods: ['GET'], route: 'instagram/start', auth: 'required' },
  async ({ user }) => {
    requireConnect();
    const state = await signState({ sub: user.userId, n: newId() }, 10);
    return json({ url: ig.authorizeUrl(state) });
  },
);

route(
  'instagramCallback',
  { methods: ['GET'], route: 'instagram/callback', auth: 'optional', allowCrossOrigin: true },
  async ({ req, user }) => {
    const back = (q: string) => redirect(`${config.appBaseUrl}/connect?${q}`);
    if (!config.connectEnabled) return back('error=unknown');
    const error = req.query.get('error');
    const code = req.query.get('code');
    const stateRaw = req.query.get('state') ?? '';
    const state = await verifyState<{ sub: string }>(stateRaw);
    if (!state || !user || state.sub !== user.userId) return back('error=expired');
    if (error || !code) {
      // Instagram returns access_denied both for "Cancel" and for personal accounts that cannot use the API.
      const reason = req.query.get('error_reason') ?? '';
      return back(reason === 'user_denied' ? 'error=denied' : 'error=personal');
    }
    try {
      const short = await ig.exchangeCode(code);
      const long = await ig.longLivedToken(short.access_token);
      const profile = await ig.me(long.access_token);
      const expiresAt = new Date(Date.now() + long.expires_in * 1000).toISOString();

      let lib = await igLibrary(user.userId);
      if (lib && lib.igUserId && lib.igUserId !== profile.user_id) {
        // A different Instagram account than before: start a fresh library.
        await destroyLibrary(lib, false);
        lib = null;
      }
      if (!lib) lib = await createLibrary(user.userId, 'instagram', `@${profile.username}`);
      await libraries.merge(user.userId, lib.libraryId, {
        igUserId: profile.user_id,
        igUsername: profile.username,
        sourceLabel: `@${profile.username}`,
        igTokenEnc: encrypt(long.access_token),
        igTokenExpiresAt: expiresAt,
        igTokenInvalid: false,
        igConnected: true,
        status: lib.photoCount > 0 ? lib.status : 'importing',
      });
      await lookups.upsert('ig_user', profile.user_id, {
        userId: user.userId,
        value: lib.libraryId,
      });
      return back(`connected=1&library=${lib.libraryId}`);
    } catch (e) {
      console.error('instagram callback failed', e);
      return back('error=unknown');
    }
  },
);

route(
  'instagramStatus',
  { methods: ['GET'], route: 'instagram/status', auth: 'required' },
  async ({ user }) => {
    const lib = await igLibrary(user.userId);
    const connected = !!lib?.igConnected && !lib.igTokenInvalid;
    return json({
      connected,
      username: lib?.igUsername ?? null,
      libraryId: lib?.libraryId ?? null,
      tokenExpiresAt: lib?.igTokenExpiresAt ?? null,
    });
  },
);

route(
  'instagramDisconnect',
  { methods: ['POST'], route: 'instagram/disconnect', auth: 'required' },
  async ({ user }) => {
    const lib = await igLibrary(user.userId);
    if (lib)
      await libraries.merge(user.userId, lib.libraryId, {
        igTokenEnc: null,
        igConnected: false,
        igTokenExpiresAt: null,
      });
    return noContent();
  },
);

/* ---------------- Import jobs ---------------- */

route(
  'importsCreate',
  { methods: ['POST'], route: 'libraries/{id}/imports', auth: 'required' },
  async ({ req, user }) => {
    requireConnect();
    const id = req.params.id ?? '';
    const lib = id === 'new' ? await igLibrary(user.userId) : await libraries.get(user.userId, id);
    if (!lib || lib.source !== 'instagram') throw notFound('Instagram library');
    if (!lib.igTokenEnc || lib.igTokenInvalid)
      throw conflict('NOT_CONNECTED', 'Connect your Instagram account first.');
    const running = (await importJobs.list(user.userId)).find(
      (j) => j.libraryId === lib.libraryId && j.status === 'running',
    );
    if (running)
      return json({ jobId: running.jobId, libraryId: lib.libraryId, since: running.since });
    const job: ImportJobRow = {
      jobId: newId(),
      userId: user.userId,
      libraryId: lib.libraryId,
      status: 'running',
      cursor: null,
      since: lib.newestMediaAt,
      processed: 0,
      skipped: 0,
      failed: 0,
      total: null,
      leaseUntil: null,
      lastError: null,
      pendingJson: null,
      createdAt: nowIso(),
    };
    await importJobs.upsert(job);
    await libraries.merge(user.userId, lib.libraryId, { status: 'importing' });
    return json({ jobId: job.jobId, libraryId: lib.libraryId, since: job.since }, 201);
  },
);

interface PendingItem {
  id: string;
  parentId: string;
  url: string;
  timestamp: string;
  caption: string;
  likes: number | null;
  isVideo: boolean;
  carouselIdx: number;
  carouselCount: number;
}

function flatten(media: ig.IgMedia[]): PendingItem[] {
  const out: PendingItem[] = [];
  for (const m of media) {
    const caption = m.caption ?? '';
    const likes = typeof m.like_count === 'number' ? m.like_count : null;
    if (m.media_type === 'CAROUSEL_ALBUM' && m.children?.data?.length) {
      const kids = m.children.data;
      kids.forEach((k, i) =>
        out.push({
          id: k.id,
          parentId: m.id,
          url: k.media_url ?? '',
          timestamp: k.timestamp ?? m.timestamp,
          caption,
          likes,
          isVideo: k.media_type === 'VIDEO',
          carouselIdx: i,
          carouselCount: kids.length,
        }),
      );
    } else {
      out.push({
        id: m.id,
        parentId: m.id,
        url: m.media_url ?? '',
        timestamp: m.timestamp,
        caption,
        likes,
        isVideo: m.media_type === 'VIDEO',
        carouselIdx: 0,
        carouselCount: 1,
      });
    }
  }
  return out;
}

async function makeThumb(orig: Buffer): Promise<{ thumb: Buffer; width: number; height: number }> {
  const { Jimp } = await import('jimp');
  const img = await Jimp.read(orig);
  const width = img.width;
  const height = img.height;
  const scale = Math.min(1, 400 / Math.max(width, height));
  if (scale < 1) img.resize({ w: Math.round(width * scale) });
  return { thumb: await img.getBuffer('image/jpeg', { quality: 80 }), width, height };
}

/** Processes one bounded batch of an Instagram import; the client loops while `more` is true. */
route(
  'importsRun',
  { methods: ['POST'], route: 'imports/{jobId}/run', auth: 'required' },
  async ({ req, user, ctx }) => {
    requireConnect();
    const job = await importJobs.get(user.userId, req.params.jobId ?? '');
    if (!job) throw notFound('Import job');
    const lib = await libraries.get(user.userId, job.libraryId);
    if (!lib?.igTokenEnc) throw conflict('NOT_CONNECTED', 'Connect your Instagram account first.');
    const done = () =>
      json({
        status: job.status,
        processed: job.processed,
        skipped: job.skipped,
        failed: job.failed,
        total: job.total,
        more: job.status === 'running',
        error: job.lastError ?? undefined,
      });
    if (job.status !== 'running') return done();
    if (job.leaseUntil && new Date(job.leaseUntil) > new Date()) return done();

    const started = Date.now();
    await importJobs.merge(user.userId, job.jobId, {
      leaseUntil: new Date(started + LEASE_MS).toISOString(),
    });
    const token = decrypt(lib.igTokenEnc);
    const cont = libContainerName(lib.libraryId);
    const existing = new Set(
      (await photos.listAll(lib.libraryId))
        .filter((p) => p.status === 'ready')
        .map((p) => p.photoId),
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
          const page = await ig.mediaPage(token, cursor, job.since);
          const items = flatten(page.data).filter((it) => !job.since || it.timestamp > job.since);
          if (job.total === null)
            job.total = items.length; // best effort; grows as pages arrive
          else job.total += items.length;
          pending = items;
          cursor = page.next;
          if (!page.next || (job.since && items.length < flatten(page.data).length))
            pageExhausted = true;
          if (pending.length === 0 && pageExhausted) break;
        }
        const batch = pending.splice(0, DOWNLOAD_CONCURRENCY);
        await Promise.all(
          batch.map(async (it) => {
            const photoId = `ig_${it.id}`;
            const d = new Date(it.timestamp);
            const base: PhotoRow = {
              libraryId: lib.libraryId,
              photoId,
              postId: `ig_${it.parentId}`,
              source: 'instagram',
              takenAt: d.toISOString(),
              year: d.getUTCFullYear(),
              month: d.getUTCMonth(),
              caption: it.caption.slice(0, 2000),
              likes: it.likes,
              isVideo: it.isVideo,
              carouselIdx: it.carouselIdx,
              carouselCount: it.carouselCount,
              width: null,
              height: null,
              mime: it.isVideo ? null : 'image/jpeg',
              origBlob: it.isVideo ? '' : origBlobName(photoId),
              thumbBlob: it.isVideo ? '' : thumbBlobName(photoId),
              status: 'ready',
              importedAt: nowIso(),
            };
            if (existing.has(photoId)) {
              job.skipped++;
              return;
            }
            if (it.isVideo || !it.url) {
              await photos.upsertMany([base]);
              job.processed++;
              return;
            }
            try {
              const orig = await ig.fetchBytes(it.url);
              const { thumb, width, height } = await makeThumb(orig);
              await uploadBuffer(cont, base.origBlob, orig, 'image/jpeg');
              await uploadBuffer(cont, base.thumbBlob, thumb, 'image/jpeg');
              await photos.upsertMany([{ ...base, width, height }]);
              job.processed++;
            } catch (e) {
              ctx.warn(`import ${photoId} failed`, e);
              job.failed++;
            }
          }),
        );
        // Persist progress after every batch so a 45 s kill loses at most one batch.
        await importJobs.merge(user.userId, job.jobId, {
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
        await importJobs.merge(user.userId, job.jobId, {
          status: 'done',
          leaseUntil: null,
          pendingJson: null,
          cursor: null,
        });
        await finalizeImport(lib);
      } else {
        await importJobs.merge(user.userId, job.jobId, {
          leaseUntil: null,
          cursor,
          pendingJson: pending.length ? JSON.stringify(pending) : null,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      job.status = 'failed';
      job.lastError = msg;
      await importJobs.merge(user.userId, job.jobId, {
        status: 'failed',
        lastError: msg,
        leaseUntil: null,
      });
      if (/OAuthException|Invalid OAuth|access token/i.test(msg))
        await libraries.merge(user.userId, lib.libraryId, { igTokenInvalid: true });
    }
    return done();
  },
);

/* ---------------- Meta platform callbacks (required for App Review) ---------------- */

function parseSignedRequest(signed: string): { user_id?: string } | null {
  const [sigB64, payloadB64] = signed.split('.');
  if (!sigB64 || !payloadB64) return null;
  const expected = createHmac('sha256', config.instagram.appSecret).update(payloadB64).digest();
  const given = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );
  } catch {
    return null;
  }
}

async function libraryForIgUser(igUserId: string): Promise<LibraryRow | null> {
  const l = await lookups.get('ig_user', igUserId);
  if (!l?.userId || !l.value) return null;
  return libraries.get(l.userId, l.value);
}

route(
  'instagramDeauthorize',
  { methods: ['POST'], route: 'instagram/deauthorize', auth: 'none', allowCrossOrigin: true },
  async ({ req }) => {
    const form = new URLSearchParams(await req.text());
    const data = parseSignedRequest(form.get('signed_request') ?? '');
    if (!data?.user_id) throw badRequest('BAD_SIGNATURE', 'Invalid signed request.');
    const lib = await libraryForIgUser(data.user_id);
    if (lib)
      await libraries.merge(lib.userId, lib.libraryId, { igTokenEnc: null, igConnected: false });
    return json({ ok: true });
  },
);

route(
  'instagramDataDeletion',
  { methods: ['POST'], route: 'instagram/data-deletion', auth: 'none', allowCrossOrigin: true },
  async ({ req }) => {
    const form = new URLSearchParams(await req.text());
    const data = parseSignedRequest(form.get('signed_request') ?? '');
    if (!data?.user_id) throw badRequest('BAD_SIGNATURE', 'Invalid signed request.');
    const code = newId();
    const lib = await libraryForIgUser(data.user_id);
    if (lib) await destroyLibrary(lib, true);
    return json({
      url: `${config.appBaseUrl}/privacy/deletion?code=${code}`,
      confirmation_code: code,
    });
  },
);

export { forbidden, readJson };
