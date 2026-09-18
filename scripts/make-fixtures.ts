/**
 * Builds Instagram-export fixture ZIPs for tests:
 *   fixtures/instagram-fixture.zip   JSON export: 2 single posts, 1 carousel (3 images), 1 video, mojibake caption
 *   fixtures/instagram-html.zip      HTML-format export (no JSON)
 *   fixtures/instagram-empty.zip     export without posts
 *
 *   npx tsx scripts/make-fixtures.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { Jimp } from 'jimp';

const outDir = path.resolve('fixtures');
mkdirSync(outDir, { recursive: true });

async function jpeg(
  w: number,
  h: number,
  rgb: [number, number, number],
  label: string,
): Promise<Uint8Array> {
  const color = ((rgb[0] << 24) | (rgb[1] << 16) | (rgb[2] << 8) | 0xff) >>> 0;
  const img = new Jimp({ width: w, height: h, color });
  // simple diagonal stripes so pages are visually distinct
  for (let y = 0; y < h; y += 24)
    for (let x = 0; x < w; x++) if (((x + y) >> 4) % 2 === 0) img.setPixelColor(0xffffffaa, x, y);
  void label;
  return new Uint8Array(await img.getBuffer('image/jpeg', { quality: 85 }));
}

/** Encodes a JS string the way Instagram does: UTF-8 bytes written as Latin-1 code points. */
function mojibake(s: string): string {
  return Buffer.from(s, 'utf8').toString('latin1');
}

async function main() {
  const ts = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d, 12) / 1000);
  const media = [
    {
      uri: 'media/posts/202503/a1.jpg',
      w: 1080,
      h: 1350,
      c: [201, 183, 164] as [number, number, number],
    },
    {
      uri: 'media/posts/202504/b1.jpg',
      w: 1080,
      h: 1080,
      c: [168, 181, 201] as [number, number, number],
    },
    {
      uri: 'media/posts/202504/b2.jpg',
      w: 1080,
      h: 1080,
      c: [185, 196, 168] as [number, number, number],
    },
    {
      uri: 'media/posts/202504/b3.jpg',
      w: 1080,
      h: 1080,
      c: [208, 169, 154] as [number, number, number],
    },
    {
      uri: 'media/posts/202506/c1.jpg',
      w: 1080,
      h: 1350,
      c: [214, 190, 150] as [number, number, number],
    },
  ];
  const posts = [
    {
      media: [
        {
          uri: media[0]!.uri,
          creation_timestamp: ts(2025, 3, 4),
          title: mojibake('Vår i Göteborg 🌷'),
        },
      ],
    },
    {
      title: mojibake('Påsk med familjen'),
      creation_timestamp: ts(2025, 4, 20),
      media: media.slice(1, 4).map((m) => ({ uri: m.uri, creation_timestamp: ts(2025, 4, 20) })),
    },
    {
      media: [
        { uri: 'media/posts/202505/v1.mp4', creation_timestamp: ts(2025, 5, 2), title: 'A video' },
      ],
    },
    { media: [{ uri: media[4]!.uri, creation_timestamp: ts(2025, 6, 15), title: 'Midsummer' }] },
  ];

  // Full JSON export
  {
    const writer = new ZipWriter(new BlobWriter('application/zip'));
    await writer.add(
      'your_instagram_activity/media/posts_1.json',
      new TextReader(JSON.stringify(posts)),
    );
    for (const m of media)
      await writer.add(m.uri, new Uint8ArrayReader(await jpeg(m.w, m.h, m.c, m.uri)));
    await writer.add('media/posts/202505/v1.mp4', new Uint8ArrayReader(new Uint8Array(64)));
    await writer.add('personal_information/personal_information.json', new TextReader('{}'));
    const blob = await writer.close();
    writeFileSync(
      path.join(outDir, 'instagram-fixture.zip'),
      Buffer.from(await blob.arrayBuffer()),
    );
  }
  // HTML export
  {
    const writer = new ZipWriter(new BlobWriter('application/zip'));
    await writer.add(
      'your_instagram_activity/media/posts_1.html',
      new TextReader('<html><body>posts</body></html>'),
    );
    const blob = await writer.close();
    writeFileSync(path.join(outDir, 'instagram-html.zip'), Buffer.from(await blob.arrayBuffer()));
  }
  // Empty export
  {
    const writer = new ZipWriter(new BlobWriter('application/zip'));
    await writer.add('personal_information/personal_information.json', new TextReader('{}'));
    const blob = await writer.close();
    writeFileSync(path.join(outDir, 'instagram-empty.zip'), Buffer.from(await blob.arrayBuffer()));
  }
  console.log('fixtures written to', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
