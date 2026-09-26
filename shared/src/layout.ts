import type { BookFormat, Photo } from './types.js';
import { fmtDate } from './dates.js';
import { DEFAULT_LANG, type Lang } from './i18n.js';
import { MAX_PHOTOS_PER_BOOK } from './pricing.js';

/* ------------------------------------------------------------------ */
/* Page geometry (millimetres, origin at the top-left of the trim box)  */
/* ------------------------------------------------------------------ */

/** Finished (trimmed) page sizes. */
export const PAGE_SIZES_MM: Record<BookFormat, { width: number; height: number }> = {
  square: { width: 210, height: 210 },
  portrait: { width: 210, height: 280 },
};

export const PAGE_MARGIN_MM = 12;
export const GUTTER_MM = 5;
/** Space reserved under a photo for its caption/date line when captions are on. */
export const CAPTION_BAND_MM = 8;
/** Default bleed added around each page in the PDF (Gelato: 4 mm, Cloudprinter: 3 mm). */
export const DEFAULT_BLEED_MM = 4;
/** Captions and other text stay at least this far inside the trim (all providers' safe zones). */
export const SAFE_MM = 10;

export const MM_TO_PT = 72 / 25.4;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ */
/* Templates                                                            */
/* ------------------------------------------------------------------ */

export type TemplateId =
  '1-margin' | '1-bleed' | '2-stack' | '2-side' | '3-hero' | '4-grid' | 'text';

export type LayoutDensity = '1' | '2' | '3' | '4' | 'auto';

export interface BookLayout {
  density: LayoutDensity;
  /** Single photos fill the page edge to edge (softer print at Instagram resolution). */
  fullBleed: boolean;
}

export const DEFAULT_LAYOUT: BookLayout = { density: 'auto', fullBleed: false };

/** "Full page" only makes sense where the layout puts single photos on a page. */
export function fullBleedApplies(density: LayoutDensity): boolean {
  return density === '1' || density === 'auto';
}

/** The full-page setting as it takes effect for this layout. */
export function effectiveFullBleed(layout: BookLayout): boolean {
  return layout.fullBleed && fullBleedApplies(layout.density);
}

/** One content page of a book. Cover, title page and back cover are implicit. */
export interface PageSpec {
  template: TemplateId;
  photoIds: string[];
  /** Only for the "text" template. */
  text?: string;
}

export const TEMPLATE_CAPACITY: Record<TemplateId, number> = {
  '1-margin': 1,
  '1-bleed': 1,
  '2-stack': 2,
  '2-side': 2,
  '3-hero': 3,
  '4-grid': 4,
  text: 0,
};

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  '1-margin': 'One photo',
  '1-bleed': 'Full page',
  '2-stack': 'Two, stacked',
  '2-side': 'Two, side by side',
  '3-hero': 'One large, two small',
  '4-grid': 'Grid of four',
  text: 'Text page',
};

const TEMPLATE_LABELS_SV: Record<TemplateId, string> = {
  '1-margin': 'Ett foto',
  '1-bleed': 'Helsida',
  '2-stack': 'Två, över varandra',
  '2-side': 'Två, sida vid sida',
  '3-hero': 'Ett stort, två små',
  '4-grid': 'Rutnät med fyra',
  text: 'Textsida',
};

export function templateLabel(t: TemplateId, lang: Lang = DEFAULT_LANG): string {
  return (lang === 'sv' ? TEMPLATE_LABELS_SV : TEMPLATE_LABELS)[t];
}

export const MAX_TEXT_LENGTH = 400;

/**
 * A photo slot on a page.
 * - "contain": the whole photo is shown, centred in the frame (no cropping).
 * - "cover": the photo fills the frame and is cropped around its centre.
 * - bleed: the frame touches the trim edge and extends into the bleed in the PDF.
 */
export interface SlotDef {
  frame: Rect;
  fit: 'contain' | 'cover';
  bleed: boolean;
}

function inner(format: BookFormat): Rect {
  const s = PAGE_SIZES_MM[format];
  return {
    x: PAGE_MARGIN_MM,
    y: PAGE_MARGIN_MM,
    width: s.width - 2 * PAGE_MARGIN_MM,
    height: s.height - 2 * PAGE_MARGIN_MM,
  };
}

/** Slot definitions for a template on a page format. */
export function slotsFor(template: TemplateId, format: BookFormat): SlotDef[] {
  const page = PAGE_SIZES_MM[format];
  const b = inner(format);
  const halfW = (b.width - GUTTER_MM) / 2;
  const halfH = (b.height - GUTTER_MM) / 2;
  switch (template) {
    case '1-margin': {
      // Narrower than the full inner width so a 1080 px photo still prints at ~165 ppi.
      const inset = format === 'square' ? 10 : 5;
      return [
        {
          frame: { x: b.x + inset, y: b.y + 6, width: b.width - 2 * inset, height: b.height - 12 },
          fit: 'contain',
          bleed: false,
        },
      ];
    }
    case '1-bleed':
      return [
        {
          frame: { x: 0, y: 0, width: page.width, height: page.height },
          fit: 'cover',
          bleed: true,
        },
      ];
    case '2-stack':
      return [
        { frame: { x: b.x, y: b.y, width: b.width, height: halfH }, fit: 'contain', bleed: false },
        {
          frame: { x: b.x, y: b.y + halfH + GUTTER_MM, width: b.width, height: halfH },
          fit: 'contain',
          bleed: false,
        },
      ];
    case '2-side':
      return [
        { frame: { x: b.x, y: b.y, width: halfW, height: b.height }, fit: 'contain', bleed: false },
        {
          frame: { x: b.x + halfW + GUTTER_MM, y: b.y, width: halfW, height: b.height },
          fit: 'contain',
          bleed: false,
        },
      ];
    case '3-hero': {
      const heroH = Math.round(b.height * 0.58);
      const lowH = b.height - heroH - GUTTER_MM;
      return [
        { frame: { x: b.x, y: b.y, width: b.width, height: heroH }, fit: 'cover', bleed: false },
        {
          frame: { x: b.x, y: b.y + heroH + GUTTER_MM, width: halfW, height: lowH },
          fit: 'cover',
          bleed: false,
        },
        {
          frame: {
            x: b.x + halfW + GUTTER_MM,
            y: b.y + heroH + GUTTER_MM,
            width: halfW,
            height: lowH,
          },
          fit: 'cover',
          bleed: false,
        },
      ];
    }
    case '4-grid':
      return [0, 1, 2, 3].map((i) => ({
        frame: {
          x: b.x + (i % 2) * (halfW + GUTTER_MM),
          y: b.y + Math.floor(i / 2) * (halfH + GUTTER_MM),
          width: halfW,
          height: halfH,
        },
        fit: 'cover' as const,
        bleed: false,
      }));
    case 'text':
      return [];
  }
}

/** Where a photo ends up inside its slot. Crop values are fractions of the source image. */
export interface PlacedPhoto {
  image: Rect;
  crop: { x: number; y: number; width: number; height: number };
  caption: Rect | null;
  bleed: boolean;
}

/**
 * Resolves a slot for a photo with the given aspect ratio (width / height). Preview and PDF both
 * use this, which is what makes the preview an exact picture of the printed page.
 */
export function placePhoto(slot: SlotDef, aspect: number, showMeta: boolean): PlacedPhoto {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const full = { x: 0, y: 0, width: 1, height: 1 };
  if (slot.bleed) {
    return {
      image: slot.frame,
      crop: coverCrop(a, slot.frame.width / slot.frame.height),
      caption: null,
      bleed: true,
    };
  }
  const band = showMeta ? CAPTION_BAND_MM : 0;
  const f = slot.frame;
  if (slot.fit === 'cover') {
    const image = { x: f.x, y: f.y, width: f.width, height: f.height - band };
    return {
      image,
      crop: coverCrop(a, image.width / image.height),
      caption: showMeta ? { x: f.x, y: f.y + f.height - band, width: f.width, height: band } : null,
      bleed: false,
    };
  }
  // contain: fit inside the frame (minus the caption band), centred; the caption sits right below.
  const availH = f.height - band;
  let w = f.width;
  let h = w / a;
  if (h > availH) {
    h = availH;
    w = h * a;
  }
  const x = f.x + (f.width - w) / 2;
  const y = f.y + (availH - h) / 2;
  return {
    image: { x, y, width: w, height: h },
    crop: full,
    caption: showMeta ? { x, y: y + h, width: w, height: band } : null,
    bleed: false,
  };
}

/** object-fit: cover crop (fractions of the source) for an image aspect into a frame aspect. */
export function coverCrop(imageAspect: number, frameAspect: number) {
  if (imageAspect > frameAspect) {
    const w = frameAspect / imageAspect;
    return { x: (1 - w) / 2, y: 0, width: w, height: 1 };
  }
  const h = imageAspect / frameAspect;
  return { x: 0, y: (1 - h) / 2, width: 1, height: h };
}

/** Effective print resolution (pixels per inch) of a placed photo. */
export function effectivePpi(pxWidth: number, pxHeight: number, placed: PlacedPhoto): number {
  const visibleW = pxWidth * placed.crop.width;
  const visibleH = pxHeight * placed.crop.height;
  const ppiW = visibleW / (placed.image.width / 25.4);
  const ppiH = visibleH / (placed.image.height / 25.4);
  return Math.min(ppiW, ppiH);
}

export type PpiLevel = 'ok' | 'soft' | 'low';

/** ≥150 ppi prints well; 100–149 may look soft; below 100 looks blurry. */
export function ppiLevel(ppi: number): PpiLevel {
  if (ppi >= 150) return 'ok';
  if (ppi >= 100) return 'soft';
  return 'low';
}

/* ------------------------------------------------------------------ */
/* Cover and fixed pages                                                */
/* ------------------------------------------------------------------ */

/** Cover: the photo fills the top of the page edge to edge; the title sits in a band below. */
export function coverLayout(format: BookFormat): { image: SlotDef; title: Rect } {
  const s = PAGE_SIZES_MM[format];
  const band = format === 'square' ? 40 : 46;
  return {
    image: {
      frame: { x: 0, y: 0, width: s.width, height: s.height - band },
      fit: 'cover',
      bleed: true,
    },
    title: { x: SAFE_MM + 4, y: s.height - band, width: s.width - 2 * (SAFE_MM + 4), height: band },
  };
}

/* ------------------------------------------------------------------ */
/* Automatic layout                                                     */
/* ------------------------------------------------------------------ */

export type AspectClass = 'L' | 'S' | 'P';

export function aspectOf(p: Pick<Photo, 'width' | 'height'>): number {
  return p.width && p.height ? p.width / p.height : 1;
}

export function aspectClass(p: Pick<Photo, 'width' | 'height'>): AspectClass {
  const a = aspectOf(p);
  if (a >= 1.2) return 'L';
  if (a >= 0.9) return 'S';
  return 'P';
}

const EVENT_GAP_MS = 24 * 3600_000;
const LONG_CAPTION = 120;

function pairTemplate(a: Photo, b: Photo, format: BookFormat): TemplateId {
  const ca = aspectClass(a);
  const cb = aspectClass(b);
  if (ca === 'L' && cb === 'L') return '2-stack';
  if (format === 'portrait' && (ca === 'L' || cb === 'L')) return '2-stack';
  return '2-side';
}

function singleTemplate(fullBleed: boolean): TemplateId {
  return fullBleed ? '1-bleed' : '1-margin';
}

/**
 * Deterministic automatic layout.
 * - density "1": one photo per page.
 * - density "2": pairs, chosen by orientation.
 * - density "3" / "4": groups of three (hero) or four (grid) in order; leftovers get the best
 *   smaller template.
 * - density "auto": groups photos into events (> 24 h apart start a new page), keeps long captions
 *   on their own page, and fills pages with grids/hero/pairs where the orientations fit.
 */
export function autoLayout(
  photos: Photo[],
  opts: BookLayout & { format: BookFormat; showMeta?: boolean },
): PageSpec[] {
  const pages: PageSpec[] = [];
  const fullBleed = effectiveFullBleed(opts);
  const single = (p: Photo) =>
    pages.push({ template: singleTemplate(fullBleed), photoIds: [p.id] });

  if (opts.density === '1') {
    photos.forEach(single);
    return pages;
  }
  if (opts.density === '2') {
    for (let i = 0; i < photos.length; i += 2) {
      const a = photos[i]!;
      const b = photos[i + 1];
      if (b) pages.push({ template: pairTemplate(a, b, opts.format), photoIds: [a.id, b.id] });
      else single(a);
    }
    return pages;
  }
  if (opts.density === '3' || opts.density === '4') {
    const n = Number(opts.density);
    for (let i = 0; i < photos.length; i += n) {
      // Photos keep their order; every frame crops to fill, so any orientation fits.
      const group = photos.slice(i, i + n);
      pages.push({
        template: templateForPhotos(group, opts.format, fullBleed),
        photoIds: group.map((p) => p.id),
      });
    }
    return pages;
  }

  // auto: split into events, then fill each event greedily.
  const events: Photo[][] = [];
  for (const p of photos) {
    const cur = events[events.length - 1];
    const prev = cur?.[cur.length - 1];
    const gap = prev
      ? Math.abs(new Date(p.takenAt).getTime() - new Date(prev.takenAt).getTime())
      : Infinity;
    if (!cur || gap > EVENT_GAP_MS) events.push([p]);
    else cur.push(p);
  }
  const longCaption = (p: Photo) => !!opts.showMeta && p.caption.length > LONG_CAPTION;

  for (const ev of events) {
    let i = 0;
    let lastWasMulti = false;
    while (i < ev.length) {
      const rest = ev.slice(i);
      const [a, b, c, d] = rest as [Photo, Photo | undefined, Photo | undefined, Photo | undefined];
      if (longCaption(a) || rest.length === 1) {
        single(a);
        i += 1;
        lastWasMulti = false;
        continue;
      }
      const four = [a, b, c, d];
      if (d && !lastWasMulti && four.every((p) => p && aspectClass(p) === 'S' && !longCaption(p))) {
        pages.push({ template: '4-grid', photoIds: four.map((p) => p!.id) });
        i += 4;
        lastWasMulti = true;
        continue;
      }
      if (
        c &&
        aspectClass(a) === 'L' &&
        [b, c].every((p) => p && aspectClass(p) !== 'L' && !longCaption(p))
      ) {
        pages.push({ template: '3-hero', photoIds: [a.id, b!.id, c.id] });
        i += 3;
        lastWasMulti = true;
        continue;
      }
      if (b && !longCaption(b)) {
        pages.push({ template: pairTemplate(a, b, opts.format), photoIds: [a.id, b.id] });
        i += 2;
        lastWasMulti = true;
        continue;
      }
      single(a);
      i += 1;
      lastWasMulti = false;
    }
  }
  return pages;
}

/** Best template for exactly these photos on one page (used after manual edits). */
export function templateForPhotos(
  photos: Photo[],
  format: BookFormat,
  fullBleed: boolean,
): TemplateId {
  switch (photos.length) {
    case 0:
      return 'text';
    case 1:
      return singleTemplate(fullBleed);
    case 2:
      return pairTemplate(photos[0]!, photos[1]!, format);
    case 3:
      return '3-hero';
    default:
      return '4-grid';
  }
}

/** Templates that can hold exactly n photos (for the per-page template picker). */
export function templatesFor(n: number): TemplateId[] {
  return (Object.keys(TEMPLATE_CAPACITY) as TemplateId[]).filter((t) => TEMPLATE_CAPACITY[t] === n);
}

/**
 * Keeps a manually arranged book in step with the current selection: removes photos that are no
 * longer chosen, drops pages that became empty, fixes templates whose photo count changed, and
 * lays out newly chosen photos at the end.
 */
export function reconcilePages(
  pages: PageSpec[],
  chosen: Photo[],
  opts: BookLayout & { format: BookFormat; showMeta?: boolean },
): PageSpec[] {
  const byId = new Map(chosen.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: PageSpec[] = [];
  for (const pg of pages) {
    if (pg.template === 'text') {
      out.push(pg);
      continue;
    }
    const ids = pg.photoIds.filter((id) => byId.has(id) && !seen.has(id));
    ids.forEach((id) => seen.add(id));
    if (ids.length === 0) continue;
    const template =
      TEMPLATE_CAPACITY[pg.template] === ids.length
        ? pg.template
        : templateForPhotos(
            ids.map((id) => byId.get(id)!),
            opts.format,
            effectiveFullBleed(opts),
          );
    out.push({ template, photoIds: ids });
  }
  const added = chosen.filter((p) => !seen.has(p.id));
  if (added.length) out.push(...autoLayout(added, opts));
  return out;
}

/** Validates a page list (used by the API before pricing). Returns an error message or null. */
export function validatePages(
  pages: unknown,
  allowedIds: Set<string>,
  maxPages = MAX_PHOTOS_PER_BOOK + 200,
): string | null {
  if (!Array.isArray(pages)) return 'pages must be an array';
  if (pages.length > maxPages) return `A book can have at most ${maxPages} pages`;
  const seen = new Set<string>();
  for (const raw of pages) {
    const p = raw as Partial<PageSpec>;
    if (!p || typeof p.template !== 'string' || !(p.template in TEMPLATE_CAPACITY))
      return 'Unknown page template';
    const ids = Array.isArray(p.photoIds) ? p.photoIds : [];
    if (ids.length !== TEMPLATE_CAPACITY[p.template as TemplateId])
      return `Template ${p.template} needs ${TEMPLATE_CAPACITY[p.template as TemplateId]} photos`;
    for (const id of ids) {
      if (typeof id !== 'string' || !allowedIds.has(id))
        return 'A page uses a photo that is not in your library';
      if (seen.has(id)) return 'A photo is used twice';
      seen.add(id);
    }
    if (p.text !== undefined && (typeof p.text !== 'string' || p.text.length > MAX_TEXT_LENGTH))
      return 'Page text is too long';
  }
  return null;
}

export function flattenPhotoIds(pages: PageSpec[]): string[] {
  return pages.flatMap((p) => p.photoIds);
}

/* ------------------------------------------------------------------ */
/* Full page sequence                                                   */
/* ------------------------------------------------------------------ */

export type Page =
  | { type: 'cover'; index: 0 }
  | { type: 'title'; index: 1 }
  | { type: 'content'; index: number; spec: PageSpec }
  | { type: 'back'; index: number };

/** Cover, title page, the content pages, back cover. */
export function buildPages(content: PageSpec[]): Page[] {
  const pages: Page[] = [
    { type: 'cover', index: 0 },
    { type: 'title', index: 1 },
  ];
  for (const spec of content) pages.push({ type: 'content', index: pages.length, spec });
  pages.push({ type: 'back', index: pages.length });
  return pages;
}

/** Total printed pages for a list of content pages (cover + title + content + back). */
export function totalPages(content: PageSpec[]): number {
  return content.length + 3;
}

export function pageLabel(page: Page, total: number, lang: Lang = DEFAULT_LANG): string {
  const sv = lang === 'sv';
  if (page.type === 'cover') return sv ? 'Omslag' : 'Cover';
  if (page.type === 'back') return sv ? 'Baksida' : 'Back cover';
  if (page.type === 'title') return sv ? 'Titelsida' : 'Title page';
  return sv ? `Sida ${page.index - 1} av ${total - 3}` : `Page ${page.index - 1} of ${total - 3}`;
}

/** Fallback for books saved before page layouts existed. */
export function legacyPages(photos: Photo[], format: BookFormat): PageSpec[] {
  return autoLayout(photos, { density: format === 'square' ? '2' : '1', fullBleed: false, format });
}

/* ------------------------------------------------------------------ */
/* Text shared by preview and PDF                                       */
/* ------------------------------------------------------------------ */

/** Font sizes in points; the preview scales them with the page, the PDF uses them as-is. */
export const TEXT_PT = {
  coverTitle: 20,
  title: 28,
  subtitle: 11,
  pageText: 16,
  caption: 7.5,
  back: 10,
} as const;

/** Caption line: caption (up to two lines) on the left, likes and date on the right. */
export function captionParts(
  p: Pick<Photo, 'caption' | 'likes' | 'takenAt'>,
  showLikes: boolean,
  lang: Lang = DEFAULT_LANG,
): { text: string; meta: string } {
  const meta = [showLikes && p.likes !== null ? `♥ ${p.likes}` : '', fmtDate(p.takenAt, lang)]
    .filter(Boolean)
    .join('   ');
  return { text: p.caption.replace(/\s+/g, ' ').trim(), meta };
}
