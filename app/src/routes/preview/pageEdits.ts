import type { BookFormat, PageSpec, Photo, TemplateId } from '@printagram/shared';
import { TEMPLATE_CAPACITY, templateForPhotos } from '@printagram/shared';

const MAX_PER_PAGE = 4;

/**
 * Makes a hand-edited page list valid again:
 * - a page with more than 4 photos pushes the extra ones onto the next page (new page if needed),
 * - pages whose photo count no longer matches their template get the best template for that count,
 * - pages that lost all their photos disappear (text pages stay).
 */
export function normalizePages(
  pages: PageSpec[],
  photosById: Map<string, Photo>,
  format: BookFormat,
  fullBleed: boolean,
): PageSpec[] {
  const work = pages.map((p) => ({ ...p, photoIds: [...p.photoIds] }));
  for (let i = 0; i < work.length; i++) {
    const pg = work[i]!;
    if (pg.template === 'text') continue;
    if (pg.photoIds.length > MAX_PER_PAGE) {
      const extra = pg.photoIds.splice(MAX_PER_PAGE);
      const next = work[i + 1];
      if (next && next.template !== 'text') next.photoIds.unshift(...extra);
      else work.splice(i + 1, 0, { template: '1-margin', photoIds: extra });
    }
  }
  const out: PageSpec[] = [];
  for (const pg of work) {
    if (pg.template === 'text') {
      out.push(pg);
      continue;
    }
    if (pg.photoIds.length === 0) continue;
    const photos = pg.photoIds.map((id) => photosById.get(id)).filter((p): p is Photo => !!p);
    const template =
      TEMPLATE_CAPACITY[pg.template] === pg.photoIds.length
        ? pg.template
        : templateForPhotos(photos, format, fullBleed);
    out.push({ template, photoIds: pg.photoIds });
  }
  return out;
}

export function setTemplate(pages: PageSpec[], index: number, template: TemplateId): PageSpec[] {
  return pages.map((p, i) => (i === index ? { ...p, template } : p));
}

export function movePage(pages: PageSpec[], from: number, to: number): PageSpec[] {
  if (to < 0 || to >= pages.length || from === to) return pages;
  const next = [...pages];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function insertTextPage(pages: PageSpec[], after: number, text = ''): PageSpec[] {
  const next = [...pages];
  next.splice(after + 1, 0, { template: 'text', photoIds: [], text });
  return next;
}

export function removePage(pages: PageSpec[], index: number): PageSpec[] {
  return pages.filter((_, i) => i !== index);
}

export function setPageText(pages: PageSpec[], index: number, text: string): PageSpec[] {
  return pages.map((p, i) => (i === index ? { ...p, text } : p));
}
