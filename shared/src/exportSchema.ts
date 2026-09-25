/**
 * Types and helpers for Instagram's "Download your information" JSON export.
 *
 * Observed structure (2024–2026 exports):
 *   your_instagram_activity/media/posts_1.json  → RawPost[]
 *   media/posts/YYYYMM/<file>.jpg               → referenced by RawMedia.uri
 *
 * Quirks handled here:
 *  - Carousels carry `creation_timestamp` and `title` at post level; single-image
 *    posts only have them inside media[0].
 *  - Text is UTF-8 that was serialised as if it were Latin-1 (mojibake), e.g.
 *    "Ã¥" for "å". `fixMojibake` reverses that.
 *  - Videos are .mp4 files and are skipped by the importer (kept as isVideo rows so
 *    the UI can count them).
 */

export interface RawMedia {
  uri: string;
  creation_timestamp?: number;
  title?: string;
  media_metadata?: unknown;
  cross_post_source?: unknown;
}

export interface RawPost {
  media: RawMedia[];
  title?: string;
  creation_timestamp?: number;
}

export interface NormalizedMedia {
  /** Stable id derived from the uri (64-bit hash), so re-importing the same export is idempotent. */
  key: string;
  uri: string;
  postKey: string;
  takenAt: string;
  caption: string;
  isVideo: boolean;
  carouselIdx: number;
  carouselCount: number;
}

const VIDEO_RE = /\.(mp4|mov|m4v|webm)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|heic)$/i;

/**
 * Windows-1252 code points 0x80–0x9F as they appear when mojibake text has been
 * re-rendered through a cp1252 view (e.g. "ðŸ˜Š" for 😊). Maps them back to bytes.
 */
const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

/** Reverses UTF-8-as-Latin-1 mojibake. Returns the input unchanged if it is not mojibake. */
export function fixMojibake(input: string | undefined | null): string {
  if (!input) return '';
  // Fast path: nothing above U+007F means nothing to fix.
  let hasHigh = false;
  let hasLead = false;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c > 0x7f) hasHigh = true;
    // Mojibake multi-byte sequences start with 0xC2-0xF4 rendered as Latin-1 (Â, Ã, Ð, ð).
    if (c >= 0xc2 && c <= 0xf4) hasLead = true;
  }
  if (!hasHigh || !hasLead) return input;
  try {
    const bytes = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      const byte = code <= 0xff ? code : CP1252_REVERSE[code];
      if (byte === undefined) return input; // genuine Unicode already
      bytes[i] = byte;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return input;
  }
}

export function isVideoUri(uri: string): boolean {
  return VIDEO_RE.test(uri);
}

export function isImageUri(uri: string): boolean {
  return IMAGE_RE.test(uri);
}

/** Simple, fast, deterministic string hash (FNV-1a 32-bit) rendered as 8 hex chars. */
/** 64-bit id from two independent FNV-1a passes: ~1 in 10^11 collision odds at 10 000 photos. */
export function hash64(str: string): string {
  return fnv1a(str) + fnv1a(str, 0x01000193 ^ 0x9e3779b9);
}

export function fnv1a(str: string, basis = 0x811c9dc5): string {
  let h = basis >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Flattens raw posts into one row per media item with fixed captions and timestamps. */
export function normalizePosts(posts: RawPost[]): NormalizedMedia[] {
  const out: NormalizedMedia[] = [];
  for (const post of posts) {
    const media = Array.isArray(post.media) ? post.media : [];
    if (media.length === 0) continue;
    const first = media[0]!;
    const postTs = post.creation_timestamp ?? first.creation_timestamp ?? 0;
    const postCaption = fixMojibake(post.title ?? first.title ?? '');
    const postKey = `p_${fnv1a(`${postTs}|${first.uri}`)}`;
    media.forEach((m, idx) => {
      if (!m || typeof m.uri !== 'string') return;
      const ts = m.creation_timestamp ?? postTs;
      out.push({
        key: `ex_${hash64(m.uri)}`,
        uri: m.uri,
        postKey,
        takenAt: new Date(ts * 1000).toISOString(),
        caption: idx === 0 ? postCaption : fixMojibake(m.title ?? '') || postCaption,
        isVideo: isVideoUri(m.uri),
        carouselIdx: idx,
        carouselCount: media.length,
      });
    });
  }
  return out;
}

/** Locates a posts JSON entry among ZIP entry names. Returns null when none is present. */
export function findPostsEntries(names: string[]): { json: string[]; html: string[] } {
  const json: string[] = [];
  const html: string[] = [];
  for (const n of names) {
    const lower = n.toLowerCase();
    if (
      /(^|\/)media\/posts_\d+\.json$/.test(lower) ||
      /(^|\/)content\/posts_\d+\.json$/.test(lower)
    ) {
      json.push(n);
    } else if (
      /(^|\/)media\/posts_\d+\.html$/.test(lower) ||
      /(^|\/)content\/posts_\d+\.html$/.test(lower)
    ) {
      html.push(n);
    }
  }
  json.sort();
  html.sort();
  return { json, html };
}

/** Resolves a media uri to the matching ZIP entry name (uris are relative to the ZIP root). */
export function resolveMediaEntry(uri: string, entryNames: Set<string>): string | null {
  if (entryNames.has(uri)) return uri;
  const trimmed = uri.replace(/^\.?\//, '');
  if (entryNames.has(trimmed)) return trimmed;
  // Some exports nest everything under a top-level folder.
  for (const name of entryNames) {
    if (name.endsWith('/' + trimmed)) return name;
  }
  return null;
}
