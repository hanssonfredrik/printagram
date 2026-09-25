/// <reference lib="webworker" />
import type { Photo } from '@printagram/shared';
import { buildBookPdf, type BookPdfInput, type PdfStage } from './pdfBook';

export interface PdfJob extends BookPdfInput {
  /** Absolute URLs of the bundled fonts and ICC profile. */
  assetUrls: { serif: string; sans: string; fallback: string; emoji: string; icc: string };
}

export type PdfOut =
  | { type: 'progress'; done: number; total: number; stage: PdfStage }
  | { type: 'done'; bytes: Uint8Array; pages: number }
  | { type: 'error'; message: string; failedPhotos?: string[] };

const post = (m: PdfOut, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(m, transfer ?? []);

const RETRIES = 3;

async function fetchBytes(url: string): Promise<Uint8Array> {
  let last: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw last;
}

/** WebP and other formats pdf-lib cannot embed: decode (orientation applied) and encode as JPEG. */
async function toJpeg(bytes: Uint8Array): Promise<Uint8Array> {
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart]), {
    imageOrientation: 'from-image',
  });
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, bmp.width, bmp.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  return new Uint8Array(await jpeg.arrayBuffer());
}

async function run(job: PdfJob) {
  const u = job.assetUrls;
  const [serif, sans, fallback, emoji, icc] = await Promise.all(
    [u.serif, u.sans, u.fallback, u.emoji, u.icc].map(fetchBytes),
  );
  const result = await buildBookPdf(
    job,
    { serif: serif!, sans: sans!, fallback: fallback!, emoji: emoji!, icc: icc! },
    {
      loadPhoto: (p: Photo) => fetchBytes(p.origUrl),
      toJpeg,
      onProgress: (stage, done, total) => post({ type: 'progress', stage, done, total }),
    },
  );
  // Never hand over a paid book with holes in it.
  if (result.failed.length > 0) {
    const n = result.failed.length;
    post({
      type: 'error',
      message: `${n} photo${n === 1 ? '' : 's'} could not be loaded. Check your connection and try again.`,
      failedPhotos: result.failed,
    });
    return;
  }
  post({ type: 'done', bytes: result.bytes, pages: result.pages }, [result.bytes.buffer]);
}

self.onmessage = (ev: MessageEvent<PdfJob>) => {
  run(ev.data).catch((e: unknown) =>
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) }),
  );
};
