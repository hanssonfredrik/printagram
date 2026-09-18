import { describe, expect, it } from 'vitest';
import {
  buildPages,
  coverCrop,
  DEFAULT_PRICING,
  findPostsEntries,
  fixMojibake,
  fmtEuro,
  fmtSpan,
  normalizePosts,
  pageCount,
  pageLabel,
  photoSlots,
  price,
  resolveMediaEntry,
} from '../src/index.js';
import type { Photo } from '../src/index.js';

const photo = (id: string): Photo => ({
  id,
  postId: 'p' + id,
  source: 'export',
  takenAt: '2025-03-04T00:00:00.000Z',
  year: 2025,
  month: 2,
  caption: '',
  likes: null,
  isVideo: false,
  carouselIdx: 0,
  carouselCount: 1,
  width: 1080,
  height: 1350,
  origUrl: '',
  thumbUrl: '',
  status: 'ready',
});

describe('pricing', () => {
  it('counts pages: cover + title + photo pages + back', () => {
    expect(pageCount(0, 'square')).toBe(3);
    expect(pageCount(1, 'square')).toBe(4);
    expect(pageCount(2, 'square')).toBe(4);
    expect(pageCount(3, 'square')).toBe(5);
    expect(pageCount(3, 'portrait')).toBe(6);
  });

  it('prices €9 for up to 40 pages then €0.15 per extra page', () => {
    expect(price(10).totalCents).toBe(900);
    expect(price(40).totalCents).toBe(900);
    expect(price(41).totalCents).toBe(915);
    expect(price(60, DEFAULT_PRICING).extraPages).toBe(20);
    expect(price(60).totalCents).toBe(1200);
  });

  it('formats euros like the design', () => {
    expect(fmtEuro(900)).toBe('€9');
    expect(fmtEuro(915)).toBe('€9,15');
    expect(fmtEuro(15)).toBe('€0,15');
    expect(fmtEuro(1200)).toBe('€12');
  });
});

describe('layout', () => {
  it('builds pages in the order cover, title, photos, back', () => {
    const pages = buildPages({ photos: [photo('a'), photo('b'), photo('c')], format: 'square' });
    expect(pages.map((p) => p.type)).toEqual(['cover', 'title', 'photos', 'photos', 'back']);
    expect(pageLabel(pages[0]!, pages.length)).toBe('Cover');
    expect(pageLabel(pages[2]!, pages.length)).toBe('Page 2 of 3');
    expect(pageLabel(pages[4]!, pages.length)).toBe('Back cover');
  });

  it('computes two stacked slots for square and one for portrait', () => {
    expect(photoSlots('square', 2, true)).toHaveLength(2);
    expect(photoSlots('portrait', 1, false)).toHaveLength(1);
    const [a, b] = photoSlots('square', 2, true);
    expect(a!.caption).not.toBeNull();
    expect(b!.image.y).toBeGreaterThan(a!.image.y);
  });

  it('crops like object-fit: cover', () => {
    const c = coverCrop(1000, 500, 100, 100);
    expect(Math.round(c.sWidth)).toBe(500);
    expect(Math.round(c.sx)).toBe(250);
    expect(c.sy).toBe(0);
  });
});

describe('dates', () => {
  it('formats spans', () => {
    expect(fmtSpan('2025-03-01T00:00:00Z', '2025-09-01T00:00:00Z')).toBe('Mar – Sep 2025');
    expect(fmtSpan('2023-01-01T00:00:00Z', '2025-12-01T00:00:00Z')).toBe('Jan 2023 – Dec 2025');
  });
});

describe('export schema', () => {
  it('fixes mojibake captions and leaves clean strings alone', () => {
    expect(fixMojibake('Ã¥r i GÃ¶teborg ðŸ˜Š')).toBe('år i Göteborg 😊');
    expect(fixMojibake('plain caption')).toBe('plain caption');
    expect(fixMojibake('already ünicode ✓')).toBe('already ünicode ✓');
    expect(fixMojibake(undefined)).toBe('');
  });

  it('normalises carousels and single posts', () => {
    const rows = normalizePosts([
      {
        media: [
          {
            uri: 'media/posts/202503/a.jpg',
            creation_timestamp: 1_741_000_000,
            title: 'Single Ã¥',
          },
        ],
      },
      {
        title: 'Trip',
        creation_timestamp: 1_742_000_000,
        media: [
          { uri: 'media/posts/202503/b.jpg', creation_timestamp: 1_742_000_000 },
          { uri: 'media/posts/202503/c.mp4', creation_timestamp: 1_742_000_000 },
        ],
      },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.caption).toBe('Single å');
    expect(rows[0]!.carouselCount).toBe(1);
    expect(rows[1]!.caption).toBe('Trip');
    expect(rows[1]!.postKey).toBe(rows[2]!.postKey);
    expect(rows[2]!.isVideo).toBe(true);
    expect(rows[2]!.carouselIdx).toBe(1);
    expect(rows[1]!.takenAt).toBe(new Date(1_742_000_000 * 1000).toISOString());
  });

  it('finds posts entries and resolves nested media paths', () => {
    const names = [
      'instagram-mara/your_instagram_activity/media/posts_1.json',
      'instagram-mara/media/posts/202503/a.jpg',
      'your_instagram_activity/media/posts_1.html',
    ];
    const found = findPostsEntries(names);
    expect(found.json).toEqual(['instagram-mara/your_instagram_activity/media/posts_1.json']);
    expect(found.html).toHaveLength(1);
    expect(resolveMediaEntry('media/posts/202503/a.jpg', new Set(names))).toBe(
      'instagram-mara/media/posts/202503/a.jpg',
    );
    expect(resolveMediaEntry('media/posts/202503/zzz.jpg', new Set(names))).toBeNull();
  });
});
