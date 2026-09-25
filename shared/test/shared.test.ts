import { describe, expect, it } from 'vitest';
import {
  autoLayout,
  buildPages,
  coverCrop,
  DEFAULT_PRICING,
  discountCents,
  effectivePpi,
  findPostsEntries,
  fixMojibake,
  flattenPhotoIds,
  fmtEuro,
  fmtSpan,
  normalizePosts,
  normalizePromoCode,
  PAGE_MARGIN_MM,
  PAGE_SIZES_MM,
  pageLabel,
  placePhoto,
  ppiLevel,
  price,
  promoRejection,
  reconcilePages,
  resolveMediaEntry,
  slotsFor,
  TEMPLATE_CAPACITY,
  templatesFor,
  totalPages,
  validatePages,
} from '../src/index.js';
import type { Photo } from '../src/index.js';

const photo = (id: string, w = 1080, h = 1350, takenAt = '2025-03-04T12:00:00.000Z', caption = ''): Photo => ({
  id,
  postId: 'p' + id,
  source: 'export',
  takenAt,
  year: 2025,
  month: 2,
  caption,
  likes: null,
  isVideo: false,
  carouselIdx: 0,
  carouselCount: 1,
  width: w,
  height: h,
  mime: 'image/jpeg',
  origUrl: '',
  thumbUrl: '',
  status: 'ready',
});
const sq = (id: string, t?: string) => photo(id, 1080, 1080, t);
const land = (id: string, t?: string) => photo(id, 1080, 566, t);
const port = (id: string, t?: string) => photo(id, 1080, 1350, t);

describe('pricing', () => {
  it('counts pages: cover + title + content pages + back', () => {
    expect(totalPages([])).toBe(3);
    expect(totalPages([{ template: '1-margin', photoIds: ['a'] }])).toBe(4);
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

describe('page sequence', () => {
  it('builds cover, title, content, back and labels them', () => {
    const pages = buildPages([
      { template: '1-margin', photoIds: ['a'] },
      { template: '2-side', photoIds: ['b', 'c'] },
    ]);
    expect(pages.map((p) => p.type)).toEqual(['cover', 'title', 'content', 'content', 'back']);
    expect(pageLabel(pages[0]!, pages.length)).toBe('Cover');
    expect(pageLabel(pages[2]!, pages.length)).toBe('Page 1 of 2');
    expect(pageLabel(pages[3]!, pages.length)).toBe('Page 2 of 2');
    expect(pageLabel(pages[4]!, pages.length)).toBe('Back cover');
  });
});

describe('templates and placement', () => {
  it('every template stays inside the page and has as many slots as its capacity', () => {
    for (const format of ['square', 'portrait'] as const) {
      const size = PAGE_SIZES_MM[format];
      for (const t of Object.keys(TEMPLATE_CAPACITY) as (keyof typeof TEMPLATE_CAPACITY)[]) {
        const slots = slotsFor(t, format);
        expect(slots).toHaveLength(TEMPLATE_CAPACITY[t]);
        for (const s of slots) {
          expect(s.frame.x).toBeGreaterThanOrEqual(0);
          expect(s.frame.y).toBeGreaterThanOrEqual(0);
          expect(s.frame.x + s.frame.width).toBeLessThanOrEqual(size.width + 1e-9);
          expect(s.frame.y + s.frame.height).toBeLessThanOrEqual(size.height + 1e-9);
          if (!s.bleed) {
            expect(s.frame.x).toBeGreaterThanOrEqual(PAGE_MARGIN_MM);
          }
        }
      }
    }
  });

  it('"contain" shows the whole photo with the caption right below it', () => {
    const [slot] = slotsFor('1-margin', 'square');
    const p = placePhoto(slot!, 1080 / 1350, true);
    expect(p.crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(p.image.width / p.image.height).toBeCloseTo(0.8, 5);
    expect(p.caption!.y).toBeCloseTo(p.image.y + p.image.height, 5);
    expect(p.caption!.width).toBeCloseTo(p.image.width, 5);
  });

  it('"cover" crops around the centre', () => {
    const c = coverCrop(2, 1);
    expect(c.width).toBeCloseTo(0.5);
    expect(c.x).toBeCloseTo(0.25);
    expect(c.height).toBe(1);
  });

  it('computes effective ppi and warns for full-bleed Instagram photos', () => {
    const one = placePhoto(slotsFor('1-margin', 'square')[0]!, 1, false);
    expect(ppiLevel(effectivePpi(1080, 1080, one))).toBe('ok');
    const bleed = placePhoto(slotsFor('1-bleed', 'square')[0]!, 1, false);
    const ppi = effectivePpi(1080, 1080, bleed);
    expect(ppi).toBeGreaterThan(125);
    expect(ppi).toBeLessThan(135);
    expect(ppiLevel(ppi)).toBe('soft');
    expect(ppiLevel(90)).toBe('low');
  });
});

describe('auto layout', () => {
  it('density 1 puts one photo per page (full-bleed when asked)', () => {
    const pages = autoLayout([sq('a'), sq('b')], { density: '1', fullBleed: true, format: 'square' });
    expect(pages.map((p) => p.template)).toEqual(['1-bleed', '1-bleed']);
  });

  it('density 2 pairs by orientation', () => {
    const pages = autoLayout([land('a'), land('b'), port('c'), port('d'), sq('e')], {
      density: '2',
      fullBleed: false,
      format: 'square',
    });
    expect(pages.map((p) => p.template)).toEqual(['2-stack', '2-side', '1-margin']);
    expect(flattenPhotoIds(pages)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('auto uses grids and heroes inside an event and breaks pages between events', () => {
    const day1 = '2025-03-01T10:00:00Z';
    const day3 = '2025-03-03T10:00:00Z';
    const pages = autoLayout(
      [sq('a', day1), sq('b', day1), sq('c', day1), sq('d', day1), land('e', day3), port('f', day3), port('g', day3)],
      { density: 'auto', fullBleed: false, format: 'square' },
    );
    expect(pages.map((p) => p.template)).toEqual(['4-grid', '3-hero']);
    expect(flattenPhotoIds(pages)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('keeps a long caption on its own page when captions are shown', () => {
    const long = photo('a', 1080, 1080, '2025-03-01T10:00:00Z', 'x'.repeat(200));
    const pages = autoLayout([long, sq('b', '2025-03-01T11:00:00Z')], {
      density: 'auto',
      fullBleed: false,
      format: 'square',
      showMeta: true,
    });
    expect(pages[0]).toEqual({ template: '1-margin', photoIds: ['a'] });
  });

  it('never loses or duplicates photos', () => {
    const photos = Array.from({ length: 37 }, (_, i) =>
      [sq, land, port][i % 3]!(`p${i}`, new Date(Date.UTC(2025, 0, 1 + Math.floor(i / 5))).toISOString()),
    );
    for (const density of ['1', '2', 'auto'] as const) {
      const pages = autoLayout(photos, { density, fullBleed: false, format: 'portrait' });
      expect(flattenPhotoIds(pages)).toEqual(photos.map((p) => p.id));
      for (const pg of pages) expect(pg.photoIds.length).toBe(TEMPLATE_CAPACITY[pg.template]);
    }
  });
});

describe('manual layouts', () => {
  const opts = { density: 'auto' as const, fullBleed: false, format: 'square' as const };

  it('reconcile drops removed photos, fixes templates and appends new ones', () => {
    const manual = [
      { template: '4-grid' as const, photoIds: ['a', 'b', 'c', 'd'] },
      { template: 'text' as const, photoIds: [], text: 'Summer' },
      { template: '1-margin' as const, photoIds: ['e'] },
    ];
    const out = reconcilePages(manual, [sq('a'), sq('c'), sq('d'), sq('f')], opts);
    expect(out[0]).toEqual({ template: '3-hero', photoIds: ['a', 'c', 'd'] });
    expect(out[1]).toEqual({ template: 'text', photoIds: [], text: 'Summer' });
    expect(flattenPhotoIds(out)).toEqual(['a', 'c', 'd', 'f']);
  });

  it('validates pages from untrusted clients', () => {
    const allowed = new Set(['a', 'b']);
    expect(validatePages([{ template: '2-side', photoIds: ['a', 'b'] }], allowed)).toBeNull();
    expect(validatePages([{ template: '2-side', photoIds: ['a'] }], allowed)).toMatch(/needs 2/);
    expect(validatePages([{ template: '1-margin', photoIds: ['zzz'] }], allowed)).toMatch(/not in your library/);
    expect(
      validatePages(
        [
          { template: '1-margin', photoIds: ['a'] },
          { template: '1-margin', photoIds: ['a'] },
        ],
        allowed,
      ),
    ).toMatch(/twice/);
    expect(validatePages([{ template: 'nope', photoIds: [] }], allowed)).toMatch(/Unknown/);
    expect(templatesFor(2)).toEqual(['2-stack', '2-side']);
  });
});

describe('discount codes', () => {
  const base = {
    code: 'X',
    validFrom: null,
    validUntil: null,
    maxRedemptions: null,
    redemptions: 0,
    perUserOnce: false,
    active: true,
  };
  it('computes and clamps discounts', () => {
    expect(discountCents(900, { type: 'percent', value: 20 })).toBe(180);
    expect(discountCents(915, { type: 'percent', value: 33 })).toBe(302);
    expect(discountCents(900, { type: 'fixed', value: 1500 })).toBe(900);
    expect(discountCents(900, { type: 'percent', value: 100 })).toBe(900);
  });
  it('checks validity rules', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(promoRejection(null, now)).toBe('not_found');
    expect(promoRejection({ ...base, type: 'percent', value: 10, active: false }, now)).toBe('inactive');
    expect(promoRejection({ ...base, type: 'percent', value: 10, validUntil: '2026-05-01T00:00:00Z' }, now)).toBe('expired');
    expect(promoRejection({ ...base, type: 'percent', value: 10, validFrom: '2026-07-01T00:00:00Z' }, now)).toBe('not_started');
    expect(promoRejection({ ...base, type: 'percent', value: 10, maxRedemptions: 2, redemptions: 2 }, now)).toBe('used_up');
    expect(promoRejection({ ...base, type: 'percent', value: 10 }, now)).toBeNull();
    expect(normalizePromoCode(' welcome 100 ')).toBe('WELCOME100');
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
