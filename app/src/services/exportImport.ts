import type { LibrarySummary, NormalizedMedia, UploadErrorKind } from '@printagram/shared';
import { MAX_EXPORT_BYTES } from '@printagram/shared';
import type { Api, RegisterItem, RegisterResult } from './api';
import type { WorkerIn, WorkerOut } from '@/workers/zipImport.worker';

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
  photos: number;
  posts: number;
  carousels: number;
  videos: number;
  years: string;
  skipped: number;
  fileName: string;
}

const REGISTER_BATCH = 200;
const EXTRACT_BATCH = 24;
const UPLOAD_CONCURRENCY = 4;
const CONFIRM_EVERY = 100;

function createWorker(): Worker {
  return new Worker(new URL('../workers/zipImport.worker.ts', import.meta.url), { type: 'module' });
}

function once<T extends WorkerOut['type']>(
  worker: Worker,
  types: T[],
): Promise<Extract<WorkerOut, { type: T }>> {
  return new Promise((resolve) => {
    const handler = (ev: MessageEvent<WorkerOut>) => {
      if ((types as string[]).includes(ev.data.type)) {
        worker.removeEventListener('message', handler);
        resolve(ev.data as Extract<WorkerOut, { type: T }>);
      }
    };
    worker.addEventListener('message', handler);
  });
}

/**
 * Parses an Instagram export ZIP in a Web Worker, registers the posts with the API,
 * uploads originals + thumbnails, and completes the import. Works identically against
 * the mock API (object URLs) and the real API (SAS PUTs to Blob Storage).
 */
export async function importExportZip(
  file: File,
  api: Api,
  opts: {
    incremental: boolean;
    signal?: AbortSignal;
    onProgress: (e: ImportProgressEvent) => void;
  },
): Promise<ImportSummary> {
  if (file.size > MAX_EXPORT_BYTES) throw new ExportImportError('large', 'File is too large');
  if (
    !/\.zip$/i.test(file.name) &&
    file.type !== 'application/zip' &&
    file.type !== 'application/x-zip-compressed'
  ) {
    throw new ExportImportError('corrupt', 'Not a zip file');
  }

  const worker = createWorker();
  const send = (m: WorkerIn) => worker.postMessage(m);
  const throwIfAborted = () => {
    if (opts.signal?.aborted) throw new ExportImportError('generic', 'Cancelled');
  };

  try {
    opts.onProgress({ phase: 'reading', done: 0, total: 1 });
    send({ type: 'open', file });
    const parsed = await once(worker, ['parsed', 'error']);
    if (parsed.type === 'error') throw new ExportImportError(parsed.kind, parsed.message);
    throwIfAborted();

    const rows = parsed.rows;
    const library = await api.createExportLibrary(file.name);

    // Register metadata in batches; the API decides what is new.
    const results = new Map<string, RegisterResult>();
    for (let i = 0; i < rows.length; i += REGISTER_BATCH) {
      const batch = rows.slice(i, i + REGISTER_BATCH).map(toRegisterItem);
      const res = await api.registerPhotos(library.id, batch, opts.incremental);
      for (const r of res) results.set(r.key, r);
      throwIfAborted();
    }

    const toUpload = rows.filter(
      (r) => !r.isVideo && results.get(r.key) && !results.get(r.key)!.skipped,
    );
    const videoKeys = rows
      .filter((r) => r.isVideo && results.get(r.key) && !results.get(r.key)!.skipped)
      .map((r) => results.get(r.key)!.photoId);
    const skipped = rows.filter((r) => results.get(r.key)?.skipped).length;
    const total = toUpload.length;
    let done = 0;
    let confirmed: string[] = [];
    opts.onProgress({ phase: 'uploading', done, total });

    const flushConfirm = async (force = false) => {
      if (confirmed.length >= CONFIRM_EVERY || (force && confirmed.length > 0)) {
        const ids = confirmed;
        confirmed = [];
        await api.confirmPhotos(library.id, ids);
      }
    };

    for (let i = 0; i < toUpload.length; i += EXTRACT_BATCH) {
      const keys = toUpload.slice(i, i + EXTRACT_BATCH).map((r) => r.key);
      const inflight: Promise<void>[] = [];
      const waitSlot = async () => {
        if (inflight.length >= UPLOAD_CONCURRENCY) await Promise.race(inflight);
      };
      const batchDone = new Promise<void>((resolve) => {
        const handler = async (ev: MessageEvent<WorkerOut>) => {
          const m = ev.data;
          if (m.type === 'batchDone') {
            worker.removeEventListener('message', handler);
            resolve();
            return;
          }
          if (m.type === 'photoMissing') {
            done++;
            opts.onProgress({ phase: 'uploading', done, total });
            return;
          }
          if (m.type !== 'photo') return;
          const target = results.get(m.key)!;
          await waitSlot();
          const p = (async () => {
            await api.uploadPhotoBlobs(library.id, { ...target }, m.orig, m.thumb);
            confirmed.push(target.photoId);
            done++;
            opts.onProgress({ phase: 'uploading', done, total });
          })().finally(() => {
            const idx = inflight.indexOf(p);
            if (idx >= 0) inflight.splice(idx, 1);
          });
          inflight.push(p);
        };
        worker.addEventListener('message', handler);
      });
      send({ type: 'extract', keys });
      await batchDone;
      await Promise.all(inflight);
      await flushConfirm();
      throwIfAborted();
    }
    if (videoKeys.length) confirmed.push(...videoKeys);
    await flushConfirm(true);

    opts.onProgress({ phase: 'finishing', done: total, total });
    const finished = await api.completeImport(library.id, file.name);

    const stills = rows.filter((r) => !r.isVideo);
    const years = [...new Set(stills.map((r) => new Date(r.takenAt).getUTCFullYear()))].sort();
    return {
      library: finished,
      photos: stills.length,
      posts: new Set(rows.map((r) => r.postKey)).size,
      carousels: new Set(rows.filter((r) => r.carouselCount > 1).map((r) => r.postKey)).size,
      videos: rows.length - stills.length,
      years: years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? ''),
      skipped,
      fileName: file.name,
    };
  } finally {
    send({ type: 'close' });
    setTimeout(() => worker.terminate(), 500);
  }
}

function toRegisterItem(r: NormalizedMedia): RegisterItem {
  return {
    key: r.key,
    postKey: r.postKey,
    takenAt: r.takenAt,
    caption: r.caption,
    isVideo: r.isVideo,
    carouselIdx: r.carouselIdx,
    carouselCount: r.carouselCount,
    width: null,
    height: null,
    bytes: 0,
  };
}
