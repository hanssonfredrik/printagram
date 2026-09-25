import { containerReadSas, libContainerName, thumbBlobName, writeSasUrl } from '../lib/blobs.js';
import { config } from '../lib/config.js';
import {
  badRequest,
  conflict,
  json,
  noContent,
  notFound,
  readJson,
  route,
  str,
} from '../lib/http.js';
import { nowIso } from '../lib/ids.js';
import { createLibrary, destroyLibrary, finalizeImport } from '../lib/libraryService.js';
import { libraries, photos, type LibraryRow, type PhotoRow } from '../lib/tables.js';
import { libraryView, photoView } from '../lib/views.js';

async function ownedLibrary(userId: string, id: string): Promise<LibraryRow> {
  const l = await libraries.get(userId, id);
  if (!l || l.status === 'deleting') throw notFound('Library');
  return l;
}

route(
  'librariesList',
  { methods: ['GET'], route: 'libraries', auth: 'required' },
  async ({ user }) => {
    const libs = await libraries.list(user.userId);
    return json(libs.filter((l) => l.status !== 'deleting').map(libraryView));
  },
);

/** Creates (or reuses) the export library. One export library per user at MVP. */
route(
  'librariesCreate',
  { methods: ['POST'], route: 'libraries', auth: 'required' },
  async ({ req, user }) => {
    const body = await readJson<{ source?: unknown; label?: unknown }>(req);
    if (body.source !== 'export')
      throw badRequest('INVALID_FIELD', 'Only export libraries can be created directly.');
    const label = str(body.label, 'label', { optional: true, max: 200 }) || 'Instagram export';
    const existing = (await libraries.list(user.userId)).find(
      (l) => l.source === 'export' && l.status !== 'deleting',
    );
    if (existing) {
      await libraries.merge(user.userId, existing.libraryId, {
        status: 'importing',
        sourceLabel: label,
      });
      return json(libraryView({ ...existing, status: 'importing', sourceLabel: label }));
    }
    const created = await createLibrary(user.userId, 'export', label);
    return json(libraryView(created), 201);
  },
);

route(
  'librariesGet',
  { methods: ['GET'], route: 'libraries/{id}', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const read = l.status === 'expired' ? null : containerReadSas(libContainerName(l.libraryId));
    return json({ library: libraryView(l), read });
  },
);

route(
  'librariesPhotos',
  { methods: ['GET'], route: 'libraries/{id}/photos', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const cursor = req.query.get('cursor') ?? undefined;
    const page = await photos.listPage(l.libraryId, cursor);
    return json({
      photos: page.rows.filter((p) => p.status === 'ready').map(photoView),
      cursor: page.continuation,
    });
  },
);

interface RegisterItem {
  key: string;
  postKey: string;
  takenAt: string;
  caption: string;
  isVideo: boolean;
  carouselIdx: number;
  carouselCount: number;
  width: number | null;
  height: number | null;
  mime?: string;
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Runs async work over items with bounded concurrency (Table point reads). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

/**
 * Registers export photos and hands out per-blob write SAS URLs. Idempotent on photo key.
 * Uses point reads (the row key includes takenAt), so cost does not grow with the library size.
 */
route(
  'librariesRegister',
  { methods: ['POST'], route: 'libraries/{id}/photos/register', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const body = await readJson<{ items?: RegisterItem[]; incremental?: boolean }>(req);
    const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
    if (items.length === 0) return json([]);
    const incremental = body.incremental === true;

    const normalized = items.map((it) => ({
      it,
      photoId: String(it.key)
        .replace(/[^a-z0-9_-]/gi, '')
        .slice(0, 64),
      takenAt: new Date(it.takenAt).toISOString(),
    }));
    const existing = await mapLimit(normalized, 16, (n) =>
      photos.get(l.libraryId, n.takenAt, n.photoId),
    );

    const cont = libContainerName(l.libraryId);
    const rows: PhotoRow[] = [];
    const results = normalized.map(({ it, photoId, takenAt }, idx) => {
      const prev = existing[idx];
      const tooOld = incremental && l.newestMediaAt && takenAt <= l.newestMediaAt && !prev;
      if ((prev && prev.status === 'ready') || tooOld) {
        return { key: it.key, photoId, skipped: true, origPutUrl: null, thumbPutUrl: null };
      }
      const mime = MIME_EXT[String(it.mime)] ? String(it.mime) : 'image/jpeg';
      const ext = MIME_EXT[mime]!;
      const d = new Date(takenAt);
      const orig = it.isVideo ? '' : `orig/${photoId}.${ext}`;
      const thumb = it.isVideo ? '' : thumbBlobName(photoId);
      rows.push({
        libraryId: l.libraryId,
        photoId,
        postId: String(it.postKey).slice(0, 64),
        source: 'export',
        takenAt,
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        caption: String(it.caption ?? '').slice(0, 2000),
        likes: null,
        isVideo: !!it.isVideo,
        carouselIdx: Number(it.carouselIdx) || 0,
        carouselCount: Math.max(1, Number(it.carouselCount) || 1),
        width: Number(it.width) > 0 ? Math.round(Number(it.width)) : null,
        height: Number(it.height) > 0 ? Math.round(Number(it.height)) : null,
        mime: it.isVideo ? null : mime,
        origBlob: orig,
        thumbBlob: thumb,
        status: it.isVideo ? 'ready' : 'pending',
        importedAt: nowIso(),
      });
      return {
        key: it.key,
        photoId,
        skipped: false,
        origPutUrl: it.isVideo ? null : writeSasUrl(cont, orig),
        thumbPutUrl: it.isVideo ? null : writeSasUrl(cont, thumb),
      };
    });
    const newStills = rows.filter((r) => !r.isVideo).length;
    if (l.photoCount + newStills > config.maxPhotosPerLibrary) {
      throw conflict(
        'LIBRARY_FULL',
        `A library can hold at most ${config.maxPhotosPerLibrary} photos.`,
      );
    }
    await photos.upsertMany(rows);
    return json(results);
  },
);

/** Marks uploaded photos ready. Accepts {photos:[{photoId,takenAt}]} (point writes). */
route(
  'librariesConfirm',
  { methods: ['POST'], route: 'libraries/{id}/photos/confirm', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const body = await readJson<{ photos?: { photoId?: unknown; takenAt?: unknown }[] }>(req);
    const list = (Array.isArray(body.photos) ? body.photos : [])
      .slice(0, 500)
      .map((p) => {
        const t = new Date(String(p.takenAt));
        return {
          photoId: String(p.photoId ?? ''),
          takenAt: Number.isNaN(t.getTime()) ? '' : t.toISOString(),
        };
      })
      .filter((p) => p.photoId && p.takenAt);
    if (list.length === 0) return json({ readyCount: 0 });
    const rows = (
      await mapLimit(list, 16, (p) => photos.get(l.libraryId, p.takenAt, p.photoId))
    ).filter((p): p is PhotoRow => !!p && p.status !== 'ready');
    await photos.mergeMany(
      l.libraryId,
      rows.map((p) => ({
        takenAt: p.takenAt,
        photoId: p.photoId,
        patch: { status: 'ready' as const },
      })),
    );
    return json({ readyCount: rows.length });
  },
);

route(
  'librariesImportComplete',
  { methods: ['POST'], route: 'libraries/{id}/imports/complete', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const body = await readJson<{ label?: unknown }>(req);
    const label = str(body.label, 'label', { optional: true, max: 200 }) || undefined;
    const finished = await finalizeImport(l, label);
    return json(libraryView(finished));
  },
);

route(
  'librariesDelete',
  { methods: ['DELETE'], route: 'libraries/{id}', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    await destroyLibrary(l, false);
    return noContent();
  },
);
