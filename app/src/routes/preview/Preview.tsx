import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fmtEuro, pageLabel } from '@printagram/shared';
import { Button, Input, Label, ToggleRow } from '@/components/ui';
import { PageRenderer } from '@/components/PageRenderer';
import { useDraft } from '@/state/draft';
import { useBook } from '@/state/useBook';
import { useSession } from '@/state/session';
import { api } from '@/services';
import s from './preview.module.css';

export function Preview() {
  const nav = useNavigate();
  const d = useDraft();
  const book = useBook();
  const ensureSession = useSession((x) => x.ensureSession);
  const [saving, setSaving] = useState(false);

  const pageIdx = Math.min(d.pageIdx, Math.max(0, book.pages.length - 1));
  const page = book.pages[pageIdx] ?? book.pages[0]!;

  useEffect(() => {
    if (book.ready && book.chosen.length === 0) nav('/select', { replace: true });
  }, [book.ready, book.chosen.length, nav]);

  const checkout = async () => {
    if (!book.libraryId) return;
    setSaving(true);
    try {
      await ensureSession();
      const saved = await api.saveDraft({
        id: d.draftBookId,
        libraryId: book.libraryId,
        settings: {
          title: d.title,
          format: d.format,
          showMeta: d.showMeta,
          coverPhotoId: book.cover?.id ?? null,
        },
        photoIds: book.chosen.map((p) => p.id),
      });
      d.setBook({ draftBookId: saved.id });
      nav('/checkout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen screen--bar">
      <header className="container row gap-12" style={{ padding: '14px var(--gutter)' }}>
        <button type="button" className="back" onClick={() => nav('/select')} aria-label="Back">
          ←
        </button>
        <div className="h4">Preview your book</div>
      </header>

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
              showMeta={d.showMeta}
              showLikes={book.hasLikes}
            />
          </div>
          <div className="row gap-16">
            <button
              type="button"
              className={s.navBtn}
              onClick={() => d.setPageIdx(Math.max(0, pageIdx - 1))}
              aria-label="Previous page"
              disabled={pageIdx === 0}
            >
              ‹
            </button>
            <div className="small muted center" style={{ minWidth: 120 }}>
              {pageLabel(page, book.pages.length)}
            </div>
            <button
              type="button"
              className={s.navBtn}
              onClick={() => d.setPageIdx(Math.min(book.pages.length - 1, pageIdx + 1))}
              aria-label="Next page"
              disabled={pageIdx >= book.pages.length - 1}
            >
              ›
            </button>
          </div>
        </div>

        <div className="stack stack-22">
          <div className="stack stack-8">
            <Label>Book title</Label>
            <Input
              value={d.title}
              onChange={(e) => d.setBook({ title: e.target.value })}
              maxLength={80}
              aria-label="Book title"
            />
          </div>
          <div className="stack stack-8">
            <Label>Format</Label>
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
                  Square
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
                  Portrait
                  <div className="micro muted" style={{ fontWeight: 400 }}>
                    21 × 28 cm
                  </div>
                </div>
              </button>
            </div>
          </div>
          <div className="stack stack-8">
            <Label>Cover photo</Label>
            <div className={s.covers}>
              {book.chosen.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${s.coverChoice} ${book.cover?.id === p.id ? s['coverChoice--on'] : ''}`}
                  onClick={() => {
                    d.setBook({ coverPhotoId: p.id });
                    d.setPageIdx(0);
                  }}
                  aria-label={`Use as cover: ${p.caption || fmtDateShort(p.takenAt)}`}
                >
                  <img src={p.thumbUrl} alt="" />
                </button>
              ))}
            </div>
          </div>
          <ToggleRow
            on={d.showMeta}
            title="Captions and dates"
            hint={
              book.hasLikes
                ? 'Caption, likes and date under each photo'
                : 'Printed under each photo'
            }
            onToggle={() => d.setBook({ showMeta: !d.showMeta })}
          />
        </div>
      </div>

      <div className="footer-bar">
        <div className="footer-bar__inner">
          <div>
            <div className="semibold">
              {book.total} pages · {d.format === 'square' ? 'Square' : 'Portrait'}
            </div>
            <div className="tiny muted">PDF {fmtEuro(book.priceCents)}</div>
          </div>
          <Button onClick={checkout} disabled={saving || book.chosen.length === 0}>
            {saving ? 'Saving…' : 'Checkout'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function fmtDateShort(iso: string) {
  return iso.slice(0, 10);
}
