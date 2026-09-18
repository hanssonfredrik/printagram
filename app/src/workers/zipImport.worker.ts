/// <reference lib="webworker" />
import { BlobReader, BlobWriter, TextWriter, ZipReader, type FileEntry } from '@zip.js/zip.js';
import type { NormalizedMedia, RawPost, UploadErrorKind } from '@printagram/shared';
import {
  findPostsEntries,
  isImageUri,
  normalizePosts,
  resolveMediaEntry,
} from '@printagram/shared';

export type WorkerIn =
  { type: 'open'; file: File } | { type: 'extract'; keys: string[] } | { type: 'close' };

export type WorkerOut =
  | {
      type: 'parsed';
      rows: NormalizedMedia[];
      entryCount: number;
      imageCount: number;
      videoCount: number;
    }
  | { type: 'error'; kind: UploadErrorKind; message: string }
  | {
      type: 'photo';
      key: string;
      orig: Blob;
      thumb: Blob;
      width: number | null;
      height: number | null;
    }
  | { type: 'photoMissing'; key: string }
  | { type: 'batchDone' };

const THUMB_MAX = 400;

let reader: ZipReader<Blob> | null = null;
let entries = new Map<string, FileEntry>();
let rowsByKey = new Map<string, NormalizedMedia>();

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

async function makeThumb(
  blob: Blob,
): Promise<{ thumb: Blob; width: number | null; height: number | null }> {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const scale = Math.min(1, THUMB_MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bmp, 0, 0, w, h);
    const width = bmp.width;
    const height = bmp.height;
    bmp.close();
    const thumb = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    return { thumb, width, height };
  } catch {
    // Older browsers without OffscreenCanvas in workers: reuse the original as the thumbnail.
    return { thumb: blob, width: null, height: null };
  }
}

async function open(file: File) {
  try {
    reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
    const list = await reader.getEntries();
    entries = new Map(list.filter((e): e is FileEntry => !e.directory).map((e) => [e.filename, e]));
  } catch (e) {
    post({
      type: 'error',
      kind: 'corrupt',
      message: e instanceof Error ? e.message : 'unreadable zip',
    });
    return;
  }
  const names = [...entries.keys()];
  const found = findPostsEntries(names);
  if (found.json.length === 0) {
    if (found.html.length > 0) post({ type: 'error', kind: 'html', message: 'HTML export' });
    else post({ type: 'error', kind: 'empty', message: 'no posts json' });
    return;
  }
  const rows: NormalizedMedia[] = [];
  for (const name of found.json) {
    const entry = entries.get(name)!;
    try {
      const text = await entry.getData(new TextWriter());
      const parsed = JSON.parse(text) as RawPost[] | { [k: string]: RawPost[] };
      const posts = Array.isArray(parsed) ? parsed : Object.values(parsed).flat();
      rows.push(...normalizePosts(posts));
    } catch (e) {
      post({
        type: 'error',
        kind: 'corrupt',
        message: e instanceof Error ? e.message : 'bad json',
      });
      return;
    }
  }
  const nameSet = new Set(names);
  const usable = rows.filter(
    (r) => r.isVideo || (isImageUri(r.uri) && resolveMediaEntry(r.uri, nameSet)),
  );
  const imageCount = usable.filter((r) => !r.isVideo).length;
  if (imageCount === 0) {
    post({ type: 'error', kind: 'empty', message: 'no image posts' });
    return;
  }
  rowsByKey = new Map(usable.map((r) => [r.key, r]));
  post({
    type: 'parsed',
    rows: usable,
    entryCount: names.length,
    imageCount,
    videoCount: usable.length - imageCount,
  });
}

async function extract(keys: string[]) {
  const nameSet = new Set(entries.keys());
  for (const key of keys) {
    const row = rowsByKey.get(key);
    const name = row ? resolveMediaEntry(row.uri, nameSet) : null;
    const entry = name ? entries.get(name) : undefined;
    if (!row || !entry) {
      post({ type: 'photoMissing', key });
      continue;
    }
    try {
      const ext = row.uri.toLowerCase().split('.').pop();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const orig = await entry.getData(new BlobWriter(mime));
      const { thumb, width, height } = await makeThumb(orig);
      post({ type: 'photo', key, orig, thumb, width, height });
    } catch {
      post({ type: 'photoMissing', key });
    }
  }
  post({ type: 'batchDone' });
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  if (msg.type === 'open') await open(msg.file);
  else if (msg.type === 'extract') await extract(msg.keys);
  else if (msg.type === 'close') {
    await reader?.close().catch(() => undefined);
    reader = null;
    entries = new Map();
    rowsByKey = new Map();
  }
};
