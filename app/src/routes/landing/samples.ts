import type { Page, PageSpec, Photo } from '@printagram/shared';
import type { Messages } from '@/i18n';

/**
 * Sample "photos" for the landing page: original CC0 illustrations in /public/samples
 * (see CREDITS.md there). They go through the real PageRenderer and templates, so the
 * spreads show exactly what the layout engine produces.
 */
function sample(
  id: string,
  width: number,
  height: number,
  caption: string,
  takenAt: string,
): Photo {
  const url = `/samples/${id}.svg`;
  return {
    id,
    postId: id,
    source: 'export',
    takenAt,
    year: Number(takenAt.slice(0, 4)),
    month: Number(takenAt.slice(5, 7)) - 1,
    caption,
    likes: null,
    isVideo: false,
    carouselIdx: 0,
    carouselCount: 1,
    width,
    height,
    mime: 'image/svg+xml',
    origUrl: url,
    thumbUrl: url,
    status: 'ready',
  };
}

type SampleText = Messages['landing']['samples'];

/** Sample photos with captions in the given UI language (the art is the same in every language). */
export function samplePhotos(tx: SampleText): Photo[] {
  const c = tx.captions;
  return [
    sample('sunset', 1080, 1350, c.sunset, '2025-07-18T20:40:00Z'),
    sample('rooftops', 1080, 1350, c.rooftops, '2025-03-08T11:00:00Z'),
    sample('beach', 1080, 720, c.beach, '2025-03-09T15:00:00Z'),
    sample('mountains', 1080, 1080, c.mountains, '2025-08-02T06:30:00Z'),
    sample('flowers', 1080, 1350, c.flowers, '2025-05-21T17:00:00Z'),
    sample('coffee', 1080, 1080, c.coffee, '2025-01-12T09:30:00Z'),
    sample('forest', 1080, 1080, c.forest, '2025-10-05T13:00:00Z'),
    sample('city', 1080, 720, c.city, '2025-11-28T23:10:00Z'),
  ];
}

const content = (spec: PageSpec): Page => ({ type: 'content', index: 2, spec });

export function sampleSpreads(tx: SampleText): { label: string; pages: [Page, Page] }[] {
  return [
    {
      label: tx.spreads.trip,
      pages: [
        content({ template: '1-bleed', photoIds: ['rooftops'] }),
        content({ template: '1-margin', photoIds: ['beach'] }),
      ],
    },
    {
      label: tx.spreads.summer,
      pages: [
        content({ template: '2-side', photoIds: ['sunset', 'flowers'] }),
        content({ template: '1-margin', photoIds: ['mountains'] }),
      ],
    },
    {
      label: tx.spreads.year,
      pages: [
        content({ template: 'text', photoIds: [], text: tx.yearText }),
        content({ template: '4-grid', photoIds: ['coffee', 'forest', 'city', 'mountains'] }),
      ],
    },
  ];
}
