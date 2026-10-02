/**
 * Minimal EXIF reader: the original capture date of a JPEG, if the file carries one.
 * Google Photos derives `createTime` from the same field when it exists, but files that
 * went through Instagram usually have no EXIF at all - then the caller falls back.
 */

const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;

function parseExifDate(s: string): Date | null {
  // "YYYY:MM:DD HH:MM:SS"
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number);
  if (!y || !mo || !d) return null;
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date taken from the EXIF block of a JPEG, or null when there is none. */
export function exifDateTaken(buf: Buffer): Date | null {
  if (buf.length < 12 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 4 <= buf.length && buf[off] === 0xff) {
    const marker = buf[off + 1]!;
    const size = buf.readUInt16BE(off + 2);
    if (marker === 0xe1 && buf.toString('latin1', off + 4, off + 10) === 'Exif\0\0') {
      return readTiff(buf.subarray(off + 10, off + 2 + size));
    }
    if (marker === 0xda) break; // start of scan: no APP1 before the image data
    off += 2 + size;
  }
  return null;
}

function readTiff(t: Buffer): Date | null {
  if (t.length < 8) return null;
  const le = t.toString('latin1', 0, 2) === 'II';
  const u16 = (o: number) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = (o: number) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  if (u16(2) !== 0x2a) return null;
  let dateTime: string | null = null;
  let dateOriginal: string | null = null;

  const readIfd = (start: number, depth: number) => {
    if (start + 2 > t.length || depth > 2) return;
    const n = u16(start);
    for (let i = 0; i < n; i++) {
      const e = start + 2 + i * 12;
      if (e + 12 > t.length) return;
      const tag = u16(e);
      const type = u16(e + 2);
      const count = u32(e + 4);
      if (tag === TAG_EXIF_IFD) {
        readIfd(u32(e + 8), depth + 1);
      } else if ((tag === TAG_DATETIME_ORIGINAL || tag === TAG_DATETIME) && type === 2) {
        const at = count <= 4 ? e + 8 : u32(e + 8);
        if (at + count > t.length) continue;
        const s = t.toString('latin1', at, at + count).replace(/\0+$/, '');
        if (tag === TAG_DATETIME_ORIGINAL) dateOriginal = s;
        else dateTime = s;
      }
    }
  };
  readIfd(u32(4), 0);
  const chosen = dateOriginal ?? dateTime;
  return chosen ? parseExifDate(chosen) : null;
}
