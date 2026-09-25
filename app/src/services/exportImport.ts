import type { LibrarySummary, NormalizedMedia, UploadErrorKind } from '@printagram/shared';
import { MAX_EXPORT_BYTES } from '@printagram/shared';
import type { Api, PhotoRef, RegisterItem, RegisterResult } from './api';
import type { SkipReason, WorkerIn, WorkerOut } from '@/workers/zipImport.worker';

export class ExportImportError extends Error {
  constructor(
    public kind: UploadErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ExportImportError';
  }
}

export interface ImportProgressEvent {
  phase: 'reading' | 'uploading' | 'finishing';
  done: number;
  total: number;
}

export interface ImportSummary {
  library: LibrarySummary;
  /** Photos in the export (not counting videos). */
  photos: number;
  /** Photos newly added by this import. */
  added: number;
  /** Photos that were already in the library. */
  alreadyThere: number;
  posts: number;
  carousels: number;
  videos: number;
  years: string;
  /** Referenced by the export but not found in any dropped ZIP part. */
  missing: number;
  /** In a format we cannot print (e.g. HEIC). */
  unsupported: number;
  /** Could not be read or uploaded after retries. */
  failed: number;
  /** Archived posts present but not included (can be imported on request). */
  archivedAvailable: number;
  cancelled: boolean;
  fileName: string;
}

const BATCH = 24;
const UPLOAD_CONCURRENCY = 4;
const RETRIES = 3;

function createWorker(): Worker {
  return new Worker(new URL('../workers/zipImport.worker.ts', import.meta.url), { type: 'module' });
}

/** Resolves with the next message of the given types; rejects if the worker crashes. */
function next<T extends WorkerOut['type']>(
  worker: Worker,
  types: T[],
): Promise<Extract<WorkerOut, { type: T }>> {
  return new Promise((resolve, reject) => {
    const onMsg = (ev: MessageEvent<WorkerOut>) => {
      if ((types as string[]).includes(ev.data.type)) {
        cleanup();
        resolve(ev.data as Extract<WorkerOut, { type: T }>);
      }
    };
    const onErr = (ev: ErrorEvent) => {
      cleanup();
      reject(new ExportImportError('generic', ev.message || 'The import worker stopped.'));
    };
    const cleanup = () => {
      worker.removeEventListener('message', onMsg);
      worker.removeEventListener('error', onErr);
    };
    worker.addEventListener('message', onMsg);
    worker.addEventListener('error', onErr);
  });
}

/** Extracts one batch: resolves with every photo/skip message until "batchDone". */
function extractBatch(worker: Worker, keys: string[]): Promise<WorkerOut[]> {
  return new Promise((resolve, reject) => {
    const got: WorkerOut[] = [];
    const onMsg = (ev: MessageEvent<WorkerOut>) => {
      const m = ev.data;
      if (m.type === 'batchDone') {
        cleanup();
        resolve(got);
      } else if (m.type === 'error') {
        cleanup();
        reject(new ExportImportError(m.kind, m.message));
      } else if (m.type === 'photo' || m.type === 'skipped') got.push(m);
    };
    const onErr = (ev: ErrorEvent) => {
      cleanup();
      reject(new ExportImportError('generic', ev.message || 'The import worker stopped.'));
    };
    const cleanup = () => {
      worker.removeEventListener('message', onMsg);
      worker.removeEventListener('error', onErr);
    };
    worker.addEventListener('message', onMsg);
    worker.addEventListener('error', onErr);
    worker.postMessage({ type: 'extract', keys } satisfies WorkerIn);
  });
}

async function withRetry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    if (signal?.aborted) throw new ExportImportError('generic', 'Cancelled');
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

async function mapLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]!);
    }),
  );
}

function registerItem(
  r: NormalizedMedia,
  extra: { mime: string | null; width: number | null; height: number | null; bytes: number },
): RegisterItem {
  return {
    key: r.key,
    postKey: r.postKey,
    takenAt: r.takenAt,
    caption: r.caption,
    isVideo: r.isVideo,
    carouselIdx: r.carouselIdx,
    carouselCount: r.carouselCount,
    ...extra,
  };
}

/**
 * Imports an Instagram export (one or more ZIP parts) entirely from the browser:
 * the worker reads posts_*.json and extracts only the referenced photos; each batch is registered
 * with the API (getting fresh upload links), uploaded straight to storage with retries, and
 * confirmed. Nothing but photos and thumbnails ever leaves the device.
 */
export async function importExportZip(
  files: File[],
  api: Api,
  opts: {
    incremental: boolean;
    includeArchived?: boolean;
    signal?: AbortSignal;
    onProgress: (e: ImportProgressEvent) => void;
  },
): Promise<ImportSummary> {
  if (files.length === 0) throw new ExportImportError('corrupt', 'No file');
  const totalBytes = files.reduce((n, f) => n + f.size, 0);
  if (totalBytes > MAX_EXPORT_BYTES) throw new ExportImportError('large', 'File is too large');
  for (const f of files) {
    const zipLike =
      /\.zip$/i.test(f.name) ||
      f.type === 'application/zip' ||
      f.type === 'application/x-zip-compressed';
    if (!zipLike) throw new ExportImportError('corrupt', `${f.name} is not a ZIP file`);
  }

  const worker = createWorker();
  const fileName =
    files.length === 1 ? files[0]!.name : `${files[0]!.name} + ${files.length - 1} more`;
  const aborted = () => !!opts.signal?.aborted;

  try {
    opts.onProgress({ phase: 'reading', done: 0, total: 1 });
    worker.postMessage({
      type: 'open',
      files,
      includeArchived: !!opts.includeArchived,
    } satisfies WorkerIn);
    const parsed = await next(worker, ['parsed', 'error']);
    if (parsed.type === 'error') throw new ExportImportError(parsed.kind, parsed.message);

    const rows = parsed.rows;
    const library = await api.createExportLibrary(fileName);
    const stills = rows.filter((r) => !r.isVideo);
    const videos = rows.filter((r) => r.isVideo);

    // Videos are only recorded (they are counted, never printed).
    for (let i = 0; i < videos.length; i += 200) {
      const batch = videos
        .slice(i, i + 200)
        .map((r) => registerItem(r, { mime: null, width: null, height: null, bytes: 0 }));
      await withRetry(() => api.registerPhotos(library.id, batch, opts.incremental), opts.signal);
    }

    const skipped: Record<SkipReason, number> = {
      missing: parsed.missing.length,
      unsupported: 0,
      unreadable: 0,
    };
    let added = 0;
    let alreadyThere = 0;
    let failed = 0;
    let done = 0;
    const total = stills.length;
    const rowByKey = new Map(stills.map((r) => [r.key, r]));
    opts.onProgress({ phase: 'uploading', done, total });

    for (let i = 0; i < stills.length && !aborted(); i += BATCH) {
      const keys = stills.slice(i, i + BATCH).map((r) => r.key);
      const extracted = await extractBatch(worker, keys);
      const photos = extracted.filter(
        (m): m is Extract<WorkerOut, { type: 'photo' }> => m.type === 'photo',
      );
      for (const m of extracted) if (m.type === 'skipped') skipped[m.reason]++;
      done += extracted.length - photos.length;

      if (photos.length) {
        const items = photos.map((m) =>
          registerItem(rowByKey.get(m.key)!, {
            mime: m.mime,
            width: m.width,
            height: m.height,
            bytes: m.orig.size,
          }),
        );
        const results = await withRetry(
          () => api.registerPhotos(library.id, items, opts.incremental),
          opts.signal,
        );
        const byKey = new Map<string, RegisterResult>(results.map((r) => [r.key, r]));
        const confirmed: PhotoRef[] = [];
        await mapLimit(photos, UPLOAD_CONCURRENCY, async (m) => {
          const target = byKey.get(m.key);
          if (!target || target.skipped) {
            alreadyThere++;
          } else if (!aborted()) {
            try {
              await withRetry(
                () => api.uploadPhotoBlobs(library.id, target, m.orig, m.thumb),
                opts.signal,
              );
              confirmed.push({ photoId: target.photoId, takenAt: rowByKey.get(m.key)!.takenAt });
              added++;
            } catch {
              failed++;
            }
          }
          done++;
          opts.onProgress({ phase: 'uploading', done, total });
        });
        if (confirmed.length)
          await withRetry(() => api.confirmPhotos(library.id, confirmed), opts.signal);
      }
      opts.onProgress({ phase: 'uploading', done, total });
    }

    // Finish even when cancelled, so everything uploaded so far is usable.
    opts.onProgress({ phase: 'finishing', done: total, total });
    const finished = await api.completeImport(library.id, fileName);

    const years = [...new Set(stills.map((r) => new Date(r.takenAt).getUTCFullYear()))].sort();
    return {
      library: finished,
      photos: stills.length,
      added,
      alreadyThere,
      posts: new Set(rows.map((r) => r.postKey)).size,
      carousels: new Set(rows.filter((r) => r.carouselCount > 1).map((r) => r.postKey)).size,
      videos: videos.length,
      years: years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? ''),
      missing: skipped.missing,
      unsupported: skipped.unsupported,
      failed: failed + skipped.unreadable,
      archivedAvailable: parsed.archivedAvailable,
      cancelled: aborted(),
      fileName,
    };
  } finally {
    worker.postMessage({ type: 'close' } satisfies WorkerIn);
    setTimeout(() => worker.terminate(), 500);
  }
}
