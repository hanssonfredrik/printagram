import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { Photo } from '@printagram/shared';
import { monthKey, monthShort, parseMonthKey } from '@printagram/shared';
import {
  Button,
  Chip,
  Placeholder,
  Segmented,
  Select as SelectBox,
  Spinner,
  WizardBar,
} from '@/components/ui';
import { chosenPhotos, useDraft, visiblePhotos } from '@/state/draft';
import { useBook } from '@/state/useBook';
import { useMoney, usePriceList } from '@/state/price';
import { useLibrary } from '@/state/library';
import { useConfig, useSession } from '@/state/session';
import { useLang, useT } from '@/i18n';
import s from './select.module.css';

export function Select() {
  const t = useT();
  const lang = useLang((x) => x.lang);
  const money = useMoney();
  const prices = usePriceList();
  const nav = useNavigate();
  const cfg = useConfig();
  const d = useDraft();
  const lib = useLibrary();
  const libraries = useSession((x) => x.libraries);

  // Resolve which library to show: the draft's, else the most recent one.
  const targetId = d.libraryId ?? libraries[0]?.id ?? null;

  useEffect(() => {
    if (!targetId) return;
    if (lib.libraryId !== targetId || lib.photos.length === 0) {
      void lib.load(targetId).then(({ photos }) => {
        if (d.libraryId !== targetId || !d.rangeFrom)
          d.startLibrary(targetId, photos, { keepSelection: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const photos = lib.photos;
  const hasLikes = lib.library?.hasLikes ?? d.source === 'connect';
  const monthKeys = useMemo(
    () => [...new Set(photos.map((p) => monthKey(p.year, p.month)))].sort(),
    [photos],
  );
  const monthOptions = monthKeys.map((k) => {
    const { year, month } = parseMonthKey(k);
    return { value: k, label: `${monthShort(month, lang)} ${year}` };
  });
  const filters = useMemo(
    () => ({
      favsOnly: d.favsOnly,
      carouselAll: d.carouselAll,
      rangeFrom: d.rangeFrom,
      rangeTo: d.rangeTo,
    }),
    [d.favsOnly, d.carouselAll, d.rangeFrom, d.rangeTo],
  );
  const visible = useMemo(
    () => visiblePhotos(photos, filters, hasLikes),
    [photos, filters, hasLikes],
  );
  const chosen = useMemo(
    () => chosenPhotos(visible, d.mode, d.selected),
    [visible, d.mode, d.selected],
  );
  const isChoose = d.mode === 'choose';
  const selectedSet = useMemo(() => new Set(d.selected), [d.selected]);
  // Page count and price follow the same automatic layout the preview will use.
  const book = useBook();
  const total = book.total;
  const overLimit = chosen.length > cfg.limits.maxPhotosPerBook;

  const years = useMemo(() => {
    const byYear = new Map<number, Map<string, Photo[]>>();
    for (const p of visible) {
      const k = monthKey(p.year, p.month);
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      const months = byYear.get(p.year)!;
      if (!months.has(k)) months.set(k, []);
      months.get(k)!.push(p);
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        photos: [...months.values()].flat(),
        months: [...months.entries()]
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([key, ps]) => ({
            key,
            label: monthShort(parseMonthKey(key).month, lang),
            photos: ps,
          })),
      }));
  }, [visible, lang]);

  const allOn = (ps: Photo[]) => !isChoose || ps.every((p) => selectedSet.has(p.id));

  if (!targetId) {
    return (
      <div className="screen">
        <div className={s.empty}>
          <Placeholder
            soft
            style={{
              width: 120,
              aspectRatio: '1',
              borderRadius: 14,
              border: '1px dashed var(--placeholder)',
            }}
          />
          <h2 className="h3">{t.select.noPhotosTitle}</h2>
          <p className="muted">{t.select.noPhotosBody}</p>
          <Button onClick={() => nav('/start')}>{t.select.bringIn}</Button>
        </div>
      </div>
    );
  }

  const sourceLabel = lib.library
    ? lib.library.source === 'instagram'
      ? t.select.connected(lib.library.sourceLabel)
      : lib.library.sourceLabel
    : '';
  const back = () =>
    nav(
      d.source === 'library'
        ? '/books'
        : d.source === 'connect'
          ? '/connect'
          : d.source === 'google'
            ? '/google'
            : d.source === 'export'
              ? '/export/upload'
              : '/start',
    );

  return (
    <div className="screen screen--bar">
      <header className={s.sticky}>
        <div className={s.stickyInner}>
          <div className="row between gap-12">
            <div className="h4">{t.select.title}</div>
            <div
              className="small muted"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {sourceLabel}
            </div>
          </div>
          {photos.length > 0 && (
            <>
              <Segmented
                value={d.mode}
                onChange={(m) =>
                  d.setMode(
                    m,
                    visible.map((p) => p.id),
                  )
                }
                options={[
                  { value: 'all', label: t.select.modeAll },
                  { value: 'choose', label: t.select.modeChoose },
                ]}
              />
              <div className="row row-wrap gap-8">
                {hasLikes && (
                  <Chip on={d.favsOnly} onClick={() => d.setFilter({ favsOnly: !d.favsOnly })}>
                    {t.select.mostLiked}
                  </Chip>
                )}
                <Chip
                  on={d.carouselAll}
                  onClick={() => d.setFilter({ carouselAll: !d.carouselAll })}
                >
                  {d.carouselAll ? t.select.carouselsAll : t.select.carouselsFirst}
                </Chip>
                <SelectBox
                  ariaLabel={t.select.fromMonth}
                  value={d.rangeFrom ?? monthKeys[0] ?? ''}
                  options={monthOptions}
                  onChange={(v) =>
                    d.setFilter({
                      rangeFrom: v,
                      rangeTo: d.rangeTo && v > d.rangeTo ? v : d.rangeTo,
                    })
                  }
                />
                <span className="muted tiny">{t.select.to}</span>
                <SelectBox
                  ariaLabel={t.select.toMonth}
                  value={d.rangeTo ?? monthKeys[monthKeys.length - 1] ?? ''}
                  options={monthOptions}
                  onChange={(v) =>
                    d.setFilter({
                      rangeTo: v,
                      rangeFrom: d.rangeFrom && v < d.rangeFrom ? v : d.rangeFrom,
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      </header>

      {lib.loading && photos.length === 0 && (
        <div className="container" style={{ padding: 48, display: 'grid', placeItems: 'center' }}>
          <Spinner />
        </div>
      )}

      {!lib.loading && photos.length === 0 && (
        <div className={s.empty}>
          <Placeholder
            soft
            style={{
              width: 120,
              aspectRatio: '1',
              borderRadius: 14,
              border: '1px dashed var(--placeholder)',
            }}
          />
          <h2 className="h3">{t.select.notFoundTitle}</h2>
          <p className="muted">{t.select.notFoundBody}</p>
          <Button onClick={back}>{t.select.goBack}</Button>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <div className="container stack" style={{ padding: '16px var(--gutter)', gap: 36 }}>
            {years.map((y) => (
              <div key={y.year} className="stack stack-18">
                <div className={s.year}>
                  <div className={s.yearLabel}>
                    {y.year} <span className={s.yearCount}>{t.select.photos(y.photos.length)}</span>
                  </div>
                  {isChoose && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        d.toggleIds(
                          y.photos.map((p) => p.id),
                          !allOn(y.photos),
                        )
                      }
                    >
                      {allOn(y.photos) ? t.select.deselectYear : t.select.selectYear}
                    </button>
                  )}
                </div>
                {y.months.map((mo) => (
                  <div key={mo.key} className="stack stack-10">
                    <div className="row between" style={{ alignItems: 'baseline' }}>
                      <div className="semibold">
                        {mo.label}{' '}
                        <span className="tiny muted" style={{ fontWeight: 400 }}>
                          {mo.photos.length}
                        </span>
                      </div>
                      {isChoose && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            d.toggleIds(
                              mo.photos.map((p) => p.id),
                              !allOn(mo.photos),
                            )
                          }
                        >
                          {allOn(mo.photos) ? t.select.deselectAll : t.select.selectAll}
                        </button>
                      )}
                    </div>
                    <div className={s.grid}>
                      {mo.photos.map((p) => {
                        const on = !isChoose || selectedSet.has(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`${s.tile} ${on ? '' : s['tile--off']}`}
                            aria-pressed={on}
                            aria-label={`${p.caption || t.select.photo}, ${p.takenAt.slice(0, 10)}`}
                            onClick={() =>
                              d.toggleIds([p.id], isChoose ? !selectedSet.has(p.id) : false)
                            }
                          >
                            {p.thumbUrl ? (
                              <img src={p.thumbUrl} alt="" loading="lazy" decoding="async" />
                            ) : (
                              <Placeholder style={{ width: '100%', height: '100%' }} />
                            )}
                            {p.carouselCount > 1 && (
                              <span className={s.badge}>
                                {p.carouselIdx + 1}/{p.carouselCount}
                              </span>
                            )}
                            {hasLikes && p.likes !== null && (
                              <span className={`${s.badge} ${s['badge--bottom']}`}>
                                ♥ {p.likes}
                              </span>
                            )}
                            <span className={`${s.checkmark} ${on ? s['checkmark--on'] : ''}`}>
                              {on ? '✓' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {visible.length === 0 && (
              <div className="center muted" style={{ padding: '48px 0' }}>
                {t.select.noMatch}
              </div>
            )}
          </div>
        </>
      )}

      <WizardBar
        onBack={back}
        backLabel={d.source === 'library' ? t.select.backToBooks : undefined}
        action={
          <Button disabled={chosen.length === 0 || overLimit} onClick={() => nav('/preview')}>
            {t.select.continue}
          </Button>
        }
      >
        {photos.length > 0 && (
          <>
            <div className="semibold">{t.select.selected(chosen.length)}</div>
            <div className="tiny muted">
              {overLimit
                ? t.select.maxPhotos(cfg.limits.maxPhotosPerBook)
                : t.select.pagesPrice(total, money(prices.baseCents))}
            </div>
          </>
        )}
      </WizardBar>
    </div>
  );
}
