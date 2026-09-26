import {
  clip,
  closePath,
  concatTransformationMatrix,
  drawObject,
  endPath,
  lineTo,
  moveTo,
  PDFDocument,
  PDFName,
  PDFString,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type Color,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Lang, BookFormat, PageSpec, Photo, PlacedPhoto, Rect } from '@printagram/shared';
import {
  buildPages,
  bookText,
  captionParts,
  coverCrop,
  coverLayout,
  flattenPhotoIds,
  MM_TO_PT,
  PAGE_SIZES_MM,
  placePhoto,
  SAFE_MM,
  slotsFor,
  TEXT_PT,
  type SlotDef,
} from '@printagram/shared';

/**
 * Print-ready book PDF, drawn from the same shared geometry as the on-screen preview.
 *
 * - Every page is trim + bleed on each side (MediaBox = BleedBox); the TrimBox marks the cut.
 *   Full-bleed photos extend into the bleed; everything else stays inside the trim.
 * - Colour: RGB images as delivered (original JPEG bytes, never re-compressed), with an sRGB
 *   OutputIntent so print providers convert predictably.
 * - EXIF orientation is applied as a PDF transform instead of re-encoding.
 * - Text: Lora / Albert Sans, falling back per glyph to Noto Sans and (monochrome) Noto Emoji.
 *
 * This module has no DOM or worker dependencies so it can also run in Node for checks.
 */

export interface BookPdfInput {
  /** The book's photos (any order; pages decide placement). */
  photos: Photo[];
  /** Content pages in print order. */
  pages: PageSpec[];
  title: string;
  format: BookFormat;
  showMeta: boolean;
  showLikes: boolean;
  coverPhotoId: string | null;
  dateSpan: string;
  bleedMm: number;
  /** Language of the printed text (subtitle, caption dates, back cover). Defaults to English. */
  lang?: Lang;
}

export interface BookPdfAssets {
  serif: Uint8Array;
  sans: Uint8Array;
  fallback: Uint8Array;
  emoji: Uint8Array;
  /** sRGB ICC profile for the OutputIntent. */
  icc: Uint8Array;
}

export type PdfStage = 'fonts' | 'images' | 'pages' | 'saving';

export interface BookPdfDeps {
  /** Original bytes of a photo. */
  loadPhoto(photo: Photo): Promise<Uint8Array>;
  /** Re-encodes an image the PDF cannot embed directly (WebP…) as JPEG, orientation applied. */
  toJpeg(bytes: Uint8Array): Promise<Uint8Array>;
  onProgress?(stage: PdfStage, done: number, total: number): void;
}

export interface BookPdfResult {
  bytes: Uint8Array;
  pages: number;
  /** Photos that could not be loaded (drawn as placeholders). */
  failed: string[];
}

const INK = rgb(42 / 255, 38 / 255, 34 / 255);
const MUTED = rgb(111 / 255, 103 / 255, 94 / 255);
const PLACEHOLDER = rgb(233 / 255, 224 / 255, 210 / 255);
const LOAD_CONCURRENCY = 4;

/* ------------------------------------------------------------------ */
/* Images                                                               */
/* ------------------------------------------------------------------ */

type ImageKind = 'jpeg' | 'png' | 'other';

function sniff(b: Uint8Array): ImageKind {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  return 'other';
}

/** EXIF orientation (1–8) of a JPEG, 1 when absent or unreadable. */
export function jpegOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1;
    const marker = b[i + 1]!;
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return 1;
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    const isExif =
      marker === 0xe1 &&
      b[i + 4] === 0x45 &&
      b[i + 5] === 0x78 &&
      b[i + 6] === 0x69 &&
      b[i + 7] === 0x66 &&
      b[i + 8] === 0 &&
      b[i + 9] === 0;
    if (isExif) {
      const t = i + 10;
      const le = b[t] === 0x49;
      const u16 = (o: number) => (le ? b[o]! | (b[o + 1]! << 8) : (b[o]! << 8) | b[o + 1]!);
      const u32 = (o: number) =>
        (le
          ? b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)
          : (b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
      const ifd = t + u32(t + 4);
      if (ifd + 2 > b.length) return 1;
      const n = u16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 12 > b.length) break;
        if (u16(e) === 0x0112) {
          const v = u16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    i += 2 + len;
  }
  return 1;
}

interface Embedded {
  img: PDFImage;
  orientation: number;
  /** Displayed aspect ratio (width / height) after orientation. */
  aspect: number;
}

async function embedPhoto(
  doc: PDFDocument,
  bytes: Uint8Array,
  deps: BookPdfDeps,
): Promise<Embedded> {
  const kind = sniff(bytes);
  let img: PDFImage;
  let orientation = 1;
  if (kind === 'jpeg') {
    orientation = jpegOrientation(bytes);
    img = await doc.embedJpg(bytes);
  } else if (kind === 'png') {
    img = await doc.embedPng(bytes);
  } else {
    img = await doc.embedJpg(await deps.toJpeg(bytes));
  }
  const swap = orientation >= 5;
  const aspect = swap ? img.height / img.width : img.width / img.height;
  return { img, orientation, aspect };
}

/**
 * Transform that maps the image's unit square onto a box (x, y, w, h in PDF space) so that it
 * displays upright for the given EXIF orientation.
 */
function orientationMatrix(o: number, x: number, y: number, w: number, h: number) {
  switch (o) {
    case 2:
      return [-w, 0, 0, h, x + w, y];
    case 3:
      return [-w, 0, 0, -h, x + w, y + h];
    case 4:
      return [w, 0, 0, -h, x, y + h];
    case 5:
      return [0, -h, -w, 0, x + w, y + h];
    case 6:
      return [0, -h, w, 0, x, y + h];
    case 7:
      return [0, h, w, 0, x, y];
    case 8:
      return [0, h, -w, 0, x + w, y];
    default:
      return [w, 0, 0, h, x, y];
  }
}

/* ------------------------------------------------------------------ */
/* Text                                                                 */
/* ------------------------------------------------------------------ */

interface Face {
  font: PDFFont;
  chars: Set<number>;
}
type Stack = Face[];
interface Run {
  text: string;
  font: PDFFont;
}

/** Variation selectors, joiners and skin tones have no glyph in a monochrome font. */
const INVISIBLE = /\u{FE0E}|\u{FE0F}|\u{200D}|[\u{1F3FB}-\u{1F3FF}]/gu;

function runsOf(text: string, stack: Stack): Run[] {
  const out: Run[] = [];
  for (const ch of text.replace(INVISIBLE, '')) {
    const cp = ch.codePointAt(0)!;
    const face = stack.find((f) => f.chars.has(cp));
    if (!face) continue; // no font has it: drop the character, never fail the book
    const last = out[out.length - 1];
    if (last && last.font === face.font) last.text += ch;
    else out.push({ text: ch, font: face.font });
  }
  return out;
}

function widthOf(text: string, stack: Stack, size: number): number {
  return runsOf(text, stack).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
}

/** Truncates to fit maxWidth with an ellipsis. */
function ellipsize(text: string, stack: Stack, size: number, maxWidth: number): string {
  if (widthOf(text, stack, size) <= maxWidth) return text;
  const chars = [...text];
  while (chars.length > 0 && widthOf(chars.join('').trimEnd() + '…', stack, size) > maxWidth)
    chars.pop();
  return chars.join('').trimEnd() + '…';
}

/**
 * Greedy word wrap like CSS `overflow-wrap: anywhere`: breaks at spaces, and inside a word only
 * when the word alone is too wide. Honors explicit newlines. The last allowed line is ellipsized.
 */
function wrap(
  text: string,
  stack: Stack,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  outer: for (const para of paragraphs) {
    let line = '';
    for (const word of para.split(/ +/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthOf(candidate, stack, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        if (lines.length >= maxLines) break outer;
      }
      // Break an over-long word character by character.
      let rest = word;
      while (widthOf(rest, stack, size) > maxWidth) {
        const chars = [...rest];
        let n = chars.length - 1;
        while (n > 1 && widthOf(chars.slice(0, n).join(''), stack, size) > maxWidth) n--;
        lines.push(chars.slice(0, n).join(''));
        if (lines.length >= maxLines) break outer;
        rest = chars.slice(n).join('');
      }
      line = rest;
    }
    lines.push(line);
    if (lines.length >= maxLines) break;
  }
  const total = paragraphs.join(' ');
  if (
    lines.length >= maxLines &&
    lines.join(' ').replace(/\s+/g, '').length < total.replace(/\s+/g, '').length
  ) {
    const last = lines.length - 1;
    lines[last] = ellipsize(lines[last]! + '…', stack, size, maxWidth);
  }
  return lines.slice(0, maxLines);
}

/* ------------------------------------------------------------------ */
/* Book                                                                 */
/* ------------------------------------------------------------------ */

async function addOutputIntent(doc: PDFDocument, icc: Uint8Array) {
  const ctx = doc.context;
  const profile = ctx.register(ctx.flateStream(icc, { N: 3 }));
  const intent = ctx.register(
    ctx.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFX',
      OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
      RegistryName: PDFString.of('http://www.color.org'),
      Info: PDFString.of('sRGB IEC61966-2.1'),
      DestOutputProfile: profile,
    }),
  );
  doc.catalog.set(PDFName.of('OutputIntents'), ctx.obj([intent]));
}

function xmlEscape(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function addXmp(doc: PDFDocument, title: string) {
  const now = new Date().toISOString();
  const xmp =
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">' +
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(title)}</rdf:li></rdf:Alt></dc:title>` +
    '<dc:creator><rdf:Seq><rdf:li>Printagram</rdf:li></rdf:Seq></dc:creator>' +
    `<xmp:CreatorTool>Printagram</xmp:CreatorTool><xmp:CreateDate>${now}</xmp:CreateDate>` +
    `<xmp:ModifyDate>${now}</xmp:ModifyDate><pdf:Producer>Printagram</pdf:Producer>` +
    '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
  const stream = doc.context.stream(new TextEncoder().encode(xmp), {
    Type: 'Metadata',
    Subtype: 'XML',
  });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(stream));
}

/**
 * Fonts are embedded whole: pdf-lib's subsetter drops composite glyphs (accents, many emoji).
 * Fallback fonts are embedded only when the book's text actually needs them.
 */
async function faceOf(doc: PDFDocument, bytes: Uint8Array, chars: Set<number>): Promise<Face> {
  const font = await doc.embedFont(bytes, { subset: false });
  return { font, chars };
}

function charSet(bytes: Uint8Array): Set<number> {
  return new Set(fontkit.create(bytes as unknown as Buffer).characterSet);
}

/** Which fallbacks any of the texts needs beyond its primary font. */
function fallbacksNeeded(
  texts: string[],
  primary: Set<number>,
  fallback: Set<number>,
  emoji: Set<number>,
) {
  let fb = false;
  let em = false;
  for (const t of texts) {
    for (const ch of t.replace(INVISIBLE, '')) {
      const cp = ch.codePointAt(0)!;
      if (primary.has(cp)) continue;
      if (fallback.has(cp)) fb = true;
      else if (emoji.has(cp)) em = true;
    }
  }
  return { fb, em };
}

export async function buildBookPdf(
  input: BookPdfInput,
  assets: BookPdfAssets,
  deps: BookPdfDeps,
): Promise<BookPdfResult> {
  const progress = deps.onProgress ?? (() => undefined);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(input.title, { showInWindowTitleBar: true });
  doc.setAuthor('Printagram');
  doc.setProducer('Printagram');
  doc.setCreator('Printagram');
  doc.setLanguage(input.lang ?? 'en');
  doc.setCreationDate(new Date());
  doc.setModificationDate(new Date());
  await addOutputIntent(doc, assets.icc);
  addXmp(doc, input.title);

  progress('fonts', 0, 1);
  const title = input.title.trim() || 'Printagram';
  const photoCount = flattenPhotoIds(input.pages).length;
  const text = bookText(input.lang);
  const subtitle = `${input.dateSpan} · ${text.photos(photoCount)}`;
  const serifTexts = [title, '…', ...input.pages.map((p) => p.text ?? '')];
  const sansTexts = [subtitle, text.madeWith, '…'];
  if (input.showMeta) {
    for (const p of input.photos) {
      const cap = captionParts(p, input.showLikes, input.lang);
      sansTexts.push(cap.text, cap.meta);
    }
  }
  const sets = {
    serif: charSet(assets.serif),
    sans: charSet(assets.sans),
    fallback: charSet(assets.fallback),
    emoji: charSet(assets.emoji),
  };
  const needSerif = fallbacksNeeded(serifTexts, sets.serif, sets.fallback, sets.emoji);
  const needSans = fallbacksNeeded(sansTexts, sets.sans, sets.fallback, sets.emoji);
  const serif = await faceOf(doc, assets.serif, sets.serif);
  const sans = await faceOf(doc, assets.sans, sets.sans);
  const fallback =
    needSerif.fb || needSans.fb ? await faceOf(doc, assets.fallback, sets.fallback) : null;
  const emoji = needSerif.em || needSans.em ? await faceOf(doc, assets.emoji, sets.emoji) : null;
  const serifStack: Stack = [serif, fallback, emoji].filter((f): f is Face => !!f);
  const sansStack: Stack = [sans, fallback, emoji].filter((f): f is Face => !!f);
  progress('fonts', 1, 1);

  const size = PAGE_SIZES_MM[input.format];
  const bleed = Math.max(0, input.bleedMm);
  const mediaW = (size.width + 2 * bleed) * MM_TO_PT;
  const mediaH = (size.height + 2 * bleed) * MM_TO_PT;

  /** Layout rect (mm, top-left origin, trim coordinates) → PDF points (bottom-left origin, media box). */
  const toPt = (r: Rect) => ({
    x: (bleed + r.x) * MM_TO_PT,
    y: mediaH - (bleed + r.y + r.height) * MM_TO_PT,
    width: r.width * MM_TO_PT,
    height: r.height * MM_TO_PT,
  });
  /** Extends a rect's edges that sit on the trim line out to the bleed edge. */
  const intoBleed = (r: Rect): Rect => {
    const eps = 0.01;
    const left = r.x <= eps ? -bleed : r.x;
    const top = r.y <= eps ? -bleed : r.y;
    const right = r.x + r.width >= size.width - eps ? size.width + bleed : r.x + r.width;
    const bottom = r.y + r.height >= size.height - eps ? size.height + bleed : r.y + r.height;
    return { x: left, y: top, width: right - left, height: bottom - top };
  };

  // Load every photo once (the cover can also appear inside the book).
  const byId = new Map(input.photos.map((p) => [p.id, p]));
  const ordered = flattenPhotoIds(input.pages)
    .map((id) => byId.get(id))
    .filter((p): p is Photo => !!p);
  const cover =
    ordered.find((p) => p.id === input.coverPhotoId) ??
    byId.get(input.coverPhotoId ?? '') ??
    ordered[0] ??
    null;
  const toLoad = [
    ...new Map([...(cover ? [cover] : []), ...ordered].map((p) => [p.id, p])).values(),
  ];
  const images = new Map<string, Embedded>();
  const failed: string[] = [];
  let loaded = 0;
  let next = 0;
  progress('images', 0, toLoad.length);
  await Promise.all(
    Array.from({ length: Math.min(LOAD_CONCURRENCY, toLoad.length) }, async () => {
      while (next < toLoad.length) {
        const p = toLoad[next++]!;
        try {
          images.set(p.id, await embedPhoto(doc, await deps.loadPhoto(p), deps));
        } catch (e) {
          console.warn('pdf: photo failed', p.id, e);
          failed.push(p.id);
        }
        progress('images', ++loaded, toLoad.length);
      }
    }),
  );

  const drawLine = (
    page: PDFPage,
    text: string,
    stack: Stack,
    fontSize: number,
    x: number,
    baseline: number,
    color: Color,
  ) => {
    let cx = x;
    for (const r of runsOf(text, stack)) {
      page.drawText(r.text, { x: cx, y: baseline, size: fontSize, font: r.font, color });
      cx += r.font.widthOfTextAtSize(r.text, fontSize);
    }
  };

  /** Baseline of a line whose line box starts `top` points below the top of the media box. */
  const baselineFor = (stack: Stack, fontSize: number, lineHeight: number, top: number) => {
    const f = stack[0]!.font;
    const ascent = f.heightAtSize(fontSize, { descender: false });
    const full = f.heightAtSize(fontSize);
    return mediaH - (top + (lineHeight - full) / 2 + ascent);
  };

  /** Centered block of lines (like the preview's flex column), vertically centred in `box`. */
  const drawCentered = (
    page: PDFPage,
    box: Rect,
    blocks: { lines: string[]; stack: Stack; size: number; lineHeight: number; color: Color }[],
    gap: number,
  ) => {
    const b = toPt(box);
    const heights = blocks.map((k) => k.lines.length * k.size * k.lineHeight);
    const total = heights.reduce((a, h) => a + h, 0) + gap * (blocks.length - 1);
    let top = mediaH - (b.y + b.height) + (b.height - total) / 2;
    for (const k of blocks) {
      const lh = k.size * k.lineHeight;
      for (const line of k.lines) {
        const w = widthOf(line, k.stack, k.size);
        drawLine(
          page,
          line,
          k.stack,
          k.size,
          b.x + (b.width - w) / 2,
          baselineFor(k.stack, k.size, lh, top),
          k.color,
        );
        top += lh;
      }
      top += gap;
    }
  };

  const drawPhoto = (page: PDFPage, photo: Photo | null, slot: SlotDef, showMeta: boolean) => {
    const emb = photo ? images.get(photo.id) : undefined;
    const aspect = emb?.aspect ?? (photo?.width && photo.height ? photo.width / photo.height : 1);
    const placed: PlacedPhoto = placePhoto(slot, aspect, showMeta);
    let rect = placed.image;
    let crop = placed.crop;
    if (placed.bleed) {
      rect = intoBleed(rect);
      crop = coverCrop(aspect, rect.width / rect.height);
    }
    const r = toPt(rect);
    if (!emb) {
      page.drawRectangle({ ...r, color: PLACEHOLDER });
    } else {
      const fullW = r.width / crop.width;
      const fullH = r.height / crop.height;
      const x = r.x - crop.x * fullW;
      const top = r.y + r.height + crop.y * fullH;
      const name = page.node.newXObject('Image', emb.img.ref);
      const [a, b, c, d, e, f] = orientationMatrix(emb.orientation, x, top - fullH, fullW, fullH);
      page.pushOperators(
        pushGraphicsState(),
        moveTo(r.x, r.y),
        lineTo(r.x + r.width, r.y),
        lineTo(r.x + r.width, r.y + r.height),
        lineTo(r.x, r.y + r.height),
        closePath(),
        clip(),
        endPath(),
        concatTransformationMatrix(a!, b!, c!, d!, e!, f!),
        drawObject(name),
        popGraphicsState(),
      );
    }
    if (photo && showMeta && placed.caption) {
      const cap = captionParts(photo, input.showLikes, input.lang);
      const fs = TEXT_PT.caption;
      const box = toPt(placed.caption);
      const lh = fs * 1.25;
      const top = mediaH - (box.y + box.height) + fs * 0.45;
      const metaW = widthOf(cap.meta, sansStack, fs);
      drawLine(
        page,
        cap.meta,
        sansStack,
        fs,
        box.x + box.width - metaW,
        baselineFor(sansStack, fs, lh, top),
        MUTED,
      );
      const textW = box.width - metaW - fs * 0.6;
      if (cap.text && textW > fs) {
        wrap(cap.text, sansStack, fs, textW, 2).forEach((line, i) =>
          drawLine(
            page,
            line,
            sansStack,
            fs,
            box.x,
            baselineFor(sansStack, fs, lh, top + i * lh),
            MUTED,
          ),
        );
      }
    }
  };

  const pages = buildPages(input.pages);
  pages.forEach((pg, idx) => {
    const page = doc.addPage([mediaW, mediaH]);
    page.setMediaBox(0, 0, mediaW, mediaH);
    page.setBleedBox(0, 0, mediaW, mediaH);
    page.setTrimBox(
      bleed * MM_TO_PT,
      bleed * MM_TO_PT,
      size.width * MM_TO_PT,
      size.height * MM_TO_PT,
    );

    if (pg.type === 'cover') {
      const lay = coverLayout(input.format);
      drawPhoto(page, cover, lay.image, false);
      const fs = TEXT_PT.coverTitle;
      drawCentered(
        page,
        lay.title,
        [
          {
            lines: wrap(title, serifStack, fs, lay.title.width * MM_TO_PT, 2),
            stack: serifStack,
            size: fs,
            lineHeight: 1.2,
            color: INK,
          },
        ],
        0,
      );
    } else if (pg.type === 'title') {
      const box = { x: SAFE_MM, y: 0, width: size.width - 2 * SAFE_MM, height: size.height };
      const w = box.width * MM_TO_PT;
      drawCentered(
        page,
        box,
        [
          {
            lines: wrap(title, serifStack, TEXT_PT.title, w, 3),
            stack: serifStack,
            size: TEXT_PT.title,
            lineHeight: 1.2,
            color: INK,
          },
          {
            lines: wrap(subtitle, sansStack, TEXT_PT.subtitle, w, 2),
            stack: sansStack,
            size: TEXT_PT.subtitle,
            lineHeight: 1.4,
            color: MUTED,
          },
        ],
        TEXT_PT.subtitle * 0.5,
      );
    } else if (pg.type === 'content' && pg.spec.template === 'text') {
      const inset = SAFE_MM + 8;
      const box = {
        x: inset,
        y: SAFE_MM,
        width: size.width - 2 * inset,
        height: size.height - 2 * SAFE_MM,
      };
      const fs = TEXT_PT.pageText;
      const maxLines = Math.floor((box.height * MM_TO_PT) / (fs * 1.45));
      drawCentered(
        page,
        box,
        [
          {
            lines: wrap(pg.spec.text ?? '', serifStack, fs, box.width * MM_TO_PT, maxLines),
            stack: serifStack,
            size: fs,
            lineHeight: 1.45,
            color: INK,
          },
        ],
        0,
      );
    } else if (pg.type === 'content') {
      slotsFor(pg.spec.template, input.format).forEach((slot, i) =>
        drawPhoto(page, byId.get(pg.spec.photoIds[i] ?? '') ?? null, slot, input.showMeta),
      );
    } else {
      drawCentered(
        page,
        { x: 0, y: 0, width: size.width, height: size.height },
        [
          {
            lines: [text.madeWith],
            stack: sansStack,
            size: TEXT_PT.back,
            lineHeight: 1.4,
            color: MUTED,
          },
        ],
        0,
      );
    }
    progress('pages', idx + 1, pages.length);
  });

  progress('saving', 0, 1);
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, pages: pages.length, failed };
}
