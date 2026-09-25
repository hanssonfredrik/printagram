import type { Photo } from '@printagram/shared';
import { monthKey } from '@printagram/shared';

/**
 * Port of the demo dataset from the approved design (Printagram v4.dc.html):
 * 36 months (2023–2025), 2–6 posts per month, 12 % videos, 30 % carousels,
 * seeded so every reload shows the same library.
 */

export const DEMO_HUES: [number, number, number][] = [
  [201, 183, 164],
  [168, 181, 201],
  [185, 196, 168],
  [208, 169, 154],
  [196, 178, 160],
  [160, 175, 190],
  [214, 190, 150],
  [178, 168, 190],
  [190, 200, 205],
  [205, 175, 170],
];

const CAPS = [
  'Morning light',
  'Sunday walk',
  'Coffee, again',
  'Home',
  'With friends',
  'The coast',
  'Late summer',
  'First snow',
  'Market day',
  'Golden hour',
  'Weekend',
  'Slow day',
];

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Striped placeholder rendered as an SVG data URL so <img> and the PDF worker can both consume it. */
export function demoImage(c: [number, number, number], w: number, h: number, label = ''): string {
  const c2 = c.map((v) => Math.min(255, v + 18)) as [number, number, number];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><pattern id="p" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="34" height="34" fill="rgb(${c.join(',')})"/><rect width="17" height="34" fill="rgb(${c2.join(',')})"/>` +
    `</pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>` +
    (label
      ? `<text x="50%" y="52%" text-anchor="middle" font-family="Georgia,serif" font-size="${Math.round(w / 14)}" fill="rgba(42,38,34,.45)">${label}</text>`
      : '') +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function demoCssGradient(c: [number, number, number]): string {
  const c2 = c.map((v) => Math.min(255, v + 18));
  return `repeating-linear-gradient(135deg, rgb(${c.join(',')}) 0 6px, rgb(${c2.join(',')}) 6px 12px)`;
}

export function makeDemoPhotos(source: 'instagram' | 'export', from = 2023, to = 2025): Photo[] {
  const out: Photo[] = [];
  let id = 0;
  let postId = 0;
  const months: { y: number; m: number }[] = [];
  for (let y = from; y <= to; y++) for (let m = 0; m < 12; m++) months.push({ y, m });
  months.forEach(({ y, m }, mi) => {
    const rnd = seeded(mi + 7);
    const nPosts = 2 + Math.floor(rnd() * 5);
    for (let i = 0; i < nPosts; i++) {
      const day = 1 + Math.floor(rnd() * 27);
      const isVideo = rnd() < 0.12;
      const count = !isVideo && rnd() < 0.3 ? 2 + Math.floor(rnd() * 4) : 1;
      const caption = CAPS[Math.floor(rnd() * CAPS.length)]!;
      const pid = `demo_post_${postId++}`;
      const likes = 6 + Math.floor(rnd() * rnd() * 520);
      const portrait = rnd() < 0.35;
      for (let k = 0; k < count; k++) {
        const c = DEMO_HUES[Math.floor(rnd() * DEMO_HUES.length)]!;
        const w = 1080;
        const h = portrait ? 1350 : 1080;
        const takenAt = new Date(Date.UTC(y, m, day, 12, 0, 0)).toISOString();
        out.push({
          id: `demo_${id++}`,
          postId: pid,
          source,
          takenAt,
          year: y,
          month: m,
          caption,
          likes: source === 'instagram' ? likes : null,
          isVideo,
          carouselIdx: k,
          carouselCount: count,
          width: w,
          height: h,
          mime: 'image/jpeg',
          origUrl: demoImage(c, w, h),
          thumbUrl: demoImage(c, 400, Math.round((400 * h) / w)),
          status: 'ready',
        });
      }
    }
  });
  return out;
}

export function demoMonthKeys(photos: Photo[]): string[] {
  return [...new Set(photos.map((p) => monthKey(p.year, p.month)))].sort();
}
