import type { CSSProperties } from 'react';
import type { BookFormat, Page, Photo } from '@printagram/shared';
import { fmtDate, PAGE_SIZES_MM } from '@printagram/shared';
import { Placeholder } from './ui';
import s from './page.module.css';

export function pageAspect(format: BookFormat): string {
  const { width, height } = PAGE_SIZES_MM[format];
  return `${width} / ${height}`;
}

export interface PageRendererProps {
  page: Page;
  format: BookFormat;
  title: string;
  dateSpan: string;
  photoCount: number;
  cover: Photo | null;
  showMeta: boolean;
  showLikes: boolean;
  style?: CSSProperties;
  className?: string;
}

/** DOM twin of the PDF page layout: same page list, same slot arrangement. */
export function PageRenderer({
  page,
  format,
  title,
  dateSpan,
  photoCount,
  cover,
  showMeta,
  showLikes,
  style,
  className,
}: PageRendererProps) {
  return (
    <div
      className={`${s.page} ${className ?? ''}`}
      style={{ aspectRatio: pageAspect(format), padding: format === 'square' ? 18 : 20, ...style }}
    >
      {page.type === 'cover' && (
        <>
          <PhotoFill photo={cover} radius={6} />
          <div className={s.coverTitle}>{title}</div>
        </>
      )}
      {page.type === 'title' && (
        <div className={s.titlePage}>
          <div className={s.titleText}>{title}</div>
          <div className="tiny muted">
            {dateSpan} · {photoCount} photos
          </div>
        </div>
      )}
      {page.type === 'photos' &&
        page.photos.map((p) => (
          <div key={p.id} className={s.slot}>
            <PhotoFill photo={p} radius={4} />
            {showMeta && (
              <div className={s.meta}>
                <span className={s.caption}>{p.caption}</span>
                <span className={s.metaRight}>
                  {showLikes && p.likes !== null && <span>♥ {p.likes}</span>}
                  <span>{fmtDate(p.takenAt)}</span>
                </span>
              </div>
            )}
          </div>
        ))}
      {page.type === 'back' && <div className={s.back}>Made with Printagram</div>}
    </div>
  );
}

function PhotoFill({ photo, radius }: { photo: Photo | null; radius: number }) {
  if (!photo?.thumbUrl) return <Placeholder style={{ flex: 1, borderRadius: radius }} />;
  return (
    <img
      src={photo.thumbUrl}
      alt=""
      className={s.fill}
      style={{ borderRadius: radius }}
      loading="lazy"
    />
  );
}

/** Small cover thumbnail used on Checkout, Done and My books. */
export function CoverThumb({
  src,
  format,
  width,
  style,
}: {
  src: string | null | undefined;
  format: BookFormat;
  width: number;
  style?: CSSProperties;
}) {
  return (
    <div className={s.coverThumb} style={{ width, aspectRatio: pageAspect(format), ...style }}>
      {src ? (
        <img src={src} alt="" className={s.fill} />
      ) : (
        <Placeholder style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
}
