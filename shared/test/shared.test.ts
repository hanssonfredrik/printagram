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
  bookText,
  captionParts,
  fmtDate,
  fmtMoney,
  currencyForLang,
  normalizePricing,
  promoFitsCurrency,
  fmtSpan,
  isDefaultTitle,
  langFromAcceptLanguage,
  normalizeLang,
  pickLang,
  promoMessage,
  templateLabel,
  normalizePosts,
  normalizePromoCode,
  PAGE_MARGIN_MM,
  PAGE_SIZES_MM,
  pageLabel,
  placePhoto,
  ppiLevel,
  pdfPriceCents,
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

const photo = (
  id: string,
  w = 1080,
  h = 1350,
  takenAt = '2025-03-04T12:00:00.000Z',
  caption = '',
): Photo => ({
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

  it('prices a PDF at a flat €9 or 89 kr whatever its size', () => {
    expect(pdfPriceCents()).toBe(900);
    expect(pdfPriceCents(DEFAULT_PRICING, 'eur')).toBe(900);
    expect(pdfPriceCents(DEFAULT_PRICING, 'sek')).toBe(8900);
    expect(
      pdfPriceCents({ ...DEFAULT_PRICING, eur: { ...DEFAULT_PRICING.eur, baseCents: 1200 } }),
    ).toBe(1200);
  });

  it('falls back to the default prices for an old single-currency config', () => {
    expect(normalizePricing({ baseCents: 900, currency: 'eur' })).toBe(DEFAULT_PRICING);
    expect(normalizePricing(undefined)).toBe(DEFAULT_PRICING);
    const custom = { ...DEFAULT_PRICING, sek: { ...DEFAULT_PRICING.sek, baseCents: 9900 } };
    expect(normalizePricing(custom)).toBe(custom);
  });

  it('picks kronor for Swedish and euros for everyone else', () => {
    expect(currencyForLang('sv')).toBe('sek');
    expect(currencyForLang('en')).toBe('eur');
  });

  it('formats money like the design', () => {
    expect(fmtMoney(900, 'eur')).toBe('€9');
    expect(fmtMoney(915, 'eur')).toBe('€9,15');
    expect(fmtMoney(15, 'eur')).toBe('€0,15');
    expect(fmtMoney(1200, 'eur')).toBe('€12');
    expect(fmtMoney(8900, 'sek', 'sv')).toBe('89\u{a0}kr');
    expect(fmtMoney(7120, 'sek', 'sv')).toBe('71,20\u{a0}kr');
    expect(fmtMoney(8900, 'sek', 'en')).toBe('SEK\u{a0}89');
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
    const pages = autoLayout([sq('a'), sq('b')], {
      density: '1',
      fullBleed: true,
      format: 'square',
    });
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

  it('density 3 fills hero pages in order and lays out leftovers', () => {
    const pages = autoLayout([port('a'), land('b'), sq('c'), port('d'), port('e')], {
      density: '3',
      fullBleed: true,
      format: 'square',
    });
    expect(pages).toEqual([
      { template: '3-hero', photoIds: ['a', 'b', 'c'] },
      { template: '2-side', photoIds: ['d', 'e'] },
    ]);
  });

  it('density 4 fills grids; full-page never applies to a leftover single', () => {
    const pages = autoLayout(
      ['a', 'b', 'c', 'd', 'e'].map((id) => sq(id)),
      {
        density: '4',
        fullBleed: true,
        format: 'square',
      },
    );
    expect(pages.map((p) => p.template)).toEqual(['4-grid', '1-margin']);
    expect(flattenPhotoIds(pages)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('auto uses grids and heroes inside an event and breaks pages between events', () => {
    const day1 = '2025-03-01T10:00:00Z';
    const day3 = '2025-03-03T10:00:00Z';
    const pages = autoLayout(
      [
        sq('a', day1),
        sq('b', day1),
        sq('c', day1),
        sq('d', day1),
        land('e', day3),
        port('f', day3),
        port('g', day3),
      ],
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
      [sq, land, port][i % 3]!(
        `p${i}`,
        new Date(Date.UTC(2025, 0, 1 + Math.floor(i / 5))).toISOString(),
      ),
    );
    for (const density of ['1', '2', '3', '4', 'auto'] as const) {
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
    expect(validatePages([{ template: '1-margin', photoIds: ['zzz'] }], allowed)).toMatch(
      /not in your library/,
    );
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
  it('applies fixed amounts only in their own currency', () => {
    expect(promoFitsCurrency({ type: 'percent' }, 'sek')).toBe(true);
    expect(promoFitsCurrency({ type: 'fixed' }, 'eur')).toBe(true);
    expect(promoFitsCurrency({ type: 'fixed' }, 'sek')).toBe(false);
    expect(promoFitsCurrency({ type: 'fixed', currency: 'sek' }, 'sek')).toBe(true);
  });
  it('checks validity rules', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(promoRejection(null, now)).toBe('not_found');
    expect(promoRejection({ ...base, type: 'percent', value: 10, active: false }, now)).toBe(
      'inactive',
    );
    expect(
      promoRejection(
        { ...base, type: 'percent', value: 10, validUntil: '2026-05-01T00:00:00Z' },
        now,
      ),
    ).toBe('expired');
    expect(
      promoRejection(
        { ...base, type: 'percent', value: 10, validFrom: '2026-07-01T00:00:00Z' },
        now,
      ),
    ).toBe('not_started');
    expect(
      promoRejection(
        { ...base, type: 'percent', value: 10, maxRedemptions: 2, redemptions: 2 },
        now,
      ),
    ).toBe('used_up');
    expect(promoRejection({ ...base, type: 'percent', value: 10 }, now)).toBeNull();
    expect(normalizePromoCode(' welcome 100 ')).toBe('WELCOME100');
  });
});

describe('dates', () => {
  it('formats spans', () => {
    expect(fmtSpan('2025-03-01T00:00:00Z', '2025-09-01T00:00:00Z')).toBe('Mar – Sep 2025');
    expect(fmtSpan('2023-01-01T00:00:00Z', '2025-12-01T00:00:00Z')).toBe('Jan 2023 – Dec 2025');
  });

  it('formats dates and spans in Swedish', () => {
    expect(fmtDate('2026-05-17T10:00:00Z', 'sv')).toBe('17 maj 2026');
    expect(fmtDate('2026-05-17T10:00:00Z')).toBe('17 May 2026');
    expect(fmtSpan('2025-03-01T00:00:00Z', '2025-10-01T00:00:00Z', 'sv')).toBe('mar – okt 2025');
  });
});

describe('languages', () => {
  it('picks a supported language, falling back to English', () => {
    expect(normalizeLang('sv-SE')).toBe('sv');
    expect(normalizeLang('SV')).toBe('sv');
    expect(normalizeLang('de-DE')).toBe('en');
    expect(normalizeLang(undefined)).toBe('en');
    expect(pickLang(['de-DE', 'sv-SE', 'en-US'])).toBe('sv');
    expect(pickLang(['fr', 'de'])).toBe('en');
    expect(langFromAcceptLanguage('de-DE,de;q=0.9,sv;q=0.8,en;q=0.7')).toBe('sv');
    expect(langFromAcceptLanguage('en-GB,sv;q=0.9')).toBe('en');
    expect(langFromAcceptLanguage('sv;q=0.2,en;q=0.5')).toBe('en');
    expect(langFromAcceptLanguage('')).toBe('en');
  });

  it('has Swedish text for the book, labels, prices and promo codes', () => {
    expect(bookText('sv').photos(1)).toBe('1 foto');
    expect(bookText('sv').photos(3)).toBe('3 foton');
    expect(bookText('en').photos(1)).toBe('1 photo');
    expect(bookText('sv').madeWith).toBe('Skapad med Inbunden');
    expect(templateLabel('4-grid', 'sv')).toBe('Rutnät med fyra');
    expect(templateLabel('4-grid')).toBe('Grid of four');
    expect(fmtMoney(900, 'eur', 'sv')).toBe('9\u{a0}€');
    expect(fmtMoney(915, 'eur', 'sv')).toBe('9,15\u{a0}€');
    expect(promoMessage('expired', 'sv')).toBe('Koden har gått ut.');
    const pages = buildPages([{ template: '1-margin', photoIds: ['a'] }]);
    expect(pageLabel(pages[0]!, pages.length, 'sv')).toBe('Omslag');
    expect(pageLabel(pages[2]!, pages.length, 'sv')).toBe('Sida 1 av 1');
    expect(
      captionParts({ caption: 'Hej', likes: 3, takenAt: '2025-01-05T00:00:00Z' }, true, 'sv').meta,
    ).toBe('♥ 3   5 jan 2025');
  });

  it('recognises generated default titles in any language', () => {
    expect(isDefaultTitle('Our years')).toBe(true);
    expect(isDefaultTitle('Våra år · 2021–2024')).toBe(true);
    expect(isDefaultTitle('Summer in Skåne')).toBe(false);
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
