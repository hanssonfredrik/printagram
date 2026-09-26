import { describe, expect, it } from 'vitest';
import { exifDateTaken } from '../src/lib/exif.js';

/** A JPEG header with one APP1 Exif segment (big-endian TIFF) carrying the given tags. */
function jpegWithExif(tags: { tag: number; value: string }[], littleEndian = false): Buffer {
  const entries = tags.length;
  const ifdSize = 2 + entries * 12 + 4;
  let dataOff = 8 + ifdSize;
  const tiff = Buffer.alloc(8 + ifdSize + tags.reduce((n, t) => n + t.value.length + 1, 0));
  const u16 = (o: number, v: number) =>
    littleEndian ? tiff.writeUInt16LE(v, o) : tiff.writeUInt16BE(v, o);
  const u32 = (o: number, v: number) =>
    littleEndian ? tiff.writeUInt32LE(v, o) : tiff.writeUInt32BE(v, o);
  tiff.write(littleEndian ? 'II' : 'MM', 0, 'latin1');
  u16(2, 0x2a);
  u32(4, 8);
  u16(8, entries);
  tags.forEach((t, i) => {
    const e = 10 + i * 12;
    u16(e, t.tag);
    u16(e + 2, 2); // ASCII
    u32(e + 4, t.value.length + 1);
    u32(e + 8, dataOff);
    tiff.write(t.value + '\0', dataOff, 'latin1');
    dataOff += t.value.length + 1;
  });
  u32(8 + 2 + entries * 12, 0);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const seg = Buffer.alloc(4);
  seg[0] = 0xff;
  seg[1] = 0xe1;
  seg.writeUInt16BE(app1.length + 2, 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), seg, app1, Buffer.from([0xff, 0xda, 0, 2])]);
}

describe('exifDateTaken', () => {
  it('reads DateTimeOriginal from IFD0 (both byte orders)', () => {
    const be = jpegWithExif([{ tag: 0x9003, value: '2021:07:14 09:30:15' }]);
    expect(exifDateTaken(be)?.toISOString()).toBe('2021-07-14T09:30:15.000Z');
    const le = jpegWithExif([{ tag: 0x9003, value: '2019:12:01 18:00:00' }], true);
    expect(exifDateTaken(le)?.toISOString()).toBe('2019-12-01T18:00:00.000Z');
  });

  it('prefers DateTimeOriginal over DateTime', () => {
    const buf = jpegWithExif([
      { tag: 0x0132, value: '2024:01:01 00:00:00' },
      { tag: 0x9003, value: '2020:05:05 05:05:05' },
    ]);
    expect(exifDateTaken(buf)?.toISOString()).toBe('2020-05-05T05:05:05.000Z');
  });

  it('returns null for files without EXIF or that are not JPEG', () => {
    expect(exifDateTaken(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull();
    expect(exifDateTaken(Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'))).toBeNull();
    expect(exifDateTaken(Buffer.alloc(0))).toBeNull();
  });
});
