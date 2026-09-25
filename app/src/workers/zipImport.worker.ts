/// <reference lib="webworker" />
import { BlobReader, BlobWriter, TextWriter, ZipReader, type FileEntry } from '@zip.js/zip.js';
import type { NormalizedMedia, RawPost, UploadErrorKind } from '@printagram/shared';
import {
  findPostsEntries,
  isVideoUri,
  normalizePosts,
  resolveMediaEntry,
} from '@printagram/shared';

export type WorkerIn =
  | { type: 'open'; files: File[]; includeArchived: boolean }
  | { type: 'extract'; keys: string[] }
  | { type: 'close' };

export type SkipReason = 'missing' | 'unsupported' | 'unreadable';

export type WorkerOut =
  | {
      type: 'parsed';
      rows: NormalizedMedia[];
      imageCount: number;
      videoCount: number;
      /** Posts whose media file is in none of the dropped ZIP parts. */
      missing: string[];
      /** Archived posts present in the export but not included (opt-in). */
      archivedAvailable: number;
    }
  | { type: 'error'; kind: UploadErrorKind; message: string }
  | {
      type: 'photo';
      key: string;
      orig: Blob;
      thumb: Blob;
      mime: string;
      width: number | null;
      height: number | null;
    }
  | { type: 'skipped'; key: string; reason: SkipReason }
  | { type: 'batchDone' };

const THUMB_MAX = 400;

interface Indexed {
  entry: FileEntry;
}

let readers: ZipReader<Blob>[] = [];
let entries = new Map<string, Indexed>();
let rowsByKey = new Map<string, NormalizedMedia>();

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

/** Detects the real image type from the first bytes (file names can lie or be missing). */
async function sniff(blob: Blob): Promise<string | null> {
  const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (/heic|heix|hevc|mif1|msf1/.test(brand)) return 'image/heic';
    if (/avif/.test(brand)) return 'image/avif';
  }
  return null;
}

async function makeThumb(
  blob: Blob,
): Promise<{ thumb: Blob; width: number; height: number } | null> {
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
    return null;
  }
}

function partNumber(name: string): number {
  const m = /part[-_ ]?(\d+)/i.exec(name);
  return m ? Number(m[1]) : 0;
}

async function readPosts(names: string[]): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  for (const name of names) {
    const text = await entries.get(name)!.entry.getData(new TextWriter());
    const parsed = JSON.parse(text) as RawPost[] | Record<string, RawPost[]>;
    posts.push(...(Array.isArray(parsed) ? parsed : Object.values(parsed).flat()));
  }
  return posts;
}

async function open(files: File[], includeArchived: boolean) {
  try {
    readers = [];
    entries = new Map();
    // Multi-part exports: every part is a complete ZIP holding part of the tree.
    const ordered = [...files].sort((a, b) => partNumber(a.name) - partNumber(b.name));
    for (const file of ordered) {
      const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
      readers.push(reader);
      for (const e of await reader.getEntries()) {
        if (!e.directory && !entries.has(e.filename))
          entries.set(e.filename, { entry: e as FileEntry });
      }
    }
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
  const archived = names.filter((n) => /(^|\/)archived_posts(_\d+)?\.json$/i.test(n)).sort();
  if (found.json.length === 0 && archived.length === 0) {
    if (found.html.length > 0) post({ type: 'error', kind: 'html', message: 'HTML export' });
    else post({ type: 'error', kind: 'empty', message: 'no posts json' });
    return;
  }

  let rows: NormalizedMedia[];
  let archivedRows: NormalizedMedia[] = [];
  try {
    rows = normalizePosts(await readPosts(found.json));
    if (archived.length) archivedRows = normalizePosts(await readPosts(archived));
  } catch (e) {
    post({ type: 'error', kind: 'corrupt', message: e instanceof Error ? e.message : 'bad json' });
    return;
  }
  if (includeArchived) rows = rows.concat(archivedRows);

  // The same post can appear in several posts_N.json files or ZIP parts: keep the first.
  const seen = new Set<string>();
  rows = rows.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));

  const nameSet = new Set(names);
  const missing: string[] = [];
  const usable = rows.filter((r) => {
    if (r.isVideo || isVideoUri(r.uri)) return true;
    if (resolveMediaEntry(r.uri, nameSet)) return true;
    missing.push(r.key);
    return false;
  });
  const imageCount = usable.filter((r) => !r.isVideo).length;
  if (imageCount === 0) {
    post({ type: 'error', kind: 'empty', message: 'no image posts' });
    return;
  }
  rowsByKey = new Map(usable.map((r) => [r.key, r]));
  const postKeys = new Set(rows.map((r) => r.key));
  post({
    type: 'parsed',
    rows: usable,
    imageCount,
    videoCount: usable.length - imageCount,
    missing,
    archivedAvailable: includeArchived
      ? 0
      : archivedRows.filter((r) => !postKeys.has(r.key)).length,
  });
}

async function extract(keys: string[]) {
  const nameSet = new Set(entries.keys());
  for (const key of keys) {
    const row = rowsByKey.get(key);
    const name = row ? resolveMediaEntry(row.uri, nameSet) : null;
    const hit = name ? entries.get(name) : undefined;
    if (!row || !hit) {
      post({ type: 'skipped', key, reason: 'missing' });
      continue;
    }
    try {
      const raw = await hit.entry.getData(new BlobWriter());
      const mime = await sniff(raw);
      if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/webp') {
        post({ type: 'skipped', key, reason: 'unsupported' });
        continue;
      }
      const orig = raw.slice(0, raw.size, mime);
      const t = await makeThumb(orig);
      if (!t) {
        post({ type: 'skipped', key, reason: 'unreadable' });
        continue;
      }
      post({ type: 'photo', key, orig, thumb: t.thumb, mime, width: t.width, height: t.height });
    } catch {
      post({ type: 'skipped', key, reason: 'unreadable' });
    }
  }
  post({ type: 'batchDone' });
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'open') await open(msg.files, msg.includeArchived);
    else if (msg.type === 'extract') await extract(msg.keys);
    else if (msg.type === 'close') {
      await Promise.all(readers.map((r) => r.close().catch(() => undefined)));
      readers = [];
      entries = new Map();
      rowsByKey = new Map();
    }
  } catch (e) {
    post({ type: 'error', kind: 'generic', message: e instanceof Error ? e.message : String(e) });
  }
};
