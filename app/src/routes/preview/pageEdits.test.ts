import { describe, expect, it } from 'vitest';
import type { PageSpec, Photo } from '@printagram/shared';
import { TEMPLATE_CAPACITY } from '@printagram/shared';
import {
  insertTextPage,
  movePage,
  normalizePages,
  removePage,
  setPageText,
  setTemplate,
} from './pageEdits';

function photo(id: string, width = 1080, height = 1080): Photo {
  return {
    id,
    postId: id,
    source: 'export',
    takenAt: '2025-01-01T00:00:00Z',
    year: 2025,
    month: 0,
    caption: '',
    likes: null,
    isVideo: false,
    carouselIdx: 0,
    carouselCount: 1,
    width,
    height,
    mime: 'image/jpeg',
    origUrl: '',
    thumbUrl: '',
    status: 'ready',
  };
}

const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
const byId = new Map(ids.map((id) => [id, photo(id)]));
const norm = (pages: PageSpec[]) => normalizePages(pages, byId, 'square', false);

describe('page edits', () => {
  it('a page over capacity pushes the extra photos onto the next page', () => {
    const out = norm([
      { template: '4-grid', photoIds: ['a', 'b', 'c', 'd', 'e'] },
      { template: '1-margin', photoIds: ['f'] },
    ]);
    expect(out[0]!.photoIds).toEqual(['a', 'b', 'c', 'd']);
    expect(out[1]!.photoIds).toEqual(['e', 'f']);
    for (const p of out) expect(TEMPLATE_CAPACITY[p.template]).toBe(p.photoIds.length);
  });

  it('overflow before a text page gets its own new page', () => {
    const out = norm([
      { template: '4-grid', photoIds: ['a', 'b', 'c', 'd', 'e'] },
      { template: 'text', photoIds: [], text: 'Summer' },
    ]);
    expect(out.map((p) => p.photoIds.length)).toEqual([4, 1, 0]);
    expect(out[2]!.template).toBe('text');
  });

  it('emptied photo pages disappear, text pages stay, templates follow the photo count', () => {
    const out = norm([
      { template: '2-stack', photoIds: ['a'] },
      { template: '1-margin', photoIds: [] },
      { template: 'text', photoIds: [], text: '' },
    ]);
    expect(out).toHaveLength(2);
    expect(TEMPLATE_CAPACITY[out[0]!.template]).toBe(1);
    expect(out[1]!.template).toBe('text');
  });

  it('keeps a template that still fits', () => {
    const out = norm([{ template: '2-side', photoIds: ['a', 'b'] }]);
    expect(out[0]!.template).toBe('2-side');
  });

  it('move, insert, remove and text edits return new arrays', () => {
    const pages: PageSpec[] = [
      { template: '1-margin', photoIds: ['a'] },
      { template: '1-margin', photoIds: ['b'] },
    ];
    expect(movePage(pages, 0, 1).map((p) => p.photoIds[0])).toEqual(['b', 'a']);
    expect(movePage(pages, 0, 5)).toBe(pages);
    const withText = insertTextPage(pages, 0, 'Hi');
    expect(withText[1]).toEqual({ template: 'text', photoIds: [], text: 'Hi' });
    expect(setPageText(withText, 1, 'Hello')[1]!.text).toBe('Hello');
    expect(removePage(withText, 1)).toEqual(pages);
    expect(setTemplate(pages, 0, '1-bleed')[0]!.template).toBe('1-bleed');
    expect(pages[0]!.template).toBe('1-margin');
  });
});
