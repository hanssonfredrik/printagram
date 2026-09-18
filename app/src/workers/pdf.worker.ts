/// <reference lib="webworker" />
import {
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { BookFormat, Photo } from '@printagram/shared';
import {
  buildPages,
  coverLayout,
  fmtDate,
  MM_TO_PT,
  PAGE_SIZES_MM,
  photoSlots,
  type Rect,
} from '@printagram/shared';

export interface PdfJob {
  photos: Photo[];
  title: string;
  format: BookFormat;
  showMeta: boolean;
  showLikes: boolean;
  coverPhotoId: string | null;
  dateSpan: string;
  fontUrls: { serif: string; sans: string } | null;
}

export type PdfOut =
  | {
      type: 'progress';
      done: number;
      total: number;
      stage: 'fonts' | 'images' | 'pages' | 'saving';
    }
  | { type: 'done'; bytes: Uint8Array; pages: number }
  | { type: 'error'; message: string };

const post = (m: PdfOut, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(m, transfer ?? []);

const INK = rgb(42 / 255, 38 / 255, 34 / 255);
const MUTED = rgb(111 / 255, 103 / 255, 94 / 255);
const PAPER_LINE = rgb(230 / 255, 223 / 255, 211 / 255);
const MAX_JPEG_EDGE = 2400;

interface Fonts {
  serif: PDFFont;
  sans: PDFFont;
  embedded: boolean;
}

async function loadFonts(doc: PDFDocument, urls: PdfJob['fontUrls']): Promise<Fonts> {
  if (urls) {
    try {
      doc.registerFontkit(fontkit);
      const [serifBytes, sansBytes] = await Promise.all([
        fetch(urls.serif).then((r) => r.arrayBuffer()),
        fetch(urls.sans).then((r) => r.arrayBuffer()),
      ]);
      const serif = await doc.embedFont(serifBytes, { subset: true });
      const sans = await doc.embedFont(sansBytes, { subset: true });
      return { serif, sans, embedded: true };
    } catch (e) {
      console.warn('pdf: falling back to standard fonts', e);
    }
  }
  return {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    embedded: false,
  };
}

/** Removes characters the font cannot encode (emoji, unsupported scripts) instead of failing the whole book. */
function safeText(font: PDFFont, text: string, embedded: boolean): string {
  if (!text) return '';
  const cleaned = text.replace(/[\r\n\t]+/g, ' ').trim();
  try {
    font.encodeText(cleaned);
    return cleaned;
  } catch {
    // Drop code points one by one that the font rejects.
    const out: string[] = [];
    for (const ch of cleaned) {
      try {
        font.encodeText(ch);
        out.push(ch);
      } catch {
        /* skip */
      }
    }
    const joined = out
      .join('')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (joined || embedded) return joined;
    return cleaned.replace(/[^\x20-\x7e]/g, '');
  }
}

function fit(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/** Loads an image, converting anything that is not a JPEG/PNG (SVG, WebP, HEIC…) to JPEG via canvas. */
async function loadImage(
  doc: PDFDocument,
  url: string,
): Promise<{ img: PDFImage; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const type = blob.type || '';
    if (type === 'image/jpeg' || type === 'image/png') {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const img = type === 'image/png' ? await doc.embedPng(buf) : await doc.embedJpg(buf);
      return { img, w: img.width, h: img.height };
    }
    // Rasterise through canvas (SVG demo images, WebP, oversized sources).
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_JPEG_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    const img = await doc.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
    return { img, w: img.width, h: img.height };
  } catch (e) {
    console.warn('pdf: image failed', url.slice(0, 80), e);
    return null;
  }
}

function mm(r: Rect, pageHeightMm: number) {
  // PDF origin is bottom-left; layout rects are top-left in mm.
  return {
    x: r.x * MM_TO_PT,
    y: (pageHeightMm - r.y - r.height) * MM_TO_PT,
    width: r.width * MM_TO_PT,
    height: r.height * MM_TO_PT,
  };
}

/** Draws an image with object-fit: cover into a rect using a clipping path. */
function drawCover(
  page: PDFPage,
  image: { img: PDFImage; w: number; h: number } | null,
  rect: Rect,
  pageHeightMm: number,
) {
  const r = mm(rect, pageHeightMm);
  if (!image) {
    page.drawRectangle({ ...r, color: rgb(233 / 255, 224 / 255, 210 / 255) });
    return;
  }
  const scale = Math.max(r.width / image.w, r.height / image.h);
  const dw = image.w * scale;
  const dh = image.h * scale;
  const dx = r.x + (r.width - dw) / 2;
  const dy = r.y + (r.height - dh) / 2;
  page.pushOperators(...clipOps(r.x, r.y, r.width, r.height));
  page.drawImage(image.img, { x: dx, y: dy, width: dw, height: dh });
  page.pushOperators(restoreOp());
}

// Minimal raw operators for clipping (pdf-lib exposes these through its low-level API).
function clipOps(x: number, y: number, w: number, h: number) {
  return [
    pushGraphicsState(),
    moveTo(x, y),
    lineTo(x + w, y),
    lineTo(x + w, y + h),
    lineTo(x, y + h),
    closePath(),
    clip(),
    endPath(),
  ];
}
function restoreOp() {
  return popGraphicsState();
}

async function run(job: PdfJob) {
  const doc = await PDFDocument.create();
  doc.setTitle(job.title);
  doc.setProducer('Printagram');
  doc.setCreator('Printagram');
  const fonts = await loadFonts(doc, job.fontUrls);
  post({ type: 'progress', done: 0, total: 1, stage: 'fonts' });

  const size = PAGE_SIZES_MM[job.format];
  const pageW = size.width * MM_TO_PT;
  const pageH = size.height * MM_TO_PT;
  const pages = buildPages({ photos: job.photos, format: job.format });
  const cover = job.photos.find((p) => p.id === job.coverPhotoId) ?? job.photos[0] ?? null;

  // Embed each distinct image once.
  const cache = new Map<string, { img: PDFImage; w: number; h: number } | null>();
  const urls = [
    ...new Set(
      [cover?.origUrl, ...job.photos.map((p) => p.origUrl)].filter((u): u is string => !!u),
    ),
  ];
  let done = 0;
  const CONCURRENCY = 3;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    await Promise.all(
      urls.slice(i, i + CONCURRENCY).map(async (u) => {
        cache.set(u, await loadImage(doc, u));
        done++;
        post({ type: 'progress', done, total: urls.length, stage: 'images' });
      }),
    );
  }
  const imageFor = (p: Photo | null) => (p ? (cache.get(p.origUrl) ?? null) : null);

  const title = safeText(fonts.serif, job.title, fonts.embedded) || 'Printagram';
  pages.forEach((pg, idx) => {
    const page = doc.addPage([pageW, pageH]);
    if (pg.type === 'cover') {
      const lay = coverLayout(job.format);
      drawCover(page, imageFor(cover), lay.image, size.height);
      const t = fit(fonts.serif, title, 20, lay.title.width * MM_TO_PT);
      const tw = fonts.serif.widthOfTextAtSize(t, 20);
      const band = mm(lay.title, size.height);
      page.drawText(t, {
        x: band.x + (band.width - tw) / 2,
        y: band.y + band.height / 2 - 7,
        size: 20,
        font: fonts.serif,
        color: INK,
      });
    } else if (pg.type === 'title') {
      const t = fit(fonts.serif, title, 28, pageW - 40 * MM_TO_PT);
      const tw = fonts.serif.widthOfTextAtSize(t, 28);
      page.drawText(t, {
        x: (pageW - tw) / 2,
        y: pageH / 2 + 6,
        size: 28,
        font: fonts.serif,
        color: INK,
      });
      const sub = safeText(
        fonts.sans,
        `${job.dateSpan} · ${job.photos.length} photos`,
        fonts.embedded,
      );
      const sw = fonts.sans.widthOfTextAtSize(sub, 11);
      page.drawText(sub, {
        x: (pageW - sw) / 2,
        y: pageH / 2 - 14,
        size: 11,
        font: fonts.sans,
        color: MUTED,
      });
    } else if (pg.type === 'photos') {
      const slots = photoSlots(job.format, pg.photos.length, job.showMeta);
      pg.photos.forEach((p, i) => {
        const slot = slots[i]!;
        drawCover(page, imageFor(p), slot.image, size.height);
        if (job.showMeta && slot.caption) {
          const c = mm(slot.caption, size.height);
          const right = [
            job.showLikes && p.likes !== null ? `♥ ${p.likes}` : '',
            fmtDate(p.takenAt),
          ]
            .filter(Boolean)
            .join('   ');
          const rightText = safeText(fonts.sans, right, fonts.embedded);
          const rw = fonts.sans.widthOfTextAtSize(rightText, 8.5);
          page.drawText(rightText, {
            x: c.x + c.width - rw,
            y: c.y + c.height - 12,
            size: 8.5,
            font: fonts.sans,
            color: MUTED,
          });
          const cap = fit(
            fonts.sans,
            safeText(fonts.sans, p.caption, fonts.embedded),
            8.5,
            c.width - rw - 12,
          );
          if (cap)
            page.drawText(cap, {
              x: c.x,
              y: c.y + c.height - 12,
              size: 8.5,
              font: fonts.sans,
              color: MUTED,
            });
        }
      });
    } else {
      const t = 'Made with Printagram';
      const tw = fonts.sans.widthOfTextAtSize(t, 10);
      page.drawText(t, {
        x: (pageW - tw) / 2,
        y: pageH / 2,
        size: 10,
        font: fonts.sans,
        color: MUTED,
      });
      page.drawLine({
        start: { x: pageW / 2 - 30, y: pageH / 2 - 10 },
        end: { x: pageW / 2 + 30, y: pageH / 2 - 10 },
        thickness: 0.5,
        color: PAPER_LINE,
      });
    }
    post({ type: 'progress', done: idx + 1, total: pages.length, stage: 'pages' });
  });

  post({ type: 'progress', done: 0, total: 1, stage: 'saving' });
  const bytes = await doc.save({ useObjectStreams: true });
  post({ type: 'done', bytes, pages: pages.length }, [bytes.buffer]);
}

self.onmessage = (ev: MessageEvent<PdfJob>) => {
  run(ev.data).catch((e: unknown) =>
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) }),
  );
};
