/**
 * Builds a sample book with the real PDF code (app/src/workers/pdfBook.ts) and checks it is
 * print-ready: page count, TrimBox/BleedBox with the configured bleed, sRGB OutputIntent, XMP,
 * an image on every photo page, EXIF-rotated photos and emoji captions.
 *
 *   npx tsx scripts/pdf-check.ts [out.pdf]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Jimp } from 'jimp';
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import type { PageSpec, Photo } from '@printagram/shared';
import { DEFAULT_BLEED_MM, MM_TO_PT, PAGE_SIZES_MM, totalPages } from '@printagram/shared';
import { buildBookPdf, jpegOrientation } from '../app/src/workers/pdfBook';

const pub = (p: string) => new Uint8Array(readFileSync(path.resolve('app/public', p)));

async function image(
  w: number,
  h: number,
  rgb: [number, number, number],
  kind: 'jpeg' | 'png' = 'jpeg',
): Promise<Uint8Array> {
  const color = ((rgb[0] << 24) | (rgb[1] << 16) | (rgb[2] << 8) | 0xff) >>> 0;
  const img = new Jimp({ width: w, height: h, color });
  // A dark block in the stored top-left corner shows where "up" ended up.
  for (let y = 0; y < h / 5; y++)
    for (let x = 0; x < w / 5; x++) img.setPixelColor(0x222222ff, x, y);
  const buf =
    kind === 'png'
      ? await img.getBuffer('image/png')
      : await img.getBuffer('image/jpeg', { quality: 85 });
  return new Uint8Array(buf);
}

/** Inserts an EXIF APP1 segment with the given orientation right after the JPEG SOI marker. */
function withOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = [
    0x4d,
    0x4d,
    0,
    0x2a,
    0,
    0,
    0,
    8,
    0,
    1,
    0x01,
    0x12,
    0,
    3,
    0,
    0,
    0,
    1,
    0,
    orientation,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = payload.length + 2;
  const seg = [0xff, 0xe1, len >> 8, len & 0xff, ...payload];
  return new Uint8Array([...jpeg.subarray(0, 2), ...seg, ...jpeg.subarray(2)]);
}

function photo(
  id: string,
  w: number,
  h: number,
  caption: string,
  likes: number | null,
  day: number,
): Photo {
  return {
    id,
    postId: id,
    source: 'instagram',
    takenAt: new Date(Date.UTC(2024, 4, day, 12)).toISOString(),
    year: 2024,
    month: 4,
    caption,
    likes,
    isVideo: false,
    carouselIdx: 0,
    carouselCount: 1,
    width: w,
    height: h,
    mime: 'image/jpeg',
    origUrl: `mem:${id}`,
    thumbUrl: '',
    status: 'ready',
  };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function main() {
  const out = path.resolve(process.argv[2] ?? 'pdf-check.pdf');
  const rotated = withOrientation(await image(600, 400, [200, 120, 90]), 6);
  assert(jpegOrientation(rotated) === 6, 'EXIF orientation parser reads 6');

  const bytes = new Map<string, Uint8Array>([
    ['land', await image(1080, 720, [120, 160, 200])],
    ['port', rotated], // stored landscape, displayed portrait 400×600
    ['sq', await image(1080, 1080, [150, 190, 140])],
    ['png', await image(1080, 1350, [230, 200, 120], 'png')],
    ['a', await image(1080, 1080, [210, 150, 170])],
    ['b', await image(1080, 1350, [140, 140, 210])],
    ['c', await image(1080, 720, [100, 190, 180])],
    ['d', await image(1080, 1080, [220, 180, 110])],
  ]);
  const photos = [
    photo(
      'land',
      1080,
      720,
      'Sunset at the lake 🌅 with friends ❤️ - a very long caption that has to wrap onto a second line and then be cut off with an ellipsis because it is far too long to fit',
      128,
      1,
    ),
    photo('port', 400, 600, 'Rotated by EXIF (dark corner must be top-right)', 12, 2),
    photo('sq', 1080, 1080, 'Café crème ☕ in Göteborg', null, 3),
    photo('png', 1080, 1350, 'PNG source', 3, 4),
    photo('a', 1080, 1080, 'Grid one 🐶', 5, 5),
    photo('b', 1080, 1350, 'Grid two', 6, 6),
    photo('c', 1080, 720, 'Grid three', 7, 7),
    photo('d', 1080, 1080, 'Grid four', 8, 8),
  ];
  const pages: PageSpec[] = [
    { template: '1-margin', photoIds: ['land'] },
    { template: '1-margin', photoIds: ['port'] },
    { template: '1-bleed', photoIds: ['sq'] },
    { template: '2-stack', photoIds: ['land', 'c'] },
    { template: '2-side', photoIds: ['png', 'b'] },
    { template: 'text', photoIds: [], text: 'Summer 2024 ☀️\nThe year we moved to the coast. 🌊' },
    { template: '3-hero', photoIds: ['sq', 'a', 'b'] },
    { template: '4-grid', photoIds: ['a', 'b', 'c', 'd'] },
  ];

  const format = (process.env.FORMAT as 'square' | 'portrait') ?? 'square';
  const result = await buildBookPdf(
    {
      photos,
      pages,
      title: 'Our summer ✨ 2024',
      format,
      showMeta: true,
      showLikes: true,
      coverPhotoId: 'port',
      dateSpan: 'May 2024',
      bleedMm: DEFAULT_BLEED_MM,
    },
    {
      serif: pub('fonts/Lora-Medium.ttf'),
      sans: pub('fonts/AlbertSans.ttf'),
      fallback: pub('fonts/NotoSans-Regular.ttf'),
      emoji: pub('fonts/NotoEmoji-Regular.ttf'),
      icc: pub('icc/sRGB.icc'),
    },
    {
      loadPhoto: async (p) => bytes.get(p.id)!,
      toJpeg: async () => {
        throw new Error('no re-encoder in Node');
      },
    },
  );
  writeFileSync(out, result.bytes);
  console.log(`  wrote ${out} (${(result.bytes.byteLength / 1024).toFixed(0)} KB)`);

  assert(result.failed.length === 0, 'all photos embedded');
  assert(result.pages === totalPages(pages), `page count ${result.pages}`);
  assert(Buffer.from(result.bytes.subarray(0, 5)).toString() === '%PDF-', 'PDF header');

  const doc = await PDFDocument.load(result.bytes, { updateMetadata: false });
  const size = PAGE_SIZES_MM[format];
  const b = DEFAULT_BLEED_MM * MM_TO_PT;
  const near = (a: number, e: number) => Math.abs(a - e) < 0.01;
  doc.getPages().forEach((p, i) => {
    const media = p.getMediaBox();
    const trim = p.getTrimBox();
    const bleed = p.getBleedBox();
    const ok =
      near(media.width, size.width * MM_TO_PT + 2 * b) &&
      near(trim.x, b) &&
      near(trim.width, size.width * MM_TO_PT) &&
      near(trim.height, size.height * MM_TO_PT) &&
      near(bleed.width, media.width);
    if (!ok) assert(false, `page ${i + 1} boxes`);
  });
  assert(true, `every page: ${size.width}×${size.height} mm trim, ${DEFAULT_BLEED_MM} mm bleed`);

  const intents = doc.catalog.lookup(PDFName.of('OutputIntents'), PDFArray);
  const intent = intents.lookup(0, PDFDict);
  assert(intent.get(PDFName.of('S'))?.toString() === '/GTS_PDFX', 'sRGB OutputIntent');
  assert(doc.catalog.get(PDFName.of('Metadata')), 'XMP metadata');

  const imagesOn = (i: number) => {
    const res = doc.getPages()[i]!.node.Resources();
    const xo = res?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    return xo ? xo.keys().length : 0;
  };
  const expected = [1, 0, 1, 1, 1, 2, 2, 0, 3, 4, 0];
  expected.forEach((n, i) => {
    if (imagesOn(i) !== n) assert(false, `page ${i + 1}: ${imagesOn(i)} images, expected ${n}`);
  });
  assert(true, 'image count per page matches the layout');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
