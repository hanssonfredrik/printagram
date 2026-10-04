import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Lang, LayoutDensity, PageSpec, TemplateId } from '@printagram/shared';
import {
  LANG_NAMES,
  LANGS,
  aspectOf,
  effectivePpi,
  effectiveFullBleed,
  fullBleedApplies,
  MAX_TEXT_LENGTH,
  pageLabel,
  placePhoto,
  ppiLevel,
  slotsFor,
  templateLabel,
  templatesFor,
} from '@printagram/shared';
import {
  Banner,
  Button,
  ConfirmModal,
  Input,
  Label,
  Segmented,
  Select,
  ToggleRow,
  WizardBar,
} from '@/components/ui';
import { errorText, useLang, useT } from '@/i18n';
import { PageRenderer } from '@/components/PageRenderer';
import { api } from '@/services';
import { useDraft } from '@/state/draft';
import { saveCurrentDraft, useBook } from '@/state/useBook';
import { useMoney, usePriceList } from '@/state/price';
import { Arrange } from './Arrange';
import {
  insertTextPage,
  movePage,
  normalizePages,
  removePage,
  setPageText,
  setTemplate,
} from './pageEdits';
import s from './preview.module.css';

type View = 'pages' | 'arrange';

export function Preview() {
  const nav = useNavigate();
  const d = useDraft();
  const book = useBook();
  const t = useT();
  const lang = useLang((x) => x.lang);
  const money = useMoney();
  const prices = usePriceList();
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [view, setView] = useState<View>('pages');
  const [deleteState, setDeleteState] = useState<'idle' | 'asking' | 'deleting'>('idle');

  const pageIdx = Math.min(d.pageIdx, Math.max(0, book.pages.length - 1));
  const page = book.pages[pageIdx] ?? book.pages[0]!;
  const contentIdx = page.type === 'content' ? page.index - 2 : -1;
  const spec: PageSpec | null = page.type === 'content' ? page.spec : null;

  useEffect(() => {
    if (book.ready && book.chosen.length === 0) nav('/select', { replace: true });
  }, [book.ready, book.chosen.length, nav]);

  // Photos that will print soft or blurry at their current size.
  const lowRes = useMemo(() => {
    let soft = 0;
    let low = 0;
    for (const pg of book.content) {
      slotsFor(pg.template, d.format).forEach((slot, i) => {
        const p = book.photosById.get(pg.photoIds[i] ?? '');
        if (!p?.width || !p.height) return;
        const lvl = ppiLevel(
          effectivePpi(p.width, p.height, placePhoto(slot, aspectOf(p), d.showMeta)),
        );
        if (lvl === 'soft') soft++;
        if (lvl === 'low') low++;
      });
    }
    return { soft, low };
  }, [book.content, book.photosById, d.format, d.showMeta]);

  /** Any hand edit switches the book to a manual layout. */
  const edit = (pages: PageSpec[]) =>
    d.setManualPages(
      normalizePages(pages, book.photosById, d.format, effectiveFullBleed(d.layout)),
    );

  const checkout = async () => {
    if (!book.libraryId) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveCurrentDraft(book);
      nav('/checkout');
    } catch (e) {
      setSaveErr(errorText(e, t));
    } finally {
      setSaving(false);
    }
  };

  /** Only a draft saved on the server (opened from My books or after checkout) can be deleted. */
  const deleteDraft = async () => {
    if (!d.draftBookId) return;
    setDeleteState('deleting');
    setSaveErr(null);
    try {
      await api.deleteBook(d.draftBookId);
      d.resetForNewBook();
      nav('/books');
    } catch (e) {
      setSaveErr(errorText(e, t));
      setDeleteState('idle');
    }
  };

  // With two or more photos per page there are no single-photo pages for "full page" to apply to.
  const multiOnly = !fullBleedApplies(d.layout.density);

  const goToContent = (i: number) => {
    d.setPageIdx(i + 2);
    setView('pages');
  };

  return (
    <div className="screen screen--bar">
      <header
        className="container row between gap-12 row-wrap"
        style={{ padding: '14px var(--gutter)' }}
      >
        <div className="h4">{t.preview.title}</div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'pages', label: t.preview.viewPages },
            { value: 'arrange', label: t.preview.viewArrange },
          ]}
        />
      </header>

      {view === 'arrange' ? (
        <div className="container" style={{ paddingTop: 8 }}>
          <Arrange
            content={book.content}
            photosById={book.photosById}
            format={d.format}
            fullBleed={effectiveFullBleed(d.layout)}
            onChange={edit}
            onOpenPage={goToContent}
          />
        </div>
      ) : (
        <div className="container grid-auto grid-auto--320" style={{ paddingTop: 8 }}>
          <div className="stack stack-14" style={{ alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <PageRenderer
                page={page}
                format={d.format}
                title={d.title}
                dateSpan={book.dateSpan}
                photoCount={book.chosen.length}
                cover={book.cover}
                photosById={book.photosById}
                showMeta={d.showMeta}
                showLikes={book.hasLikes}
                lang={book.lang}
                showPpi
              />
            </div>
            <div className="row gap-16">
              <button
                type="button"
                className={s.navBtn}
                onClick={() => d.setPageIdx(Math.max(0, pageIdx - 1))}
                aria-label={t.preview.prevPage}
                disabled={pageIdx === 0}
              >
                ‹
              </button>
              <div className="small muted center" style={{ minWidth: 120 }}>
                {pageLabel(page, book.pages.length, lang)}
              </div>
              <button
                type="button"
                className={s.navBtn}
                onClick={() => d.setPageIdx(Math.min(book.pages.length - 1, pageIdx + 1))}
                aria-label={t.preview.nextPage}
                disabled={pageIdx >= book.pages.length - 1}
              >
                ›
              </button>
            </div>

            {spec && (
              <div className={s.pageTools}>
                {spec.template === 'text' ? (
                  <div className="stack stack-8" style={{ width: '100%' }}>
                    <Label>{t.preview.pageText}</Label>
                    <textarea
                      className={s.textarea}
                      value={spec.text ?? ''}
                      maxLength={MAX_TEXT_LENGTH}
                      rows={3}
                      onChange={(e) => edit(setPageText(book.content, contentIdx, e.target.value))}
                      aria-label={t.preview.pageText}
                    />
                  </div>
                ) : (
                  <div className="stack stack-8" style={{ width: '100%' }}>
                    <Label>{t.preview.pageLayoutLabel}</Label>
                    <div
                      className="row row-wrap gap-6"
                      role="radiogroup"
                      aria-label={t.preview.pageLayoutAria}
                    >
                      {templatesFor(spec.photoIds.length).map((tpl: TemplateId) => (
                        <button
                          key={tpl}
                          type="button"
                          role="radio"
                          aria-checked={spec.template === tpl}
                          className={`${s.tpl} ${spec.template === tpl ? s['tpl--on'] : ''}`}
                          onClick={() => edit(setTemplate(book.content, contentIdx, tpl))}
                        >
                          {templateLabel(tpl, lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="row row-wrap gap-6">
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={contentIdx === 0}
                    onClick={() => {
                      edit(movePage(book.content, contentIdx, contentIdx - 1));
                      d.setPageIdx(pageIdx - 1);
                    }}
                  >
                    {t.preview.moveEarlier}
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={contentIdx === book.content.length - 1}
                    onClick={() => {
                      edit(movePage(book.content, contentIdx, contentIdx + 1));
                      d.setPageIdx(pageIdx + 1);
                    }}
                  >
                    {t.preview.moveLater}
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      edit(insertTextPage(book.content, contentIdx));
                      d.setPageIdx(pageIdx + 1);
                    }}
                  >
                    {t.preview.addTextPage}
                  </Button>
                  {spec.template === 'text' && (
                    <Button
                      size="xs"
                      variant="danger-ghost"
                      onClick={() => edit(removePage(book.content, contentIdx))}
                    >
                      {t.preview.removeTextPage}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="stack stack-22">
            <div className="stack stack-8">
              <Label>{t.preview.bookTitle}</Label>
              <Input
                value={d.title}
                onChange={(e) => d.setBook({ title: e.target.value })}
                maxLength={80}
                aria-label={t.preview.bookTitle}
              />
            </div>
            <div className="stack stack-8">
              <Label>{t.preview.bookLanguage}</Label>
              <div className="row gap-8">
                <Select
                  value={d.lang}
                  onChange={(v) => d.setBookLang(v as Lang)}
                  options={LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))}
                  ariaLabel={t.preview.bookLanguage}
                />
                <span className="tiny muted">{t.preview.bookLanguageHint}</span>
              </div>
            </div>
            <div className="stack stack-8">
              <Label>{t.preview.format}</Label>
              <div className="grid-2">
                <button
                  type="button"
                  className={`${s.format} ${d.format === 'square' ? s['format--on'] : ''}`}
                  onClick={() => {
                    d.setBook({ format: 'square' });
                    d.setPageIdx(0);
                  }}
                >
                  <div className={s.formatIcon} style={{ width: 36, height: 36 }} />
                  <div className="small medium">
                    {t.preview.square}
                    <div className="micro muted" style={{ fontWeight: 400 }}>
                      21 × 21 cm
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`${s.format} ${d.format === 'portrait' ? s['format--on'] : ''}`}
                  onClick={() => {
                    d.setBook({ format: 'portrait' });
                    d.setPageIdx(0);
                  }}
                >
                  <div className={s.formatIcon} style={{ width: 28, height: 36 }} />
                  <div className="small medium">
                    {t.preview.portrait}
                    <div className="micro muted" style={{ fontWeight: 400 }}>
                      21 × 28 cm
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className="stack stack-8">
              <Label>{t.preview.photosPerPage}</Label>
              <Segmented<LayoutDensity>
                value={d.layout.density}
                onChange={(density) => {
                  d.setLayout({ density });
                  d.resetLayout();
                }}
                options={[
                  { value: 'auto', label: t.preview.density.auto },
                  { value: '1', label: t.preview.density.one },
                  { value: '2', label: t.preview.density.two },
                  { value: '3', label: t.preview.density.three },
                  { value: '4', label: t.preview.density.four },
                ]}
              />
              {book.manual && (
                <div className="row gap-8 tiny muted">
                  {t.preview.arrangedByHand}
                  <button type="button" className="link-button" onClick={() => d.resetLayout()}>
                    {t.preview.resetLayout}
                  </button>
                </div>
              )}
            </div>
            <ToggleRow
              on={d.layout.fullBleed && !multiOnly}
              disabled={multiOnly}
              title={t.preview.fullPage}
              hint={multiOnly ? t.preview.fullPageMultiOnly : t.preview.fullPageHint}
              onToggle={() => {
                d.setLayout({ fullBleed: !d.layout.fullBleed });
                d.resetLayout();
              }}
            />
            <div className="stack stack-8">
              <Label>{t.preview.coverPhoto}</Label>
              <div className={s.covers}>
                {book.chosen.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${s.coverChoice} ${book.cover?.id === p.id ? s['coverChoice--on'] : ''}`}
                    onClick={() => {
                      d.setBook({ coverPhotoId: p.id });
                      d.setPageIdx(0);
                    }}
                    aria-label={t.preview.useAsCover(p.caption || p.takenAt.slice(0, 10))}
                  >
                    <img src={p.thumbUrl} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              on={d.showMeta}
              title={t.preview.captions}
              hint={book.hasLikes ? t.preview.captionsHintLikes : t.preview.captionsHint}
              onToggle={() => d.setBook({ showMeta: !d.showMeta })}
            />
            {(lowRes.soft > 0 || lowRes.low > 0) && (
              <Banner tone={lowRes.low > 0 ? 'error' : 'warn'} tight>
                {lowRes.low > 0 ? t.preview.lowResBlurry(lowRes.low) : ''}
                {lowRes.soft > 0 ? t.preview.lowResSoft(lowRes.soft) : ''}
                {t.preview.lowResTip}
              </Banner>
            )}
            {saveErr && (
              <Banner tone="error" tight>
                {saveErr}
              </Banner>
            )}
            {d.draftBookId && (
              <div>
                <Button
                  size="sm"
                  variant="danger-ghost"
                  style={{ paddingLeft: 0 }}
                  onClick={() => setDeleteState('asking')}
                >
                  {t.preview.deleteDraft}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteState !== 'idle'}
        title={t.books.deleteDraftTitle}
        confirmLabel={deleteState === 'deleting' ? t.books.deleting : t.books.deleteDraftConfirm}
        cancelLabel={t.books.keepDraft}
        onConfirm={deleteDraft}
        onCancel={() => setDeleteState('idle')}
        busy={deleteState === 'deleting'}
      >
        {t.books.deleteDraftBody(d.title)}
      </ConfirmModal>

      <WizardBar
        onBack={() => nav('/select')}
        backLabel={t.preview.backToSelect}
        action={
          <Button onClick={checkout} disabled={saving || book.chosen.length === 0}>
            {saving ? t.preview.saving : t.preview.checkout}
          </Button>
        }
      >
        <div className="semibold">
          {t.preview.summary(
            book.total,
            d.format === 'square' ? t.preview.square : t.preview.portrait,
          )}
        </div>
        <div className="tiny muted">{t.preview.pdfPrice(money(prices.baseCents))}</div>
      </WizardBar>
    </div>
  );
}
