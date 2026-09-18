import {
  containerReadSas,
  libContainerName,
  origBlobName,
  thumbBlobName,
  writeSasUrl,
} from '../lib/blobs.js';
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
}

/** Registers export photos and hands out per-blob write SAS URLs. Idempotent on photo key. */
route(
  'librariesRegister',
  { methods: ['POST'], route: 'libraries/{id}/photos/register', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const body = await readJson<{ items?: RegisterItem[]; incremental?: boolean }>(req);
    const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
    if (items.length === 0) return json([]);
    const incremental = body.incremental === true;

    const existing = new Map((await photos.listAll(l.libraryId)).map((p) => [p.photoId, p]));
    if (existing.size + items.length > config.maxPhotosPerLibrary) {
      throw conflict(
        'LIBRARY_FULL',
        `A library can hold at most ${config.maxPhotosPerLibrary} photos.`,
      );
    }
    const cont = libContainerName(l.libraryId);
    const rows: PhotoRow[] = [];
    const results = items.map((it) => {
      const photoId = String(it.key)
        .replace(/[^a-z0-9_-]/gi, '')
        .slice(0, 64);
      const takenAt = new Date(it.takenAt).toISOString();
      const prev = existing.get(photoId);
      const tooOld = incremental && l.newestMediaAt && takenAt <= l.newestMediaAt && !prev;
      if ((prev && prev.status === 'ready') || tooOld) {
        return { key: it.key, photoId, skipped: true, origPutUrl: null, thumbPutUrl: null };
      }
      const d = new Date(takenAt);
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
        width: it.width ?? null,
        height: it.height ?? null,
        origBlob: it.isVideo ? '' : origBlobName(photoId),
        thumbBlob: it.isVideo ? '' : thumbBlobName(photoId),
        status: it.isVideo ? 'ready' : 'pending',
        importedAt: nowIso(),
      });
      return {
        key: it.key,
        photoId,
        skipped: false,
        origPutUrl: it.isVideo ? null : writeSasUrl(cont, origBlobName(photoId)),
        thumbPutUrl: it.isVideo ? null : writeSasUrl(cont, thumbBlobName(photoId)),
      };
    });
    await photos.upsertMany(rows);
    return json(results);
  },
);

route(
  'librariesConfirm',
  { methods: ['POST'], route: 'libraries/{id}/photos/confirm', auth: 'required' },
  async ({ req, user }) => {
    const l = await ownedLibrary(user.userId, req.params.id ?? '');
    const body = await readJson<{ photoIds?: string[] }>(req);
    const ids = new Set(
      (Array.isArray(body.photoIds) ? body.photoIds : []).slice(0, 500).map(String),
    );
    if (ids.size === 0) return json({ readyCount: 0 });
    const rows = (await photos.listAll(l.libraryId)).filter(
      (p) => ids.has(p.photoId) && p.status !== 'ready',
    );
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
