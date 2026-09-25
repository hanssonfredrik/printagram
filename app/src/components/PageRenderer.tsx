import type { CSSProperties, ReactNode } from 'react';
import type { BookFormat, Page, Photo, PlacedPhoto, Rect } from '@printagram/shared';
import {
  aspectOf,
  captionParts,
  coverLayout,
  effectivePpi,
  PAGE_SIZES_MM,
  placePhoto,
  ppiLevel,
  SAFE_MM,
  slotsFor,
  TEXT_PT,
} from '@printagram/shared';
import { Placeholder } from './ui';
import s from './page.module.css';

export function pageAspect(format: BookFormat): string {
  const { width, height } = PAGE_SIZES_MM[format];
  return `${width} / ${height}`;
}

/** Font size in points → container-query width units, so text scales with the rendered page. */
function pt(points: number, format: BookFormat): string {
  const mm = (points * 25.4) / 72;
  return `${(mm / PAGE_SIZES_MM[format].width) * 100}cqw`;
}

function box(r: Rect, format: BookFormat): CSSProperties {
  const { width, height } = PAGE_SIZES_MM[format];
  return {
    left: `${(r.x / width) * 100}%`,
    top: `${(r.y / height) * 100}%`,
    width: `${(r.width / width) * 100}%`,
    height: `${(r.height / height) * 100}%`,
  };
}

export interface PageRendererProps {
  page: Page;
  format: BookFormat;
  title: string;
  dateSpan: string;
  photoCount: number;
  cover: Photo | null;
  photosById: Map<string, Photo>;
  showMeta: boolean;
  showLikes: boolean;
  /** Show a warning badge on photos that will print below 150 ppi. */
  showPpi?: boolean;
  style?: CSSProperties;
  className?: string;
  /** Rendered on top of the page (e.g. selection outlines). */
  overlay?: ReactNode;
}

/**
 * Exact on-screen twin of a PDF page: every rectangle comes from the shared layout code
 * (slotsFor / placePhoto / coverLayout), in millimetres, scaled to the rendered width.
 * The preview shows the trimmed page; bleed is cut off exactly as the printer will.
 */
export function PageRenderer({
  page,
  format,
  title,
  dateSpan,
  photoCount,
  cover,
  photosById,
  showMeta,
  showLikes,
  showPpi,
  style,
  className,
  overlay,
}: PageRendererProps) {
  const size = PAGE_SIZES_MM[format];
  return (
    <div
      className={`${s.page} ${className ?? ''}`}
      style={{ aspectRatio: pageAspect(format), ...style }}
    >
      {page.type === 'cover' && (
        <CoverPage format={format} title={title} cover={cover} showPpi={showPpi} />
      )}
      {page.type === 'title' && (
        <div
          className={s.centerText}
          style={box(
            { x: SAFE_MM, y: 0, width: size.width - 2 * SAFE_MM, height: size.height },
            format,
          )}
        >
          <div className={s.titleText} style={{ fontSize: pt(TEXT_PT.title, format) }}>
            {title}
          </div>
          <div className={s.subText} style={{ fontSize: pt(TEXT_PT.subtitle, format) }}>
            {dateSpan} · {photoCount} photos
          </div>
        </div>
      )}
      {page.type === 'content' && page.spec.template === 'text' && (
        <div
          className={s.centerText}
          style={box(
            {
              x: SAFE_MM + 8,
              y: SAFE_MM,
              width: size.width - 2 * (SAFE_MM + 8),
              height: size.height - 2 * SAFE_MM,
            },
            format,
          )}
        >
          <div className={s.pageText} style={{ fontSize: pt(TEXT_PT.pageText, format) }}>
            {page.spec.text || ' '}
          </div>
        </div>
      )}
      {page.type === 'content' &&
        page.spec.template !== 'text' &&
        slotsFor(page.spec.template, format).map((slot, i) => {
          const photo = photosById.get(page.spec.photoIds[i] ?? '') ?? null;
          const placed = placePhoto(slot, photo ? aspectOf(photo) : 1, showMeta);
          return (
            <PlacedImage
              key={i}
              format={format}
              photo={photo}
              placed={placed}
              showMeta={showMeta}
              showLikes={showLikes}
              showPpi={showPpi}
            />
          );
        })}
      {page.type === 'back' && (
        <div
          className={s.centerText}
          style={box({ x: 0, y: 0, width: size.width, height: size.height }, format)}
        >
          <div className={s.subText} style={{ fontSize: pt(TEXT_PT.back, format) }}>
            Made with Printagram
          </div>
        </div>
      )}
      {overlay}
    </div>
  );
}

function CoverPage({
  format,
  title,
  cover,
  showPpi,
}: {
  format: BookFormat;
  title: string;
  cover: Photo | null;
  showPpi?: boolean;
}) {
  const lay = coverLayout(format);
  const placed = placePhoto(lay.image, cover ? aspectOf(cover) : 1, false);
  return (
    <>
      <PlacedImage
        format={format}
        photo={cover}
        placed={placed}
        showMeta={false}
        showLikes={false}
        showPpi={showPpi}
      />
      <div className={s.centerText} style={box(lay.title, format)}>
        <div className={s.titleText} style={{ fontSize: pt(TEXT_PT.coverTitle, format) }}>
          {title}
        </div>
      </div>
    </>
  );
}

function PlacedImage({
  format,
  photo,
  placed,
  showMeta,
  showLikes,
  showPpi,
}: {
  format: BookFormat;
  photo: Photo | null;
  placed: PlacedPhoto;
  showMeta: boolean;
  showLikes: boolean;
  showPpi?: boolean;
}) {
  const { crop } = placed;
  const level =
    showPpi && photo?.width && photo.height
      ? ppiLevel(effectivePpi(photo.width, photo.height, placed))
      : 'ok';
  const cap = photo && showMeta ? captionParts(photo, showLikes) : null;
  return (
    <>
      <div className={s.frame} style={box(placed.image, format)}>
        {photo?.thumbUrl ? (
          <img
            src={photo.thumbUrl}
            alt=""
            loading="lazy"
            className={s.cropped}
            style={{
              width: `${100 / crop.width}%`,
              height: `${100 / crop.height}%`,
              left: `${(-crop.x / crop.width) * 100}%`,
              top: `${(-crop.y / crop.height) * 100}%`,
            }}
          />
        ) : (
          <Placeholder style={{ width: '100%', height: '100%' }} />
        )}
        {level !== 'ok' && (
          <span
            className={`${s.ppi} ${level === 'low' ? s['ppi--low'] : ''}`}
            title={
              level === 'low'
                ? 'Will print blurry at this size'
                : 'May print a little soft at this size'
            }
          >
            {level === 'low' ? 'Low resolution' : 'Soft'}
          </span>
        )}
      </div>
      {cap && placed.caption && (
        <div
          className={s.caption}
          style={{ ...box(placed.caption, format), fontSize: pt(TEXT_PT.caption, format) }}
        >
          <span className={s.captionText}>{cap.text}</span>
          <span className={s.captionMeta}>{cap.meta}</span>
        </div>
      )}
    </>
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
