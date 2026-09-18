import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { Book, LibrarySummary, Order, Photo } from '@printagram/shared';
import { fmtDate } from '@printagram/shared';
import { Banner, Button, Card, Placeholder, Spinner } from '@/components/ui';
import { CoverThumb } from '@/components/PageRenderer';
import { api } from '@/services';
import { useSession } from '@/state/session';
import { useDraft } from '@/state/draft';
import { useLibrary } from '@/state/library';
import s from './books.module.css';

interface BookCard {
  key: string;
  title: string;
  meta: string;
  format: 'square' | 'portrait';
  coverSrc: string | null;
  status: string;
  statusTone: 'muted' | 'primary';
  primaryLabel: string;
  primaryVariant: 'primary' | 'outline';
  onPrimary: () => void;
  canDuplicate: boolean;
  onDuplicate?: () => void;
}

export function Books() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = useSession((x) => x.user);
  const libraries = useSession((x) => x.libraries);
  const refreshLibraries = useSession((x) => x.refreshLibraries);
  const signOut = useSession((x) => x.signOut);
  const d = useDraft();
  const libState = useLibrary();

  const [books, setBooks] = useState<Book[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sample, setSample] = useState<Photo[]>([]);
  const [deleteState, setDeleteState] = useState<'idle' | 'asking' | 'deleting' | 'deleted'>(
    params.get('delete') ? 'asking' : 'idle',
  );
  const [err, setErr] = useState<string | null>(null);

  const library: LibrarySummary | undefined =
    libraries.find((l) => l.id === d.libraryId) ?? libraries[0];
  const signedIn = !!user && user.authLevel !== 'anonymous';

  useEffect(() => {
    if (!signedIn && !libraries.length) {
      nav('/signin?next=/books', { replace: true });
      return;
    }
    (async () => {
      try {
        const [b, o, libs] = await Promise.all([
          api.listBooks(),
          api.listOrders(),
          refreshLibraries(),
        ]);
        setBooks(b);
        setOrders(o);
        const lib = libs.find((l) => l.id === d.libraryId) ?? libs[0];
        if (lib) {
          const photos = await api.listPhotos(lib.id);
          setSample(photos.filter((p) => !p.isVideo).slice(0, 8));
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load your books.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPhotos =
    !!library && library.status === 'ready' && library.photoCount > 0 && deleteState !== 'deleted';

  const newBook = async () => {
    if (!library) return;
    const { photos } = await libState.load(library.id, true);
    d.resetForNewBook();
    d.startLibrary(library.id, photos);
    nav('/select');
  };

  const addPhotos = () => {
    d.setAdding(true);
    d.setSource(null);
    nav('/start');
  };

  const confirmDelete = async () => {
    if (!library) return;
    setDeleteState('deleting');
    try {
      await api.deleteLibrary(library.id);
      await refreshLibraries();
      libState.clear();
      d.resetForNewBook();
      setBooks((prev) => (prev ?? []).filter((b) => b.status === 'ordered'));
      setDeleteState('deleted');
      setParams({}, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete your photos.');
      setDeleteState('idle');
    }
  };

  const openDraft = async (b: Book) => {
    const { photos } = await libState.load(b.libraryId, true);
    d.startLibrary(b.libraryId, photos, { keepSelection: false });
    d.setBook({
      draftBookId: b.id,
      title: b.title,
      format: b.format,
      showMeta: b.showMeta,
      coverPhotoId: b.coverPhotoId,
    });
    d.setMode('choose', b.photoIds);
    nav('/preview');
  };

  const duplicate = async (b: Book) => {
    const copy = await api.duplicateBook(b.id);
    await openDraft(copy);
  };

  const cards: BookCard[] = [];
  const orderByBook = new Map(orders.map((o) => [o.bookId, o]));
  for (const b of books ?? []) {
    const o =
      orderByBook.get(b.id) ?? (b.orderId ? orders.find((x) => x.id === b.orderId) : undefined);
    const fmt = b.format === 'square' ? 'Square' : 'Portrait';
    const meta = `${b.pageCount} pages · ${fmt} · ${b.photoIds.length} photos`;
    const cover =
      sample.find((p) => p.id === b.coverPhotoId)?.thumbUrl ??
      o?.coverThumbUrl ??
      sample[0]?.thumbUrl ??
      null;
    if (b.status === 'ordered' && o) {
      cards.push({
        key: b.id,
        title: b.title,
        meta,
        format: b.format,
        coverSrc: o.coverThumbUrl ?? cover,
        status: `Ordered ${fmtDate(o.paidAt ?? o.createdAt)} · PDF${o.status !== 'ready' ? ' · generating' : ''}`,
        statusTone: 'primary',
        primaryLabel: o.status === 'ready' ? 'Download PDF' : 'Finish PDF',
        primaryVariant: 'outline',
        onPrimary: () => nav(`/done/${o.id}`),
        canDuplicate: hasPhotos,
        onDuplicate: () => duplicate(b),
      });
    } else if (b.status === 'draft' && hasPhotos) {
      cards.push({
        key: b.id,
        title: b.title,
        meta,
        format: b.format,
        coverSrc: cover,
        status: 'Draft',
        statusTone: 'muted',
        primaryLabel: 'Continue',
        primaryVariant: 'primary',
        onPrimary: () => openDraft(b),
        canDuplicate: false,
      });
    }
  }
  const draftCount = cards.filter((c) => c.status === 'Draft').length;

  return (
    <div className="screen screen--padded">
      <header className={s.header}>
        <button
          type="button"
          className="brand"
          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          onClick={() => nav('/')}
        >
          Printagram
        </button>
        <div className="row gap-12 small muted">
          <span>{user?.email ?? 'your email'}</span>
          {signedIn && (
            <button
              type="button"
              className="link-button"
              onClick={async () => {
                await signOut();
                d.resetAll();
                libState.clear();
                nav('/');
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <div className="container stack stack-28" style={{ maxWidth: 900, paddingTop: 8 }}>
        {err && (
          <Banner tone="error" tight>
            {err}
          </Banner>
        )}

        <Card bordered radius="xl" pad="wide">
          {hasPhotos && library ? (
            <>
              <div className="row row-wrap gap-16">
                <div className={s.sampleGrid}>
                  {sample.length > 0
                    ? sample.map((p) => <img key={p.id} src={p.thumbUrl} alt="" />)
                    : Array.from({ length: 8 }).map((_, i) => (
                        <Placeholder key={i} style={{ aspectRatio: '1', borderRadius: 3 }} />
                      ))}
                </div>
                <div className="stack stack-4" style={{ flex: 1, minWidth: 200 }}>
                  <div className="h3" style={{ fontSize: 22 }}>
                    Your photo library
                  </div>
                  <div className="small muted">
                    {library.photoCount} photos ·{' '}
                    {library.source === 'instagram' ? library.sourceLabel : 'Instagram export'} ·
                    imported {fmtDate(library.importedAt)}
                  </div>
                  <div className="small muted">
                    Kept until{' '}
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                      {fmtDate(library.keptUntil)}
                    </span>
                    . Each new book extends this by 3 months.
                  </div>
                </div>
              </div>
              {deleteState === 'idle' && (
                <div className="row row-wrap gap-8">
                  <Button size="md" style={{ padding: '11px 18px' }} onClick={newBook}>
                    New book from these photos
                  </Button>
                  <Button
                    size="md"
                    variant="secondary"
                    style={{ padding: '11px 18px' }}
                    onClick={addPhotos}
                  >
                    Add more photos
                  </Button>
                  <Button
                    size="md"
                    variant="danger-ghost"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setDeleteState('asking')}
                  >
                    Delete photos now
                  </Button>
                </div>
              )}
              {(deleteState === 'asking' || deleteState === 'deleting') && (
                <Banner
                  tone="error"
                  title={`Delete ${library.photoCount} photos and ${draftCount === 1 ? '1 draft' : draftCount > 1 ? `${draftCount} drafts` : 'drafts'}?`}
                  className={s.deleteBox}
                >
                  <div className="pretty">
                    This can't be undone. Ordered PDFs stay downloadable. To make another book later
                    you'd import your photos again.
                  </div>
                  <div className="row row-wrap gap-8">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={confirmDelete}
                      disabled={deleteState === 'deleting'}
                    >
                      {deleteState === 'deleting' ? 'Deleting…' : 'Yes, delete everything'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-outline"
                      onClick={() => {
                        setDeleteState('idle');
                        setParams({}, { replace: true });
                      }}
                      disabled={deleteState === 'deleting'}
                    >
                      Keep my photos
                    </Button>
                  </div>
                </Banner>
              )}
            </>
          ) : (
            <div className="row row-wrap gap-16">
              <Placeholder
                soft
                style={{
                  width: 92,
                  aspectRatio: '1',
                  borderRadius: 10,
                  border: '1px dashed var(--placeholder)',
                  flex: 'none',
                }}
              />
              <div className="stack stack-4" style={{ flex: 1, minWidth: 200 }}>
                <div className="h3" style={{ fontSize: 22 }}>
                  No photos stored
                </div>
                <div className="small muted">
                  {deleteState === 'deleted' || (library && library.status === 'expired')
                    ? 'Your library was deleted. Bring in photos again to make a new book — ordered PDFs below are still yours.'
                    : 'Bring in your Instagram photos to make your first book.'}
                </div>
              </div>
              <Button size="md" style={{ padding: '11px 18px' }} onClick={addPhotos}>
                Bring in photos
              </Button>
            </div>
          )}
        </Card>

        <div className="stack stack-14">
          <div className="h3" style={{ fontSize: 22 }}>
            Your books
          </div>
          {books === null ? (
            <Spinner />
          ) : cards.length === 0 ? (
            <div
              className="center muted"
              style={{
                background: 'var(--surface-3)',
                borderRadius: 18,
                padding: 24,
                fontSize: 15,
              }}
            >
              No books yet. Start one from your library above.
            </div>
          ) : (
            <div className={s.bookGrid}>
              {cards.map((c) => (
                <Card key={c.key} bordered pad="tight" gap={12}>
                  <div className="row gap-14">
                    <CoverThumb src={c.coverSrc} format={c.format} width={56} />
                    <div className="stack stack-4" style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="serif"
                        style={{
                          fontSize: 17,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.title}
                      </div>
                      <div className="tiny muted">{c.meta}</div>
                      <div
                        className="micro medium"
                        style={{
                          color:
                            c.statusTone === 'primary' ? 'var(--primary-deep)' : 'var(--muted)',
                        }}
                      >
                        {c.status}
                      </div>
                    </div>
                  </div>
                  <div className="row row-wrap gap-8">
                    <Button size="sm" variant={c.primaryVariant} onClick={c.onPrimary}>
                      {c.primaryLabel}
                    </Button>
                    {c.canDuplicate && c.onDuplicate && (
                      <Button size="sm" variant="secondary" onClick={c.onDuplicate}>
                        Duplicate
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
